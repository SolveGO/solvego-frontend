import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AuthContext from "../../../contexts/AuthContext";
import {
    requestAccountDeletion,
    requestMyPage,
    requestPasswordChange,
} from "../../../api/userApi";
import { requestAiExplanationUsage } from "../../../api/aiApi";
import MyPage from "./MyPage";

vi.mock("../../../api/userApi", () => ({
    requestMyPage: vi.fn(),
    requestPasswordChange: vi.fn(),
    requestAccountDeletion: vi.fn(),
}));

vi.mock("../../../api/aiApi", () => ({
    requestAiExplanationUsage: vi.fn(),
}));

const pageData = {
    username: "solvego",
    joinedAt: "2026-01-02T03:04:00",
    registeredProblemCount: 2,
    solvedProblemCount: 3,
    wrongProblemCount: 1,
    plan: "FREE" as const,
    problems: [{ problemId: 7, title: "내 문제" }],
};

const explanationUsage = {
    usedCount: 2,
    remainingCount: 3,
    dailyLimit: 5,
    resetsAt: "2026-01-02T15:00:00Z",
};

function renderPage(logout = vi.fn().mockResolvedValue(undefined)) {
    render(
        <AuthContext.Provider value={{
            isLoggedIn: true,
            status: "AUTHENTICATED",
            login: vi.fn(),
            logout,
            retryAuth: vi.fn(),
        }}>
            <MemoryRouter initialEntries={["/mypage"]}>
                <Routes>
                    <Route path="/mypage" element={<MyPage />} />
                    <Route path="/" element={<div>홈 화면</div>} />
                    <Route path="/problems/:problemId" element={<div>문제 화면</div>} />
                </Routes>
            </MemoryRouter>
        </AuthContext.Provider>,
    );
    return logout;
}

describe("MyPage", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(requestMyPage).mockResolvedValue(pageData);
        vi.mocked(requestAiExplanationUsage).mockResolvedValue(explanationUsage);
    });

    it("사용자 정보, 활동 수, 등록 문제를 표시한다", async () => {
        renderPage();

        expect(await screen.findByText("solvego")).toBeInTheDocument();
        expect(screen.queryByText(/현재 개발 및 테스트 중/)).not.toBeInTheDocument();
        expect(screen.getByText("2026년 1월 2일")).toBeInTheDocument();
        expect(screen.getByText("등록한 문제").nextElementSibling)
            .toHaveTextContent("2");
        expect(screen.getByText("풀이한 문제").nextElementSibling)
            .toHaveTextContent("3");
        expect(screen.getByText("오답 문제").nextElementSibling)
            .toHaveTextContent("1");
        expect(screen.getByRole("link", { name: /#7 내 문제/ }))
            .toHaveAttribute("href", "/problems/7");
    });

    it("FREE 플랜과 AI 해설 사용량 및 구독 버튼을 표시한다", async () => {
        renderPage();

        expect(await screen.findByText("FREE")).toBeInTheDocument();
        expect(screen.getByText("오늘 사용").nextElementSibling)
            .toHaveTextContent("2회");
        expect(screen.getByText("남은 횟수").nextElementSibling)
            .toHaveTextContent("3회");
        expect(screen.getByText("일일 한도").nextElementSibling)
            .toHaveTextContent("5회");

        fireEvent.click(screen.getByRole("button", {
            name: "구독하고 해설 한도 늘리기",
        }));
        expect(screen.getByText("구독 결제 기능은 준비 중입니다."))
            .toBeInTheDocument();
    });

    it("PRO 플랜은 30회 한도를 표시하고 구독 버튼을 숨긴다", async () => {
        vi.mocked(requestMyPage).mockResolvedValue({ ...pageData, plan: "PRO" });
        vi.mocked(requestAiExplanationUsage).mockResolvedValue({
            ...explanationUsage,
            usedCount: 4,
            remainingCount: 26,
            dailyLimit: 30,
        });

        renderPage();

        expect(await screen.findByText("PRO")).toBeInTheDocument();
        expect(screen.getByText("일일 한도").nextElementSibling)
            .toHaveTextContent("30회");
        expect(screen.queryByRole("button", {
            name: "구독하고 해설 한도 늘리기",
        })).not.toBeInTheDocument();
    });

    it("현재 비밀번호를 포함해 비밀번호를 변경한다", async () => {
        vi.mocked(requestPasswordChange).mockResolvedValue();
        renderPage();
        await screen.findByText("solvego");

        const passwordInputs = screen.getAllByLabelText(/비밀번호/);
        fireEvent.change(passwordInputs[0], { target: { value: "old" } });
        fireEvent.change(passwordInputs[1], { target: { value: "new" } });
        fireEvent.change(passwordInputs[2], { target: { value: "new" } });
        fireEvent.click(screen.getByRole("button", { name: "비밀번호 변경" }));

        await waitFor(() => {
            expect(requestPasswordChange).toHaveBeenCalledWith("old", "new");
        });
        expect(screen.getByText("비밀번호가 변경되었습니다.")).toBeInTheDocument();
    });

    it("회원 탈퇴 후 로그아웃하고 홈으로 이동한다", async () => {
        vi.spyOn(window, "confirm").mockReturnValue(true);
        vi.mocked(requestAccountDeletion).mockResolvedValue();
        const logout = renderPage();
        await screen.findByText("solvego");

        fireEvent.click(screen.getByRole("button", { name: "회원 탈퇴" }));

        await screen.findByText("홈 화면");
        expect(requestAccountDeletion).toHaveBeenCalledTimes(1);
        expect(logout).toHaveBeenCalledTimes(1);
    });
});
