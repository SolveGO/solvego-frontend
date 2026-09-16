import { authFetch } from "./api";

export type Checkout = {
    orderId: string;
    customerKey: string;
    orderName: string;
    amount: number;
    status: "READY" | "PROCESSING" | "UNKNOWN" | "SUCCEEDED" | "FAILED" | "REFUNDED";
    currentPeriodEndAt: string | null;
};

async function read(response: Response): Promise<Checkout> {
    if (!response.ok) throw new Error("구독 결제 요청을 완료하지 못했습니다.");
    return response.json();
}

const base = "/api/subscriptions/pro/checkouts";
export async function prepareCheckout() {
    return read(await authFetch(base, { method: "POST" }));
}
export async function completeCheckout(orderId: string, authKey: string, customerKey: string) {
    return read(await authFetch(`${base}/${encodeURIComponent(orderId)}/complete`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authKey, customerKey }),
    }));
}
export async function getCheckout(orderId: string) {
    return read(await authFetch(`${base}/${encodeURIComponent(orderId)}`));
}

export function checkoutMessage(status: Checkout["status"]) {
    switch (status) {
        case "SUCCEEDED": return "PRO 구독 결제가 완료되었습니다.";
        case "FAILED": return "결제가 거절되었습니다. 추가 청구는 하지 않습니다. 문의 시 주문번호를 알려주세요.";
        case "PROCESSING":
        case "UNKNOWN": return "결제가 처리 중이거나 결과 확인이 필요합니다. 다시 결제하지 말고 주문 상태를 확인해주세요.";
        default: return "결제수단 인증이 완료되지 않았습니다. 마이페이지에서 다시 시작해주세요.";
    }
}
