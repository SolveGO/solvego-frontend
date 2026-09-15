import { createContext, useEffect, useSyncExternalStore } from "react";
import { getAuthState, subscribeAuth, type AuthStatus } from "../api/authSession";
import { loginSession, logoutSession, restoreSession } from "../api/api";

type AuthContextType = {
    isLoggedIn: boolean;
    status: AuthStatus;
    login: typeof loginSession;
    logout: typeof logoutSession;
    retryAuth: typeof restoreSession;
};

const AuthContext = createContext<AuthContextType>({
    isLoggedIn: false,
    status: "CHECKING",
    login: loginSession,
    logout: logoutSession,
    retryAuth: restoreSession,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const auth = useSyncExternalStore(subscribeAuth, getAuthState);
    useEffect(() => { void restoreSession(); }, []);
    return (
        <AuthContext.Provider value={{
            isLoggedIn: auth.status === "AUTHENTICATED",
            status: auth.status,
            login: loginSession,
            logout: logoutSession,
            retryAuth: restoreSession,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthContext;
