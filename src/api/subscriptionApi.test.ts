import { beforeEach, expect, it, vi } from "vitest";
import { authFetch } from "./api";
import { completeCheckout, getCheckout, prepareCheckout } from "./subscriptionApi";
vi.mock("./api", () => ({ authFetch: vi.fn() }));
beforeEach(() => { vi.resetAllMocks(); vi.mocked(authFetch).mockResolvedValue(new Response("{}")); });
it("결제 준비와 조회는 기존 인증 API를 이용한다", async () => {
    await prepareCheckout();
    expect(authFetch).toHaveBeenCalledWith("/api/subscriptions/pro/checkouts", { method: "POST" });
    vi.mocked(authFetch).mockResolvedValue(new Response("{}"));
    await getCheckout("order/123");
    expect(authFetch).toHaveBeenLastCalledWith("/api/subscriptions/pro/checkouts/order%2F123");
});
it("승인에는 인증값만 전송하고 금액은 클라이언트에서 지정하지 않는다", async () => {
    await completeCheckout("order-123", "auth", "customer");
    expect(authFetch).toHaveBeenCalledWith("/api/subscriptions/pro/checkouts/order-123/complete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authKey: "auth", customerKey: "customer" }),
    });
});
it("서버 오류의 민감한 원문을 노출하지 않는다", async () => {
    vi.mocked(authFetch).mockResolvedValue(new Response("sensitive", { status: 500 }));
    await expect(prepareCheckout()).rejects.toThrow("구독 결제 요청을 완료하지 못했습니다.");
});
