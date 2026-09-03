import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api/api";
import "./AuthPage.css";

type SignupResponse = {
    userId: number;
};

function SignupPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const navigate = useNavigate();

    async function handleSignup() {
        const response = await fetch(`${API_BASE_URL}/api/users`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                username,
                password,
            }),
        });

        if (!response.ok) {
            if (response.status === 409) {
                alert("이미 사용 중인 아이디입니다.");
                return;
            }

            alert("회원가입에 실패했습니다.");
            return;
        }

        const data: SignupResponse = await response.json();

        console.log("생성된 userId:", data.userId);

        alert("회원가입이 완료되었습니다.");
        navigate("/login");
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1>회원가입</h1>

                <div className="auth-form">
                    <div className="auth-field">
                        <label>아이디</label>
                        <input
                            type="text"
                            placeholder="아이디를 입력하세요"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <div className="auth-field">
                        <label>비밀번호</label>
                        <input
                            type="password"
                            placeholder="비밀번호를 입력하세요"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button className="auth-button" onClick={handleSignup}>
                        회원가입
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SignupPage;
