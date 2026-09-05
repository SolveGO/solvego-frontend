import { useState } from "react";
import { Link } from "react-router-dom";

import "./MyPage.css";

type MyProblem = {
    id: number;
    title: string;
};

function MyPage() {
    // TODO: 마이페이지 API 연동 후 실제 데이터로 교체
    const username = "사용자";
    const joinedAt = "-";

    const registeredProblemCount = 0;
    const solvedProblemCount = 0;
    const wrongProblemCount = 0;

    const myProblems: MyProblem[] = [];

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

    function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!currentPassword || !newPassword || !newPasswordConfirm) {
            alert("비밀번호를 모두 입력해주세요.");
            return;
        }

        if (newPassword !== newPasswordConfirm) {
            alert("새 비밀번호가 일치하지 않습니다.");
            return;
        }

        // TODO: 비밀번호 변경 API 연동
        alert("비밀번호 변경 기능은 준비 중입니다.");
    }

    function handleDeleteAccount() {
        // TODO: 회원 탈퇴 API 연동
        alert("회원 탈퇴 기능은 준비 중입니다.");
    }

    return (
        <div className="mypage">
            <h1>마이페이지</h1>

            <div className="mypage-notice">
                <strong>SolveGO는 현재 개발 및 테스트 중입니다.</strong>
                <p>일부 기능은 변경될 수 있습니다.</p>
            </div>

            <section className="mypage-section">
                <h2>내 정보</h2>

                <div className="mypage-info">
                    <div className="mypage-info-row">
                        <span>사용자명</span>
                        <strong>{username}</strong>
                    </div>

                    <div className="mypage-info-row">
                        <span>가입일</span>
                        <strong>{joinedAt}</strong>
                    </div>
                </div>
            </section>

            <section className="mypage-section">
                <h2>내 활동</h2>

                <div className="mypage-stats">
                    <div className="mypage-stat-card">
                        <span>등록한 문제</span>
                        <strong>{registeredProblemCount}</strong>
                    </div>

                    <div className="mypage-stat-card">
                        <span>풀이한 문제</span>
                        <strong>{solvedProblemCount}</strong>
                    </div>

                    <div className="mypage-stat-card">
                        <span>오답 문제</span>
                        <strong>{wrongProblemCount}</strong>
                    </div>
                </div>
            </section>

            <section className="mypage-section">
                <h2>내가 등록한 문제</h2>

                {myProblems.length === 0 ? (
                    <p className="mypage-empty">등록한 문제가 없습니다.</p>
                ) : (
                    <div className="mypage-problem-list">
                        {myProblems.map((problem) => (
                            <Link
                                key={problem.id}
                                to={`/problems/${problem.id}`}
                                className="mypage-problem-item">
                                <span>
                                    #{problem.id} {problem.title}
                                </span>

                                <span>›</span>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            <section className="mypage-section">
                <h2>비밀번호 변경</h2>

                <form
                    className="mypage-password-form"
                    onSubmit={handlePasswordChange}>
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
                            onChange={(e) =>
                                setNewPasswordConfirm(e.target.value)
                            }
                            autoComplete="new-password"
                        />
                    </label>

                    <button type="submit">비밀번호 변경</button>
                </form>
            </section>

            <section className="mypage-section mypage-danger">
                <h2>회원 탈퇴</h2>

                <p>회원 탈퇴 시 계정과 관련된 정보가 삭제될 수 있습니다.</p>

                <button type="button" onClick={handleDeleteAccount}>
                    회원 탈퇴
                </button>
            </section>
        </div>
    );
}

export default MyPage;
