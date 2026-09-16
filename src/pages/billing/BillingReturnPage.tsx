import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { checkoutMessage, completeCheckout, getCheckout, type Checkout } from "../../api/subscriptionApi";

export default function BillingReturnPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [input] = useState(() => {
        const params = new URLSearchParams(location.search);
        return { orderId: params.get("orderId"), authKey: params.get("authKey"),
            customerKey: params.get("customerKey"), failed: params.has("failed") };
    });
    const [message, setMessage] = useState(input.failed
        ? "결제수단 인증이 취소되었거나 실패했습니다. 청구는 진행하지 않았습니다."
        : !input.orderId ? "결제 요청 정보가 없습니다." : "결제 결과를 확인하고 있습니다.");
    const [checking, setChecking] = useState(false);
    const pending = useRef<Promise<Checkout> | null>(null);

    useEffect(() => {
        // Keep credentials only in this page's memory; remove them from browser history immediately.
        const clean = new URL(window.location.href);
        clean.search = input.orderId ? `?orderId=${encodeURIComponent(input.orderId)}` : "";
        window.history.replaceState(window.history.state, "", clean);
        let active = true;
        if (input.failed || !input.orderId) return;
        if (!pending.current) {
            pending.current = input.authKey && input.customerKey
                ? completeCheckout(input.orderId, input.authKey, input.customerKey)
                : getCheckout(input.orderId);
        }
        pending.current.then(result => {
            if (!active) return;
            setMessage(checkoutMessage(result.status));
            if (result.status === "SUCCEEDED") navigate("/mypage", { replace: true });
        }).catch(() => {
            if (active) setMessage("결제 결과를 확인하지 못했습니다. 다시 결제하지 말고 상태 확인을 눌러주세요.");
        });
        return () => { active = false; };
    }, [input, navigate]);

    async function checkStatus() {
        if (!input.orderId || checking) return;
        setChecking(true);
        try {
            const result = await getCheckout(input.orderId);
            setMessage(checkoutMessage(result.status));
            if (result.status === "SUCCEEDED") navigate("/mypage", { replace: true });
        } catch { setMessage("상태를 조회하지 못했습니다. 잠시 후 확인해주세요. 추가 결제는 하지 않습니다."); }
        finally { setChecking(false); }
    }

    return <section className="mypage-section">
        <h1>PRO 구독 결제</h1>
        <p role="status">{message}</p>
        {input.orderId && <><p>주문번호: {input.orderId}</p>
            <button disabled={checking} onClick={() => { void checkStatus(); }}>주문 상태 확인</button></>}
        <p><Link to="/mypage">마이페이지로 돌아가기</Link></p>
    </section>;
}
