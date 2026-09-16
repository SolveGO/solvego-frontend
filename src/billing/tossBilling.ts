import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import type { Checkout } from "../api/subscriptionApi";

export async function startBillingAuth(checkout: Checkout) {
    const clientKey = import.meta.env.VITE_TOSS_PAYMENTS_CLIENT_KEY as string | undefined;
    if (!clientKey?.startsWith("test_ck_")) throw new Error("테스트 클라이언트 키 설정이 필요합니다.");
    const toss = await loadTossPayments(clientKey);
    const payment = toss.payment({ customerKey: checkout.customerKey });
    const success = new URL("/billing/return", window.location.origin);
    success.searchParams.set("orderId", checkout.orderId);
    const failure = new URL(success);
    failure.searchParams.set("failed", "1");
    await payment.requestBillingAuth({
        method: "CARD", successUrl: success.toString(), failUrl: failure.toString(),
        windowTarget: "self",
    });
}
