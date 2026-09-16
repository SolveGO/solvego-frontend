import { StrictMode } from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeCheckout, getCheckout } from "../../api/subscriptionApi";
import BillingReturnPage from "./BillingReturnPage";

vi.mock("../../api/subscriptionApi", async original => ({
    ...await original<typeof import("../../api/subscriptionApi")>(),
    completeCheckout: vi.fn(), getCheckout: vi.fn(),
}));
const checkout = { orderId: "order-123", customerKey: "customer", orderName: "PRO", amount: 5000,
    status: "SUCCEEDED" as const, currentPeriodEndAt: null };
function page(query = "?orderId=order-123&authKey=auth-sensitive&customerKey=customer") {
    window.history.replaceState({}, "", "/billing/return" + query);
    render(<StrictMode><MemoryRouter initialEntries={["/billing/return" + query]}><Routes>
        <Route path="/billing/return" element={<BillingReturnPage />} />
        <Route path="/mypage" element={<p>마이페이지 데이터 다시 조회</p>} />
    </Routes></MemoryRouter></StrictMode>);
}

describe("Billing return", () => {
    beforeEach(() => { vi.resetAllMocks(); });
    it("StrictMode에서도 승인을 한 번만 요청하고 성공 시 마이페이지로 이동한다", async () => {
        vi.mocked(completeCheckout).mockResolvedValue(checkout);
        page();
        expect(await screen.findByText("마이페이지 데이터 다시 조회")).toBeInTheDocument();
        expect(completeCheckout).toHaveBeenCalledTimes(1);
        expect(completeCheckout).toHaveBeenCalledWith("order-123", "auth-sensitive", "customer");
        expect(window.location.search).not.toContain("authKey");
        expect(window.location.search).not.toContain("customerKey");
    });
    it("새로고침으로 인증값이 없어지면 상태만 조회한다", async () => {
        vi.mocked(getCheckout).mockResolvedValue({ ...checkout, status: "PROCESSING" });
        page("?orderId=order-123");
        expect(await screen.findByText(/결제가 처리 중이거나/)).toBeInTheDocument();
        expect(completeCheckout).not.toHaveBeenCalled();
        expect(getCheckout).toHaveBeenCalledTimes(1);
    });
    it("Toss 인증 실패는 승인을 호출하지 않는다", async () => {
        page("?orderId=order-123&failed=1&message=untrusted");
        expect(await screen.findByText(/청구는 진행하지 않았습니다/)).toBeInTheDocument();
        expect(completeCheckout).not.toHaveBeenCalled();
        expect(screen.queryByText("untrusted")).not.toBeInTheDocument();
    });
    it("응답 유실 시 승인 재시도 없이 조회만 수행한다", async () => {
        vi.mocked(completeCheckout).mockRejectedValue(new Error("network"));
        vi.mocked(getCheckout).mockResolvedValue({ ...checkout, status: "UNKNOWN" });
        page();
        expect(await screen.findByText(/결제 결과를 확인하지 못했습니다/)).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "주문 상태 확인" }));
        await waitFor(() => expect(getCheckout).toHaveBeenCalledTimes(1));
        expect(completeCheckout).toHaveBeenCalledTimes(1);
    });
    it("결제 거절을 표시한다", async () => {
        vi.mocked(completeCheckout).mockResolvedValue({ ...checkout, status: "FAILED" });
        page();
        expect(await screen.findByText(/결제가 거절되었습니다/)).toBeInTheDocument();
    });
});
