import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import ProblemListPage from "./pages/problem/ProblemListPage/ProblemListPage";
import ProblemDetailPage from "./pages/problem/ProblemDetailPage/ProblemDetailPage";
import LoginPage from "./pages/auth/LoginPage/LoginPage";
import SignupPage from "./pages/auth/SignupPage/SignupPage";
import WrongProblemPage from "./pages/problem/WrongProblemPage/WrongProblemPage";
import ProblemCreatePage from "./pages/problem/ProblemCreatePage/ProblemCreatePage";
import ProblemEditPage from "./pages/problem/ProblemEditPage/ProblemEditPage";

function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/problems" replace />} />

                <Route path="/problems" element={<ProblemListPage />} />
                <Route
                    path="/problems/:problemId"
                    element={<ProblemDetailPage />}
                />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />

                <Route
                    path="/wrong-problems"
                    element={
                        <ProtectedRoute>
                            <WrongProblemPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/problems/new"
                    element={
                        <ProtectedRoute>
                            <ProblemCreatePage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/problems/:problemId/edit"
                    element={
                        <ProtectedRoute>
                            <ProblemEditPage />
                        </ProtectedRoute>
                    }
                />
            </Route>
        </Routes>
    );
}

export default App;
