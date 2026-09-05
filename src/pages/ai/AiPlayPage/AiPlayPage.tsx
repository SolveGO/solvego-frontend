import { useState } from "react";

import GoBoard from "../../../components/GoBoard/GoBoard";
import { authFetch } from "../../../api/api";
import { playMove } from "../../../utils/goRules";

import "./AiPlayPage.css";

type Position = {
    x: number;
    y: number;
};

type StoneColor = "BLACK" | "WHITE";

type AiRecommendResponse = {
    bestMove: Position;
    bestWinRate: number;
};

type WinRatePoint = {
    turn: number;
    blackWinRate: number;
};

function WinRateChart({ history }: { history: WinRatePoint[] }) {
    const width = 260;
    const height = 140;

    const paddingLeft = 12;
    const paddingRight = 12;
    const paddingTop = 12;
    const paddingBottom = 12;

    if (history.length === 0) {
        return null;
    }

    function getX(index: number) {
        if (history.length === 1) {
            return width / 2;
        }

        return (
            paddingLeft +
            (index / (history.length - 1)) *
                (width - paddingLeft - paddingRight)
        );
    }

    function getY(rate: number) {
        return paddingTop + (1 - rate) * (height - paddingTop - paddingBottom);
    }

    const points = history
        .map((item, index) => {
            return `${getX(index)},${getY(item.blackWinRate)}`;
        })
        .join(" ");

    return (
        <div className="winrate-chart">
            <div className="winrate-chart-area">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    role="img"
                    aria-label="흑 승률 변화 그래프">
                    {history.length >= 2 && (
                        <polyline
                            points={points}
                            className="winrate-chart-line"
                        />
                    )}

                    {history.map((item, index) => (
                        <circle
                            key={item.turn}
                            cx={getX(index)}
                            cy={getY(item.blackWinRate)}
                            r="3"
                            className="winrate-chart-point"
                        />
                    ))}
                </svg>
            </div>
        </div>
    );
}

function AiPlayPage() {
    const [blackStones, setBlackStones] = useState<Position[]>([]);

    const [whiteStones, setWhiteStones] = useState<Position[]>([]);

    const [lastMovePosition, setLastMovePosition] = useState<Position | null>(
        null,
    );

    const [playerColor, setPlayerColor] = useState<StoneColor>("BLACK");

    const [isAiThinking, setIsAiThinking] = useState(false);

    const [blackWinRate, setBlackWinRate] = useState<number | null>(null);

    const [winRateHistory, setWinRateHistory] = useState<WinRatePoint[]>([]);

    function getAiColor(currentPlayerColor: StoneColor): StoneColor {
        return currentPlayerColor === "BLACK" ? "WHITE" : "BLACK";
    }

    function convertToBlackWinRate(winRate: number, perspective: StoneColor) {
        if (perspective === "BLACK") {
            return winRate;
        }

        return 1 - winRate;
    }

    function resetBoard() {
        setBlackStones([]);
        setWhiteStones([]);

        setLastMovePosition(null);

        setBlackWinRate(null);
        setWinRateHistory([]);
    }

    async function requestAiMove(
        currentBlackStones: Position[],
        currentWhiteStones: Position[],
        aiColor: StoneColor,
    ) {
        setIsAiThinking(true);

        try {
            const response = await authFetch("/api/ai/recommend", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    blackStones: currentBlackStones,
                    whiteStones: currentWhiteStones,
                    nextPlayer: aiColor,
                }),
            });

            if (!response.ok) {
                if (response.status === 502) {
                    alert("AI 서버에 연결할 수 없습니다.");
                    return;
                }

                if (response.status === 504) {
                    alert("AI 응답 시간이 초과되었습니다.");
                    return;
                }

                alert("AI의 수를 가져오지 못했습니다.");

                return;
            }

            const data: AiRecommendResponse = await response.json();

            const aiMoveResult = playMove(
                currentBlackStones,
                currentWhiteStones,
                data.bestMove,
                aiColor,
            );

            if (aiMoveResult === null) {
                alert("AI가 유효하지 않은 수를 반환했습니다.");
                return;
            }

            setBlackStones(aiMoveResult.blackStones);

            setWhiteStones(aiMoveResult.whiteStones);

            setLastMovePosition(data.bestMove);

            const currentBlackWinRate = convertToBlackWinRate(
                data.bestWinRate,
                aiColor,
            );

            setBlackWinRate(currentBlackWinRate);

            setWinRateHistory((prev) => [
                ...prev,
                {
                    turn: prev.length + 1,
                    blackWinRate: currentBlackWinRate,
                },
            ]);
        } finally {
            setIsAiThinking(false);
        }
    }

    async function handleBoardSelect(position: Position) {
        if (isAiThinking) {
            return;
        }

        const userMoveResult = playMove(
            blackStones,
            whiteStones,
            position,
            playerColor,
        );

        if (userMoveResult === null) {
            return;
        }

        const nextBlackStones = userMoveResult.blackStones;

        const nextWhiteStones = userMoveResult.whiteStones;

        setBlackStones(nextBlackStones);

        setWhiteStones(nextWhiteStones);

        setLastMovePosition(position);

        const aiColor = getAiColor(playerColor);

        await requestAiMove(nextBlackStones, nextWhiteStones, aiColor);
    }

    async function handleStartGame(color: StoneColor) {
        /*
         * AI 응답을 기다리는 동안 다른 대국을 시작하면
         * 이전 요청의 응답이 새 판에 적용될 수 있으므로
         * 클릭 동작만 무시한다.
         *
         * 버튼의 시각적 스타일은 변경하지 않는다.
         */
        if (isAiThinking) {
            return;
        }

        setPlayerColor(color);

        resetBoard();

        // 내가 흑이면 빈 판에서 바로 시작
        if (color === "BLACK") {
            return;
        }

        // 내가 백이면 AI가 흑으로 첫 수
        await requestAiMove([], [], "BLACK");
    }

    return (
        <div className="ai-play-page">
            <div className="ai-play-header">
                <h1>AI 대국</h1>

                <div className="ai-play-start-buttons">
                    <button
                        className={
                            playerColor === "BLACK" ? "black-active" : ""
                        }
                        onClick={() => handleStartGame("BLACK")}>
                        흑으로 시작
                    </button>

                    <button
                        className={
                            playerColor === "WHITE" ? "white-active" : ""
                        }
                        onClick={() => handleStartGame("WHITE")}>
                        백으로 시작
                    </button>
                </div>
            </div>

            <div className="ai-play-content">
                <div
                    className={
                        isAiThinking
                            ? "ai-play-board-area disabled"
                            : "ai-play-board-area"
                    }>
                    <GoBoard
                        blackStones={blackStones}
                        whiteStones={whiteStones}
                        lastMovePosition={lastMovePosition}
                        onSelect={handleBoardSelect}
                    />
                </div>

                <div className="position-panel">
                    <h2>형세</h2>

                    {blackWinRate === null ? (
                        <p className="position-empty">첫 수를 두어주세요.</p>
                    ) : (
                        <>
                            <div className="position-rate-row">
                                <span>흑 승률</span>

                                <strong>
                                    {(blackWinRate * 100).toFixed(1)}%
                                </strong>
                            </div>

                            <div className="position-bar">
                                <div
                                    className="position-bar-fill"
                                    style={{
                                        width: `${blackWinRate * 100}%`,
                                    }}
                                />
                            </div>

                            <WinRateChart history={winRateHistory} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AiPlayPage;
