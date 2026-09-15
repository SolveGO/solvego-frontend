import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authFetch } from "../../../api/api";
import "./WrongProblemPage.css";

type WrongProblem = {
    problemId: number;
    title: string;
};

function WrongProblemPage() {
    const [problems, setProblems] = useState<WrongProblem[]>([]);

    useEffect(() => {
        async function fetchWrongProblems() {
            const response = await authFetch("/api/users/me/wrong-problems");

            if (!response.ok) {
                if (response.status === 401) {
                    alert("인증 요청이 거부되었습니다. 다시 로그인해주세요.");

                    return;
                }

                alert("오답 문제를 불러오지 못했습니다.");
                return;
            }

            const data: WrongProblem[] = await response.json();

            setProblems(data);
        }

        fetchWrongProblems();
    }, []);

    return (
        <div className="wrong-problem-page">
            <h1>오답 문제</h1>

            {problems.length === 0 ? (
                <p className="empty-message">오답 문제가 없습니다.</p>
            ) : (
                <div className="wrong-problem-list">
                    {problems.map((problem) => (
                        <Link
                            key={problem.problemId}
                            className="wrong-problem-card"
                            to={`/problems/${problem.problemId}`}>
                            <span className="wrong-problem-number">
                                #{problem.problemId}
                            </span>

                            <h2>{problem.title}</h2>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

export default WrongProblemPage;
