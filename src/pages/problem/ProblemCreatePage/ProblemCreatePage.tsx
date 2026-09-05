import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

import GoBoard from "../../../components/GoBoard/GoBoard";
import { authFetch } from "../../../api/api";
import AuthContext from "../../../contexts/AuthContext";
import { playMove } from "../../../utils/goRules";

import "./ProblemCreatePage.css";

type Position = {
    x: number;
    y: number;
};

type StoneColor = "BLACK" | "WHITE";
type BoardMode = "PLAY" | "ANSWER";

type BoardHistory = {
    blackStones: Position[];
    whiteStones: Position[];
    nextStone: StoneColor;
    lastPlacedPosition: Position | null;
};

type AiRecommendResponse = {
    bestMove: Position;
    bestWinRate: number;
};

function ProblemCreatePage() {
    const navigate = useNavigate();
    const { logout } = useContext(AuthContext);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    const [blackStones, setBlackStones] = useState<Position[]>([]);
    const [whiteStones, setWhiteStones] = useState<Position[]>([]);

    const [nextStone, setNextStone] = useState<StoneColor>("BLACK");

    const [boardMode, setBoardMode] = useState<BoardMode>("PLAY");

    const [answerPosition, setAnswerPosition] = useState<Position | null>(null);

    const [lastPlacedPosition, setLastPlacedPosition] =
        useState<Position | null>(null);

    const [history, setHistory] = useState<BoardHistory[]>([]);

    const [aiRecommendation, setAiRecommendation] =
        useState<AiRecommendResponse | null>(null);

    const [isAiLoading, setIsAiLoading] = useState(false);

    function isSamePosition(a: Position, b: Position) {
        return a.x === b.x && a.y === b.y;
    }

    function handleBoardSelect(position: Position) {
        if (boardMode === "ANSWER") {
            const occupied =
                blackStones.some((stone) => isSamePosition(stone, position)) ||
                whiteStones.some((stone) => isSamePosition(stone, position));

            if (occupied) {
                alert("돌이 놓여 있는 위치는 정답으로 선택할 수 없습니다.");
                return;
            }

            setAnswerPosition(position);
            return;
        }

        const result = playMove(blackStones, whiteStones, position, nextStone);

        if (result === null) {
            return;
        }

        setHistory((prev) => [
            ...prev,
            {
                blackStones,
                whiteStones,
                nextStone,
                lastPlacedPosition,
            },
        ]);

        setBlackStones(result.blackStones);
        setWhiteStones(result.whiteStones);

        setLastPlacedPosition(position);

        setNextStone(nextStone === "BLACK" ? "WHITE" : "BLACK");

        // 바둑판이 변경되면 기존 AI 추천은 더 이상 유효하지 않음
        setAiRecommendation(null);
    }

    function handleUndo() {
        if (history.length === 0) {
            return;
        }

        const previousState = history[history.length - 1];

        setBlackStones(previousState.blackStones);
        setWhiteStones(previousState.whiteStones);

        setNextStone(previousState.nextStone);

        setLastPlacedPosition(previousState.lastPlacedPosition);

        setHistory((prev) => prev.slice(0, -1));

        // 바둑판이 변경되면 기존 AI 추천 제거
        setAiRecommendation(null);
    }

    function handleAnswerMode() {
        setBoardMode((prev) => (prev === "ANSWER" ? "PLAY" : "ANSWER"));
    }

    async function handleAiRecommend() {
        setIsAiLoading(true);

        try {
            const response = await authFetch("/api/ai/recommend", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    blackStones,
                    whiteStones,
                    nextPlayer: nextStone,
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

                alert("AI 추천에 실패했습니다.");
                return;
            }

            const data: AiRecommendResponse = await response.json();

            setAiRecommendation(data);
        } finally {
            setIsAiLoading(false);
        }
    }

    async function handleCreateProblem() {
        if (title.trim() === "") {
            alert("제목을 입력해주세요.");
            return;
        }

        if (answerPosition === null) {
            alert("정답 위치를 선택해주세요.");
            return;
        }

        const response = await authFetch("/api/problems", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                title,
                description,
                blackStones,
                whiteStones,
                nextPlayer: nextStone,
                answerPosition,
            }),
        });

        if (!response.ok) {
            if (response.status === 401) {
                logout();

                alert("로그인이 만료되었습니다.");

                navigate("/login");

                return;
            }

            alert("문제 등록에 실패했습니다.");

            return;
        }

        navigate("/problems");
    }

    return (
        <div className="problem-create-page">
            <div className="problem-create-content">
                <h1>문제 등록</h1>

                <div className="problem-create-board-section">
                    <div className="problem-create-main">
                        <div className="problem-create-board-area">
                            <GoBoard
                                blackStones={blackStones}
                                whiteStones={whiteStones}
                                selectedPosition={answerPosition}
                                lastMovePosition={lastPlacedPosition}
                                aiRecommendedPosition={
                                    aiRecommendation?.bestMove
                                }
                                onSelect={handleBoardSelect}
                            />

                            <div className="board-mode-buttons">
                                <button
                                    onClick={handleUndo}
                                    disabled={history.length === 0}>
                                    한 수 뒤로
                                </button>

                                <button
                                    className={
                                        boardMode === "ANSWER" ? "active" : ""
                                    }
                                    onClick={handleAnswerMode}>
                                    정답 위치
                                </button>

                                <button
                                    className="ai-recommend-button"
                                    onClick={handleAiRecommend}
                                    disabled={isAiLoading}>
                                    {isAiLoading
                                        ? "AI 추천 중..."
                                        : "AI 추천 수 보기"}
                                </button>
                            </div>

                            <p className="ai-recommend-disclaimer">
                                AI 추천은 참고용이며 정답은 작성자가 직접
                                지정합니다.
                            </p>
                        </div>

                        <div className="problem-create-form">
                            <div className="problem-create-field">
                                <label htmlFor="problem-title">제목</label>

                                <input
                                    id="problem-title"
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="문제 제목을 입력하세요."
                                />
                            </div>

                            <div className="problem-create-field">
                                <label htmlFor="problem-description">
                                    설명
                                </label>

                                <textarea
                                    id="problem-description"
                                    value={description}
                                    onChange={(e) =>
                                        setDescription(e.target.value)
                                    }
                                    placeholder="문제에 대한 설명을 입력하세요."
                                />
                            </div>

                            <button
                                className="problem-create-submit"
                                onClick={handleCreateProblem}>
                                문제 등록
                            </button>
                        </div>
                    </div>

                    <div className="problem-create-side-panel">
                        {aiRecommendation && (
                            <div className="ai-recommendation">
                                <h2>AI 추천</h2>

                                <div className="ai-recommend-row">
                                    <div className="ai-recommend-label-row">
                                        <span>추천 승률</span>

                                        <strong>
                                            {(
                                                aiRecommendation.bestWinRate *
                                                100
                                            ).toFixed(1)}
                                            %
                                        </strong>
                                    </div>

                                    <div className="ai-recommend-winrate-bar">
                                        <div
                                            className="ai-recommend-winrate-fill"
                                            style={{
                                                width: `${
                                                    aiRecommendation.bestWinRate *
                                                    100
                                                }%`,
                                            }}
                                        />
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

export default ProblemCreatePage;
