import { Route, Routes } from "react-router-dom";

import Layout from "./components/Layout/Layout";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";

import ProblemListPage from "./pages/problem/ProblemListPage/ProblemListPage";
import ProblemDetailPage from "./pages/problem/ProblemDetailPage/ProblemDetailPage";
import ProblemCreatePage from "./pages/problem/ProblemCreatePage/ProblemCreatePage";
import ProblemEditPage from "./pages/problem/ProblemEditPage/ProblemEditPage";
import WrongProblemPage from "./pages/problem/WrongProblemPage/WrongProblemPage";

import LoginPage from "./pages/auth/LoginPage/LoginPage";
import SignupPage from "./pages/auth/SignupPage/SignupPage";

import AiPlayPage from "./pages/ai/AiPlayPage/AiPlayPage";
import MyPage from "./pages/user/MyPage/MyPage";
import HomePage from "./pages/home/HomePage/HomePage";

function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />

                <Route path="/problems" element={<ProblemListPage />} />

                <Route
                    path="/problems/:problemId"
                    element={<ProblemDetailPage />}
                />

                <Route path="/login" element={<LoginPage />} />

                <Route path="/signup" element={<SignupPage />} />

                <Route
                    path="/mypage"
                    element={
                        <ProtectedRoute>
                            <MyPage />
                        </ProtectedRoute>
                    }
                />

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

                <Route
                    path="/ai-play"
                    element={
                        <ProtectedRoute>
                            <AiPlayPage />
                        </ProtectedRoute>
                    }
                />
            </Route>
        </Routes>
    );
}

export default App;
