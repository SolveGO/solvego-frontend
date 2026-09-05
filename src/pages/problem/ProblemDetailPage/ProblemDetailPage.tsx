import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import GoBoard from "../../../components/GoBoard/GoBoard";
import AuthContext from "../../../contexts/AuthContext";
import { authFetch } from "../../../api/api";

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
    owner: boolean;
};

type AttemptResponse = {
    isCorrect: boolean;
};

type AiAnalyzeResponse = {
    bestMove: Position;
    selectedMove: Position;
    bestWinRate: number;
    selectedWinRate: number;
    winRateLoss: number;
};

function ProblemDetailPage() {
    const { problemId } = useParams();
    const navigate = useNavigate();
    const { isLoggedIn } = useContext(AuthContext);

    const [problem, setProblem] = useState<ProblemDetail | null>(null);

    const [selectedPosition, setSelectedPosition] = useState<Position | null>(
        null,
    );

    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

    const [aiAnalysis, setAiAnalysis] = useState<AiAnalyzeResponse | null>(
        null,
    );

    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        async function fetchProblem() {
            const response = await authFetch(`/api/problems/${problemId}`);

            const data: ProblemDetail = await response.json();

            setProblem(data);
        }

        fetchProblem();
    }, [problemId]);

    function handleSelect(position: Position) {
        setSelectedPosition(position);
        setIsCorrect(null);
        setAiAnalysis(null);
    }

    async function handleDeleteProblem() {
        const confirmed = window.confirm("정말 이 문제를 삭제하시겠습니까?");

        if (!confirmed) {
            return;
        }

        const response = await authFetch(`/api/problems/${problemId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
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
            alert("풀이 제출에 실패했습니다.");
            return;
        }

        const data: AttemptResponse = await response.json();

        setIsCorrect(data.isCorrect);
        setAiAnalysis(null);
    }

    async function handleAiAnalyze() {
        if (problem === null || selectedPosition === null) {
            return;
        }

        setIsAiLoading(true);

        try {
            const response = await authFetch("/api/ai/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    blackStones: problem.blackStones,
                    whiteStones: problem.whiteStones,
                    nextPlayer: problem.nextPlayer,
                    selectedPosition,
                }),
            });

            if (!response.ok) {
                if (response.status === 502) {
                    alert("AI 서버에 연결할 수 없습니다.");
                    return;
                }

                if (response.status === 504) {
                    alert("AI 분석 시간이 초과되었습니다.");
                    return;
                }

                alert("AI 분석에 실패했습니다.");
                return;
            }

            const data: AiAnalyzeResponse = await response.json();

            setAiAnalysis(data);
        } finally {
            setIsAiLoading(false);
        }
    }

    if (problem === null) {
        return <p>불러오는 중...</p>;
    }

    return (
        <div className="problem-detail-page">
            <div className="problem-content">
                <div className="problem-header">
                    <span className="problem-detail-number">
                        #{problem.problemId}
                    </span>

                    <div className="problem-title-row">
                        <h1>{problem.title}</h1>

                        {isLoggedIn && problem.owner && (
                            <div className="manage-actions">
                                <button
                                    onClick={() =>
                                        navigate(`/problems/${problemId}/edit`)
                                    }>
                                    문제 수정
                                </button>

                                <button onClick={handleDeleteProblem}>
                                    문제 삭제
                                </button>
                            </div>
                        )}
                    </div>

                    <p className="problem-author">
                        작성자 {problem.creatorName}
                    </p>

                    <p className="problem-description">{problem.description}</p>
                </div>

                <div className="problem-solving-section">
                    <div className="board-area">
                        <GoBoard
                            blackStones={problem.blackStones}
                            whiteStones={problem.whiteStones}
                            selectedPosition={selectedPosition}
                            aiRecommendedPosition={aiAnalysis?.bestMove}
                            selectedStone={problem.nextPlayer}
                            onSelect={handleSelect}
                        />

                        {isLoggedIn && (
                            <div className="solve-actions">
                                <div className="board-submit-row">
                                    <button
                                        className="submit-button"
                                        onClick={handleSubmit}
                                        disabled={selectedPosition === null}>
                                        제출
                                    </button>

                                    {isCorrect !== null && (
                                        <span
                                            className={
                                                isCorrect
                                                    ? "submit-result submit-result-correct"
                                                    : "submit-result submit-result-wrong"
                                            }>
                                            {isCorrect
                                                ? "정답입니다!"
                                                : "오답입니다."}
                                        </span>
                                    )}
                                </div>

                                {isCorrect !== null && (
                                    <div className="ai-action">
                                        <button
                                            className="ai-analyze-button"
                                            onClick={handleAiAnalyze}
                                            disabled={isAiLoading}>
                                            {isAiLoading
                                                ? "AI 분석 중..."
                                                : "내 수 AI 분석하기"}
                                        </button>

                                        <p className="ai-disclaimer">
                                            AI 분석은 참고용이며 문제의 정답
                                            판정과 별개입니다.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="analysis-panel">
                        {aiAnalysis && (
                            <div className="ai-analysis">
                                <h2>AI 분석</h2>

                                <div className="ai-analysis-summary">
                                    <div className="ai-analysis-row">
                                        <div className="ai-analysis-label-row">
                                            <span>내 수 승률</span>
                                            <strong>
                                                {(
                                                    aiAnalysis.selectedWinRate *
                                                    100
                                                ).toFixed(1)}
                                                %
                                            </strong>
                                        </div>

                                        <div className="ai-winrate-bar">
                                            <div
                                                className="ai-winrate-fill"
                                                style={{
                                                    width: `${aiAnalysis.selectedWinRate * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="ai-analysis-row">
                                        <div className="ai-analysis-label-row">
                                            <span>AI 추천 승률</span>
                                            <strong>
                                                {(
                                                    aiAnalysis.bestWinRate * 100
                                                ).toFixed(1)}
                                                %
                                            </strong>
                                        </div>

                                        <div className="ai-winrate-bar">
                                            <div
                                                className="ai-winrate-fill"
                                                style={{
                                                    width: `${aiAnalysis.bestWinRate * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="ai-analysis-difference">
                                        <span>판세 차이</span>

                                        <strong>
                                            {aiAnalysis.winRateLoss > 0
                                                ? "-"
                                                : ""}
                                            {(
                                                aiAnalysis.winRateLoss * 100
                                            ).toFixed(1)}
                                            %p
                                        </strong>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProblemDetailPage;
