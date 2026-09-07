import { useContext, useEffect } from "react";
import { Navigate } from "react-router-dom";
import AuthContext from "../../contexts/AuthContext";

type ProtectedRouteProps = {
    children: React.ReactNode;
};

function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isLoggedIn } = useContext(AuthContext);

    useEffect(() => {
        if (!isLoggedIn) {
            alert("로그인이 필요한 서비스입니다.");
        }
    }, [isLoggedIn]);

    if (!isLoggedIn) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default ProtectedRoute;
