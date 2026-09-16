import { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AuthContext from "../../../contexts/AuthContext";
import {
    requestAccountDeletion,
    requestMyPage,
    requestPasswordChange,
    type MyPageData,
} from "../../../api/userApi";
import {
    requestAiExplanationUsage,
    type AiExplanationUsage,
} from "../../../api/aiApi";

import { prepareCheckout, getCheckout, checkoutMessage, type Checkout } from "../../../api/subscriptionApi";
import { startBillingAuth } from "../../../billing/tossBilling";
import "./MyPage.css";

function formatJoinedAt(joinedAt: string) {
    return new Intl.DateTimeFormat("ko-KR", { dateStyle: "long" }).format(
        new Date(joinedAt),
    );
}

function MyPage() {
    const navigate = useNavigate();
    const { logout } = useContext(AuthContext);
    const [data, setData] = useState<MyPageData | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [explanationUsage, setExplanationUsage] =
        useState<AiExplanationUsage | null>(null);
    const [usageLoadError, setUsageLoadError] = useState(false);
    const [checkout, setCheckout] = useState<Checkout | null>(null);
    const [billingBusy, setBillingBusy] = useState(false);
    const billingLock = useRef(false);
    const [subscriptionMessage, setSubscriptionMessage] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(false);
    const currentPlan = data?.plan ?? "FREE";

    useEffect(() => {
        let active = true;
        requestMyPage()
            .then((response) => {
                if (active) setData(response);
            })
            .catch(() => {
                if (active) setLoadError(true);
            });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!explanationUsage) return;

        const resetDelay = new Date(explanationUsage.resetsAt).getTime() - Date.now();
        if (!Number.isFinite(resetDelay) || resetDelay <= 0) return;

        const timer = window.setTimeout(() => {
            requestAiExplanationUsage()
                .then(setExplanationUsage)
                .catch(() => setUsageLoadError(true));
        }, resetDelay + 1000);

        return () => window.clearTimeout(timer);
    }, [explanationUsage]);

    useEffect(() => {
        let active = true;
        requestAiExplanationUsage()
            .then((response) => {
                if (active) setExplanationUsage(response);
            })
            .catch(() => {
                if (active) setUsageLoadError(true);
            });
        return () => {
            active = false;
        };
    }, []);

    async function handleSubscription() {
        if (billingLock.current) return;
        billingLock.current = true;
        setBillingBusy(true);
        setSubscriptionMessage("");
        try {
            const prepared = await prepareCheckout();
            setCheckout(prepared);
            if (prepared.status !== "READY") setSubscriptionMessage(checkoutMessage(prepared.status));
            if (prepared.status === "SUCCEEDED") {
                setData(await requestMyPage());
                setExplanationUsage(await requestAiExplanationUsage());
            }
        } catch { setSubscriptionMessage("구독 결제를 준비하지 못했습니다. 결제 설정 또는 연결 상태를 확인해주세요."); }
        finally { billingLock.current = false; setBillingBusy(false); }
    }

    async function confirmSubscription() {
        if (!checkout || billingLock.current || checkout.status !== "READY") return;
        billingLock.current = true;
        setBillingBusy(true);
        try { await startBillingAuth(checkout); }
        catch { setSubscriptionMessage("결제수단 인증이 취소되었거나 시작하지 못했습니다. 청구는 진행하지 않았습니다."); }
        finally { billingLock.current = false; setBillingBusy(false); }
    }

    async function refreshCheckout() {
        if (!checkout || billingLock.current) return;
        billingLock.current = true;
        setBillingBusy(true);
        try {
            const result = await getCheckout(checkout.orderId);
            setCheckout(result);
            setSubscriptionMessage(checkoutMessage(result.status));
            if (result.status === "SUCCEEDED") {
                setData(await requestMyPage());
                setExplanationUsage(await requestAiExplanationUsage());
            }
        } catch { setSubscriptionMessage("결제 상태를 확인하지 못했습니다. 다시 결제하지 말고 잠시 후 확인해주세요."); }
        finally { billingLock.current = false; setBillingBusy(false); }
    }

    async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setPasswordMessage("");

        if (!currentPassword || !newPassword || !newPasswordConfirm) {
            setPasswordMessage("비밀번호를 모두 입력해주세요.");
            return;
        }
        if (newPassword !== newPasswordConfirm) {
            setPasswordMessage("새 비밀번호가 일치하지 않습니다.");
            return;
        }

        setIsChangingPassword(true);
        try {
            await requestPasswordChange(currentPassword, newPassword);
            setCurrentPassword("");
            setNewPassword("");
            setNewPasswordConfirm("");
            setPasswordMessage("비밀번호가 변경되었습니다.");
        } catch {
            setPasswordMessage("현재 비밀번호를 확인해주세요.");
        } finally {
            setIsChangingPassword(false);
        }
    }

    async function handleDeleteAccount() {
        if (isDeleting || !window.confirm("회원 탈퇴를 진행하시겠습니까?")) return;
        setIsDeleting(true);
        setDeleteError(false);
        try {
            await requestAccountDeletion();
            try {
                await logout();
            } catch {
                // logout clears the in-memory session before revoking the refresh cookie.
            }
            navigate("/", { replace: true });
        } catch {
            setDeleteError(true);
            setIsDeleting(false);
        }
    }

    return (
        <div className="mypage">
            <h1>마이페이지</h1>

            {loadError && (
                <p role="alert" className="mypage-message">
                    마이페이지 정보를 불러오지 못했습니다.
                </p>
            )}
            {!data && !loadError && (
                <p role="status" className="mypage-message">
                    내 정보를 불러오고 있습니다.
                </p>
            )}

            {data && (
                <>
                    <section className="mypage-section">
                        <h2>내 정보</h2>
                        <div className="mypage-info">
                            <div className="mypage-info-row">
                                <span>사용자명</span>
                                <strong>{data.username}</strong>
                            </div>
                            <div className="mypage-info-row">
                                <span>가입일</span>
                                <strong>{formatJoinedAt(data.joinedAt)}</strong>
                            </div>
                        </div>
                    </section>

                    <section className="mypage-section">
                        <h2>AI 해설</h2>
                        <div className="mypage-explanation-card">
                            <div className="mypage-plan-row">
                                <span>현재 플랜</span>
                                <strong className={`mypage-plan-badge ${currentPlan.toLowerCase()}`}>
                                    {currentPlan}
                                </strong>
                            </div>

                            {explanationUsage && (
                                <div className="mypage-explanation-stats">
                                    <div>
                                        <span>오늘 사용</span>
                                        <strong>{explanationUsage.usedCount}회</strong>
                                    </div>
                                    <div>
                                        <span>남은 횟수</span>
                                        <strong>{explanationUsage.remainingCount}회</strong>
                                    </div>
                                    <div>
                                        <span>일일 한도</span>
                                        <strong>{explanationUsage.dailyLimit}회</strong>
                                    </div>
                                </div>
                            )}

                            {!explanationUsage && !usageLoadError && (
                                <p role="status" className="mypage-message">
                                    AI 해설 사용량을 불러오고 있습니다.
                                </p>
                            )}
                            {usageLoadError && (
                                <p role="alert" className="mypage-message">
                                    AI 해설 사용량을 불러오지 못했습니다.
                                </p>
                            )}

                            {currentPlan === "FREE" && (
                                <div className="mypage-subscription-action">
                                    <button
                                        type="button"
                                        disabled={billingBusy}
                                        onClick={() => { void handleSubscription(); }}>
                                        구독하고 해설 한도 늘리기
                                    </button>
                                    {checkout?.status === "READY" && <div>
                                        <p>{checkout.orderName}: {checkout.amount.toLocaleString("ko-KR")}원 / 월</p>
                                        <p>테스트 결제입니다. 승인 후 1개월간 PRO를 이용합니다. 자동 갱신 청구는 아직 실행되지 않습니다.</p>
                                        <button disabled={billingBusy} onClick={() => { void confirmSubscription(); }}>
                                            {billingBusy ? "처리 중..." : "금액 확인 및 카드 등록"}
                                        </button>
                                    </div>}
                                    {checkout && checkout.status !== "READY" && <div>
                                        <p>주문번호: {checkout.orderId}</p>
                                        <button disabled={billingBusy} onClick={() => { void refreshCheckout(); }}>주문 상태 확인</button>
                                    </div>}
                                    {subscriptionMessage && (
                                        <p role="status" className="mypage-message">
                                            {subscriptionMessage}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="mypage-section">
                        <h2>내 활동</h2>
                        <div className="mypage-stats">
                            <div className="mypage-stat-card">
                                <span>등록한 문제</span>
                                <strong>{data.registeredProblemCount}</strong>
                            </div>
                            <div className="mypage-stat-card">
                                <span>풀이한 문제</span>
                                <strong>{data.solvedProblemCount}</strong>
                            </div>
                            <div className="mypage-stat-card">
                                <span>오답 문제</span>
                                <strong>{data.wrongProblemCount}</strong>
                            </div>
                        </div>
                    </section>

                    <section className="mypage-section">
                        <h2>내가 등록한 문제</h2>
                        {data.problems.length === 0 ? (
                            <p className="mypage-empty">등록한 문제가 없습니다.</p>
                        ) : (
                            <div className="mypage-problem-list">
                                {data.problems.map((problem) => (
                                    <Link
                                        key={problem.problemId}
                                        to={`/problems/${problem.problemId}`}
                                        className="mypage-problem-item">
                                        <span>#{problem.problemId} {problem.title}</span>
                                        <span>›</span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}

            <section className="mypage-section">
                <h2>비밀번호 변경</h2>
                <form className="mypage-password-form" onSubmit={handlePasswordChange}>
                    <label>
                        현재 비밀번호
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            autoComplete="current-password"
                        />
                    </label>
                    <label>
                        새 비밀번호
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            autoComplete="new-password"
                        />
                    </label>
                    <label>
                        새 비밀번호 확인
                        <input
                            type="password"
                            value={newPasswordConfirm}
                            onChange={(e) => setNewPasswordConfirm(e.target.value)}
                            autoComplete="new-password"
                        />
                    </label>

                    {passwordMessage && (
                        <p role="status" className="mypage-message">{passwordMessage}</p>
                    )}
                    <button type="submit" disabled={isChangingPassword}>
                        {isChangingPassword ? "변경 중..." : "비밀번호 변경"}
                    </button>
                </form>
            </section>

            <section className="mypage-section mypage-danger">
                <h2>회원 탈퇴</h2>
                <p>회원 탈퇴 시 계정과 관련된 정보가 삭제될 수 있습니다.</p>
                {deleteError && (
                    <p role="alert" className="mypage-message">
                        회원 탈퇴를 완료하지 못했습니다.
                    </p>
                )}
                <button type="button" onClick={handleDeleteAccount} disabled={isDeleting}>
                    {isDeleting ? "탈퇴 처리 중..." : "회원 탈퇴"}
                </button>
            </section>
        </div>
    );
}

export default MyPage;
