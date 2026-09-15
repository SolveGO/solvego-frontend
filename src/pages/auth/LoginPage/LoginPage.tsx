import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthContext from "../../../contexts/AuthContext";
import "../AuthPage.css";

function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleLogin() {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await login(username, password);
            navigate("/");
        } catch {
            alert("로그인에 실패했습니다. 입력 정보와 연결 상태를 확인해주세요.");
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleSignup() {
        navigate("/signup");
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

                    <button className="auth-button" onClick={handleLogin} disabled={isSubmitting}>
                        로그인
                    </button>

                    <div className="auth-signup">
                        <span>아직 회원이 아니신가요?</span>

                        <button type="button" onClick={handleSignup}>
                            회원가입
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
