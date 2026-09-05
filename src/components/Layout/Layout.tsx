import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useContext } from "react";

import AuthContext from "../../contexts/AuthContext";

import "./Layout.css";

function Layout() {
    const navigate = useNavigate();
    const { isLoggedIn, logout } = useContext(AuthContext);

    function handleLogout() {
        logout();
        navigate("/");
    }

    function navClassName({ isActive }: { isActive: boolean }) {
        return isActive ? "active" : "";
    }

    return (
        <div className="layout">
            <aside className="sidebar">
                <NavLink to="/" className="logo">
                    <img src="/solvego.png" alt="SolveGO logo" />
                    <span>SolveGO</span>
                </NavLink>

                <nav className="sidebar-nav">
                    <NavLink to="/" end className={navClassName}>
                        홈
                    </NavLink>

                    {isLoggedIn && (
                        <NavLink to="/ai-play" className={navClassName}>
                            AI 대국
                        </NavLink>
                    )}

                    <NavLink to="/problems" end className={navClassName}>
                        문제 풀기
                    </NavLink>

                    {isLoggedIn && (
                        <>
                            <NavLink
                                to="/wrong-problems"
                                className={navClassName}>
                                오답 노트
                            </NavLink>

                            <NavLink
                                to="/problems/new"
                                className={navClassName}>
                                문제 만들기
                            </NavLink>
                        </>
                    )}
                </nav>

                <div className="sidebar-account">
                    {isLoggedIn ? (
                        <>
                            <NavLink to="/mypage" className={navClassName}>
                                마이페이지
                            </NavLink>

                            <button onClick={handleLogout}>로그아웃</button>
                        </>
                    ) : (
                        <>
                            <NavLink to="/login" className={navClassName}>
                                로그인
                            </NavLink>

                            <NavLink to="/signup" className={navClassName}>
                                회원가입
                            </NavLink>
                        </>
                    )}
                </div>
            </aside>

            <main className="content">
                <Outlet />
            </main>
        </div>
    );
}

export default Layout;
