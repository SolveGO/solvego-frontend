import { useContext, useEffect, useState } from "react";
import GoBoard from "../components/GoBoard";
import { useNavigate, useParams } from "react-router-dom";
import AuthContext from "../contexts/AuthContext";
import { API_BASE_URL, authFetch } from "../api/api";
import "./ProblemDetailPage.css";

type Position = {
    x: number;
    y: number;
};

type ProblemDetail = {
    problemId: number;
    title: string;
    description: string;
    blackStones: Position[];
    whiteStones: Position[];
    nextPlayer: "BLACK" | "WHITE";
    creatorName: string;
};

type AttemptResponse = {
    isCorrect: boolean;
};

function ProblemDetailPage() {
    const { problemId } = useParams();
    const navigate = useNavigate();
    const { isLoggedIn, logout } = useContext(AuthContext);

    const [problem, setProblem] = useState<ProblemDetail | null>(null);
    const [selectedPosition, setSelectedPosition] = useState<Position | null>(
        null,
    );
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

    useEffect(() => {
        async function fetchProblem() {
            const response = await fetch(
                `${API_BASE_URL}/api/problems/${problemId}`,
            );

            const data: ProblemDetail = await response.json();

            setProblem(data);
        }

        fetchProblem();
    }, [problemId]);

    async function handleDeleteProblem() {
        const confirmed = window.confirm("정말 이 문제를 삭제하시겠습니까?");

        if (!confirmed) {
            return;
        }

        const response = await authFetch(`/api/problems/${problemId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            if (response.status === 401) {
                logout();
                alert("로그인이 만료되었습니다.");
                navigate("/login");
                return;
            }

            if (response.status === 403) {
                alert("문제를 삭제할 권한이 없습니다.");
                return;
            }

            if (response.status === 404) {
                alert("존재하지 않는 문제입니다.");
                navigate("/problems");
                return;
            }

            alert("문제 삭제에 실패했습니다.");
            return;
        }

        navigate("/problems");
    }

    async function handleSubmit() {
        if (selectedPosition === null) {
            return;
        }

        const response = await authFetch(
            `/api/problems/${problemId}/attempts`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    selectedPosition,
                }),
            },
        );

        if (!response.ok) {
            if (response.status === 401) {
                logout();
                alert("로그인이 만료되었습니다.");
                navigate("/login");
                return;
            }

            alert("풀이 제출에 실패했습니다.");
            return;
        }

        const data: AttemptResponse = await response.json();

        setIsCorrect(data.isCorrect);
    }

    if (problem === null) {
        return <p>불러오는 중...</p>;
    }

    return (
        <div className="problem-detail-page">
            <div className="problem-header">
                <span className="problem-detail-number">
                    #{problem.problemId}
                </span>

                <h1>{problem.title}</h1>

                <p className="problem-author">작성자 {problem.creatorName}</p>

                <p className="problem-description">{problem.description}</p>

                <p className="next-player">
                    다음 차례:{" "}
                    <strong>
                        {problem.nextPlayer === "BLACK" ? "흑" : "백"}
                    </strong>
                </p>
            </div>

            <GoBoard
                blackStones={problem.blackStones}
                whiteStones={problem.whiteStones}
                selectedPosition={selectedPosition}
                onSelect={setSelectedPosition}
            />

            {selectedPosition && (
                <p className="selected-position">
                    선택한 위치: ({selectedPosition.x}, {selectedPosition.y})
                </p>
            )}

            {isLoggedIn && (
                <div className="problem-actions">
                    <button className="submit-button" onClick={handleSubmit}>
                        제출
                    </button>

                    {isCorrect !== null && (
                        <p className="attempt-result">
                            {isCorrect ? "정답입니다!" : "오답입니다."}
                        </p>
                    )}

                    <div className="manage-actions">
                        <button
                            onClick={() =>
                                navigate(`/problems/${problemId}/edit`)
                            }>
                            문제 수정
                        </button>

                        <button onClick={handleDeleteProblem}>문제 삭제</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProblemDetailPage;
