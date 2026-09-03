import { createContext, useState } from "react";

type AuthContextType = {
    isLoggedIn: boolean;
    login: (accessToken: string) => void;
    logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
    isLoggedIn: false,
    login: () => {},
    logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isLoggedIn, setIsLoggedIn] = useState(
        localStorage.getItem("accessToken") !== null,
    );

    function login(accessToken: string) {
        localStorage.setItem("accessToken", accessToken);
        setIsLoggedIn(true);
    }

    function logout() {
        localStorage.removeItem("accessToken");
        setIsLoggedIn(false);
    }

    return (
        <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthContext;
