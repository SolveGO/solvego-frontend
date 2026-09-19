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
import {
    cancelAutoRenew,
    getCheckout,
    getSubscription,
    prepareCheckout,
    reactivateAutoRenew,
    type SubscriptionInfo,
} from "../../../api/subscriptionApi";
import { startBillingAuth } from "../../../billing/tossBilling";
vi.mock("../../../api/subscriptionApi", async (original) => ({
    ...await original<typeof import("../../../api/subscriptionApi")>(),
    prepareCheckout: vi.fn(),
    getCheckout: vi.fn(),
    getSubscription: vi.fn(),
    cancelAutoRenew: vi.fn(),
    reactivateAutoRenew: vi.fn(),
}));
vi.mock("../../../billing/tossBilling", () => ({ startBillingAuth: vi.fn() }));
const checkout = { orderId: "order-123", customerKey: "customer", orderName: "SolveGO PRO 1개월",
    amount: 5000, status: "READY" as const, currentPeriodEndAt: null };
const freeSubscription: SubscriptionInfo = {
    plan: "FREE" as const,
    status: "INACTIVE",
    currentPeriodStartAt: null,
    currentPeriodEndAt: null,
    nextBillingAt: null,
    autoRenew: false,
    cancelAtPeriodEnd: false,
};
const proSubscription: SubscriptionInfo = {
    plan: "PRO" as const,
    status: "ACTIVE",
    currentPeriodStartAt: "2026-09-19T00:00:00Z",
    currentPeriodEndAt: "2026-10-19T00:00:00Z",
    nextBillingAt: "2026-10-19T00:00:00Z",
    autoRenew: true,
    cancelAtPeriodEnd: false,
};

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
        vi.mocked(prepareCheckout).mockResolvedValue(checkout);
        vi.mocked(getSubscription).mockResolvedValue(freeSubscription);
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
        expect(await screen.findByText(/5,000원/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "금액 확인 및 카드 등록" }));
        await waitFor(() => expect(startBillingAuth).toHaveBeenCalledWith(checkout));
    });

    it("중복 클릭은 준비 요청을 한 번만 전송한다", async () => {
        vi.mocked(prepareCheckout).mockReturnValue(new Promise(() => {}));
        renderPage();
        const button = await screen.findByRole("button", { name: "구독하고 해설 한도 늘리기" });
        fireEvent.click(button);
        fireEvent.click(button);
        expect(prepareCheckout).toHaveBeenCalledTimes(1);
        expect(button).toBeDisabled();
    });

    it("불확실한 주문은 인증을 다시 시작하지 않고 상태만 조회한다", async () => {
        vi.mocked(prepareCheckout).mockResolvedValue({ ...checkout, status: "UNKNOWN" });
        vi.mocked(getCheckout).mockResolvedValue({ ...checkout, status: "SUCCEEDED" });
        renderPage();
        fireEvent.click(await screen.findByRole("button", { name: "구독하고 해설 한도 늘리기" }));
        expect(await screen.findByText(/결제가 처리 중이거나/)).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "금액 확인 및 카드 등록" })).not.toBeInTheDocument();
        vi.mocked(requestMyPage).mockResolvedValue({ ...pageData, plan: "PRO" });
        vi.mocked(requestAiExplanationUsage).mockResolvedValue({ ...explanationUsage, dailyLimit: 30, remainingCount: 28 });
        vi.mocked(getSubscription).mockResolvedValue(proSubscription);
        fireEvent.click(screen.getByRole("button", { name: "주문 상태 확인" }));
        expect(await screen.findByText("PRO")).toBeInTheDocument();
        await waitFor(() => expect(screen.getByText("일일 한도").nextElementSibling).toHaveTextContent("30회"));
        expect(startBillingAuth).not.toHaveBeenCalled();
    });

    it("인증 취소를 표시한다", async () => {
        vi.mocked(startBillingAuth).mockRejectedValue(new Error("cancelled"));
        renderPage();
        fireEvent.click(await screen.findByRole("button", { name: "구독하고 해설 한도 늘리기" }));
        fireEvent.click(await screen.findByRole("button", { name: "금액 확인 및 카드 등록" }));
        expect(await screen.findByText(/결제수단 인증이 취소되었거나/)).toBeInTheDocument();
    });

    it("PRO 플랜은 30회 한도를 표시하고 구독 버튼을 숨긴다", async () => {
        vi.mocked(requestMyPage).mockResolvedValue({ ...pageData, plan: "PRO" });
        vi.mocked(getSubscription).mockResolvedValue(proSubscription);
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

    it("명확히 실패한 결제는 새 checkout을 준비해 다시 시도한다", async () => {
        vi.mocked(prepareCheckout)
            .mockResolvedValueOnce({ ...checkout, status: "FAILED" })
            .mockResolvedValueOnce({ ...checkout, orderId: "order-456" });
        renderPage();

        fireEvent.click(await screen.findByRole("button", { name: "구독하고 해설 한도 늘리기" }));
        expect(await screen.findByRole("button", { name: "결제 다시 준비하기" })).toBeEnabled();

        fireEvent.click(screen.getByRole("button", { name: "결제 다시 준비하기" }));
        expect(await screen.findByText(/5,000원/)).toBeInTheDocument();
        expect(prepareCheckout).toHaveBeenCalledTimes(2);
    });

    it("자동결제 해지를 예약해도 현재 기간의 PRO를 유지한다", async () => {
        vi.spyOn(window, "confirm").mockReturnValue(true);
        vi.mocked(requestMyPage).mockResolvedValue({ ...pageData, plan: "PRO" });
        vi.mocked(getSubscription).mockResolvedValue(proSubscription);
        vi.mocked(cancelAutoRenew).mockResolvedValue({
            ...proSubscription,
            autoRenew: false,
            cancelAtPeriodEnd: true,
        });
        renderPage();

        fireEvent.click(await screen.findByRole("button", { name: "자동결제 해지" }));

        expect(await screen.findByText(/자동결제 해지 예정/)).toBeInTheDocument();
        expect(screen.getByText("PRO")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "자동결제 다시 활성화" })).toBeEnabled();
        expect(cancelAutoRenew).toHaveBeenCalledTimes(1);
    });

    it("해지 예약된 자동결제를 다시 활성화한다", async () => {
        const canceled = { ...proSubscription, autoRenew: false, cancelAtPeriodEnd: true };
        vi.mocked(requestMyPage).mockResolvedValue({ ...pageData, plan: "PRO" });
        vi.mocked(getSubscription).mockResolvedValue(canceled);
        vi.mocked(reactivateAutoRenew).mockResolvedValue(proSubscription);
        renderPage();

        fireEvent.click(await screen.findByRole("button", { name: "자동결제 다시 활성화" }));

        expect(await screen.findByText("자동결제를 다시 활성화했습니다.")).toBeInTheDocument();
        expect(screen.getByText("사용 중")).toBeInTheDocument();
        expect(reactivateAutoRenew).toHaveBeenCalledTimes(1);
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
