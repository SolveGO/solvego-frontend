import { Link, Outlet, useNavigate } from "react-router-dom";
import { useContext } from "react";
import AuthContext from "../contexts/AuthContext";
import "./Layout.css";

function Layout() {
    const navigate = useNavigate();
    const { isLoggedIn, logout } = useContext(AuthContext);

    function handleLogout() {
        logout();
        navigate("/problems");
    }

    return (
        <div className="layout">
            <aside className="sidebar">
                <h1 className="logo">SolveGO</h1>

                <nav className="sidebar-nav">
                    <Link to="/problems">문제 목록</Link>

                    {isLoggedIn ? (
                        <>
                            <Link to="/wrong-problems">오답 문제</Link>
                            <Link to="/problems/new">문제 등록</Link>

                            <button onClick={handleLogout}>로그아웃</button>
                        </>
                    ) : (
                        <>
                            <Link to="/login">로그인</Link>
                            <Link to="/signup">회원가입</Link>
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
