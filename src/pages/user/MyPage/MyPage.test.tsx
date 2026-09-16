import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AuthContext from "../../../contexts/AuthContext";
import {
    requestAccountDeletion,
    requestMyPage,
    requestPasswordChange,
} from "../../../api/userApi";
import MyPage from "./MyPage";

vi.mock("../../../api/userApi", () => ({
    requestMyPage: vi.fn(),
    requestPasswordChange: vi.fn(),
    requestAccountDeletion: vi.fn(),
}));

const pageData = {
    username: "solvego",
    joinedAt: "2026-01-02T03:04:00",
    registeredProblemCount: 2,
    solvedProblemCount: 3,
    wrongProblemCount: 1,
    problems: [{ problemId: 7, title: "내 문제" }],
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
    });

    it("사용자 정보, 활동 수, 등록 문제를 표시한다", async () => {
        renderPage();

        expect(await screen.findByText("solvego")).toBeInTheDocument();
        expect(screen.getByText("2026년 1월 2일")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
        expect(screen.getByText("1")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: /#7 내 문제/ }))
            .toHaveAttribute("href", "/problems/7");
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
