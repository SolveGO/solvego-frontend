import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AuthContext from "../../../contexts/AuthContext";
import {
    requestAccountDeletion,
    requestMyPage,
    requestPasswordChange,
    type MyPageData,
} from "../../../api/userApi";

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
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState(false);

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

            <div className="mypage-notice">
                <strong>SolveGO는 현재 개발 및 테스트 중입니다.</strong>
                <p>일부 기능은 변경될 수 있습니다.</p>
            </div>

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
