import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthContext from "../../../contexts/AuthContext";
import { API_BASE_URL } from "../../../api/api";
import "../AuthPage.css";

type LoginResponse = {
    accessToken: string;
};

function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    async function handleLogin() {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
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
            alert("로그인에 실패했습니다.");
            return;
        }

        const data: LoginResponse = await response.json();

        login(data.accessToken);
        navigate("/");
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1>로그인</h1>

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

                    <button className="auth-button" onClick={handleLogin}>
                        로그인
                    </button>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
