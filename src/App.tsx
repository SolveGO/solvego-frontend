import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

import ProblemListPage from "./pages/ProblemListPage";
import ProblemDetailPage from "./pages/ProblemDetailPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import WrongProblemPage from "./pages/WrongProblemPage";
import ProblemCreatePage from "./pages/ProblemCreatePage";
import ProblemEditPage from "./pages/ProblemEditPage";

function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
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
