import { useContext } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../../contexts/AuthContext";

type ProtectedRouteProps = { children: React.ReactNode };

function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { status, retryAuth } = useContext(AuthContext);
    if (status === "CHECKING") return <p role="status">로그인을 확인하고 있습니다.</p>;
    if (status === "ERROR") return (
        <div role="alert">
            <p>로그인을 확인하지 못했습니다. 연결 상태를 확인해주세요.</p>
            <button onClick={() => { void retryAuth(); }}>다시 확인</button>
        </div>
    );
    if (status === "ANONYMOUS") return <Navigate to="/login" replace />;
    return children;
}

export default ProtectedRoute;
