import { StrictMode } from "react";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./AuthContext";
import ProtectedRoute from "../components/ProtectedRoute/ProtectedRoute";
import { setAuthState } from "../api/authSession";
import { restoreSession } from "../api/api";

vi.mock("../api/api", () => ({
    restoreSession: vi.fn(), loginSession: vi.fn(), logoutSession: vi.fn(),
}));

beforeEach(() => {
    vi.resetAllMocks();
    setAuthState({ accessToken: null, status: "CHECKING" });
});

function renderApp() {
    return render(<StrictMode><MemoryRouter initialEntries={["/protected"]}>
        <AuthProvider><Routes>
            <Route path="/protected" element={<ProtectedRoute><p>보호된 화면</p></ProtectedRoute>} />
            <Route path="/login" element={<p>로그인 화면</p>} />
        </Routes></AuthProvider>
    </MemoryRouter></StrictMode>);
}

describe("초기 인증 복원과 보호 경로", () => {
    it("복원 중에는 로그인으로 이동하지 않으며 성공하면 보호 화면을 표시한다", () => {
        renderApp();
        expect(screen.getByRole("status")).toHaveTextContent("로그인을 확인");
        expect(screen.queryByText("로그인 화면")).not.toBeInTheDocument();
        act(() => setAuthState({ accessToken: "restored", status: "AUTHENTICATED" }));
        expect(screen.getByText("보호된 화면")).toBeInTheDocument();
        expect(restoreSession).toHaveBeenCalled();
    });

    it("확정된 비로그인 상태에서만 로그인 화면으로 이동한다", () => {
        renderApp();
        act(() => setAuthState({ accessToken: null, status: "ANONYMOUS" }));
        expect(screen.getByText("로그인 화면")).toBeInTheDocument();
    });

    it("복원 장애는 로그인 이동 대신 재확인 UI를 표시한다", () => {
        renderApp();
        act(() => setAuthState({ accessToken: null, status: "ERROR" }));
        expect(screen.getByRole("alert")).toHaveTextContent("연결 상태");
        expect(screen.getByRole("button", { name: "다시 확인" })).toBeEnabled();
        expect(screen.queryByText("로그인 화면")).not.toBeInTheDocument();
    });

    it("인증 종료는 Context에 반영되어 보호 화면을 닫는다", () => {
        setAuthState({ accessToken: "access", status: "AUTHENTICATED" });
        renderApp();
        expect(screen.getByText("보호된 화면")).toBeInTheDocument();
        act(() => setAuthState({ accessToken: null, status: "ANONYMOUS" }));
        expect(screen.getByText("로그인 화면")).toBeInTheDocument();
    });
});
