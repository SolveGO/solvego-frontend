import { afterEach, describe, expect, it, vi } from "vitest";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { startBillingAuth } from "./tossBilling";
vi.mock("@tosspayments/tosspayments-sdk", () => ({ loadTossPayments: vi.fn() }));
const checkout = { orderId: "order-123", customerKey: "customer", orderName: "PRO", amount: 5000,
    status: "READY" as const, currentPeriodEndAt: null };
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
describe("Toss Billing SDK", () => {
    it("공식 SDK의 CARD 자동결제 인증 계약을 사용한다", async () => {
        vi.stubEnv("VITE_TOSS_PAYMENTS_CLIENT_KEY", "test_ck_fixture_only");
        const requestBillingAuth = vi.fn().mockResolvedValue(undefined);
        const payment = vi.fn().mockReturnValue({ requestBillingAuth });
        vi.mocked(loadTossPayments).mockResolvedValue({ payment } as unknown as Awaited<ReturnType<typeof loadTossPayments>>);
        await startBillingAuth(checkout);
        expect(payment).toHaveBeenCalledWith({ customerKey: "customer" });
        expect(requestBillingAuth).toHaveBeenCalledWith({ method: "CARD", windowTarget: "self",
            successUrl: `${window.location.origin}/billing/return?orderId=order-123`,
            failUrl: `${window.location.origin}/billing/return?orderId=order-123&failed=1` });
    });
    it("운영 키나 미설정 키로는 창을 열지 않는다", async () => {
        vi.stubEnv("VITE_TOSS_PAYMENTS_CLIENT_KEY", "live_ck_fixture_only");
        await expect(startBillingAuth(checkout)).rejects.toThrow();
        expect(loadTossPayments).not.toHaveBeenCalled();
    });
});
