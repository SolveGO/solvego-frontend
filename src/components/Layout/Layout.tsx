import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useContext } from "react";
import AuthContext from "../../contexts/AuthContext";
import "./Layout.css";

function Layout() {
    const navigate = useNavigate();
    const { isLoggedIn, logout } = useContext(AuthContext);

    function handleLogout() {
        logout();
        navigate("/problems");
    }

    function navClassName({ isActive }: { isActive: boolean }) {
        return isActive ? "active" : "";
    }

    return (
        <div className="layout">
            <aside className="sidebar">
                <div className="logo">
                    <img src="/solvego.png" alt="SolveGO logo" />
                    <span>SolveGO</span>
                </div>

                <nav className="sidebar-nav">
                    <NavLink to="/problems" end className={navClassName}>
                        문제 목록
                    </NavLink>

                    {isLoggedIn ? (
                        <>
                            <NavLink
                                to="/wrong-problems"
                                className={navClassName}>
                                오답 문제
                            </NavLink>

                            <NavLink
                                to="/problems/new"
                                className={navClassName}>
                                문제 등록
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
                </nav>
            </aside>

            <main className="content">
                <Outlet />
            </main>
        </div>
    );
}

export default Layout;
