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

type GameMove = {
    player: StoneColor;
    position: Position | null;
};

type AiGameNextMoveResponse = {
    move: Position | null;
    winRate: number;
    scoreLead: number;
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

    const [moves, setMoves] = useState<GameMove[]>([]);

    const [consecutivePasses, setConsecutivePasses] = useState(0);

    const [isGameOver, setIsGameOver] = useState(false);

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

        setMoves([]);

        setConsecutivePasses(0);

        setIsGameOver(false);
    }

    async function requestAiMove(
        currentBlackStones: Position[],
        currentWhiteStones: Position[],
        currentMoves: GameMove[],
        aiColor: StoneColor,
        currentConsecutivePasses: number,
    ) {
        setIsAiThinking(true);

        try {
            const response = await authFetch("/api/ai/game/next-move", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    moves: currentMoves,
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

            const data: AiGameNextMoveResponse = await response.json();

            const currentBlackWinRate = convertToBlackWinRate(
                data.winRate,
                aiColor,
            );

            /*
             * AI PASS
             */
            if (data.move === null) {
                const nextMoves: GameMove[] = [
                    ...currentMoves,
                    {
                        player: aiColor,
                        position: null,
                    },
                ];

                const nextConsecutivePasses = currentConsecutivePasses + 1;

                setMoves(nextMoves);

                setLastMovePosition(null);

                setConsecutivePasses(nextConsecutivePasses);

                setBlackWinRate(currentBlackWinRate);

                setWinRateHistory((prev) => [
                    ...prev,
                    {
                        turn: prev.length + 1,
                        blackWinRate: currentBlackWinRate,
                    },
                ]);

                if (nextConsecutivePasses >= 2) {
                    setIsGameOver(true);
                }

                return;
            }

            /*
             * AI 착수
             */
            const aiMoveResult = playMove(
                currentBlackStones,
                currentWhiteStones,
                data.move,
                aiColor,
            );

            if (aiMoveResult === null) {
                alert("AI가 유효하지 않은 수를 반환했습니다.");
                return;
            }

            const nextMoves: GameMove[] = [
                ...currentMoves,
                {
                    player: aiColor,
                    position: data.move,
                },
            ];

            setBlackStones(aiMoveResult.blackStones);

            setWhiteStones(aiMoveResult.whiteStones);

            setLastMovePosition(data.move);

            setMoves(nextMoves);

            /*
             * 실제 착수가 발생하면 연속 PASS는 끊긴다.
             */
            setConsecutivePasses(0);

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
        if (isAiThinking || isGameOver) {
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

        const nextMoves: GameMove[] = [
            ...moves,
            {
                player: playerColor,
                position,
            },
        ];

        setBlackStones(nextBlackStones);

        setWhiteStones(nextWhiteStones);

        setLastMovePosition(position);

        setMoves(nextMoves);

        /*
         * 사용자가 실제로 착수했으므로
         * 이전 PASS 기록은 끊긴다.
         */
        setConsecutivePasses(0);

        const aiColor = getAiColor(playerColor);

        await requestAiMove(
            nextBlackStones,
            nextWhiteStones,
            nextMoves,
            aiColor,
            0,
        );
    }

    async function handlePass() {
        if (isAiThinking || isGameOver) {
            return;
        }

        const nextMoves: GameMove[] = [
            ...moves,
            {
                player: playerColor,
                position: null,
            },
        ];

        const nextConsecutivePasses = consecutivePasses + 1;

        setMoves(nextMoves);

        setLastMovePosition(null);

        setConsecutivePasses(nextConsecutivePasses);

        /*
         * 직전에 AI가 PASS했다면
         * 사용자 PASS로 2연속 PASS가 되어 대국 종료.
         */
        if (nextConsecutivePasses >= 2) {
            setIsGameOver(true);
            return;
        }

        const aiColor = getAiColor(playerColor);

        await requestAiMove(
            blackStones,
            whiteStones,
            nextMoves,
            aiColor,
            nextConsecutivePasses,
        );
    }

    async function handleStartGame(color: StoneColor) {
        /*
         * AI 응답 대기 중에는 새 대국 시작을 막는다.
         */
        if (isAiThinking) {
            return;
        }

        setPlayerColor(color);

        resetBoard();

        /*
         * 내가 흑이면 내가 첫 수를 둔다.
         */
        if (color === "BLACK") {
            return;
        }

        /*
         * 내가 백이면 AI가 흑으로 첫 수를 둔다.
         */
        await requestAiMove([], [], [], "BLACK", 0);
    }

    return (
        <div className="ai-play-page">
            <div className="ai-play-header">
                <h1>AI 대국</h1>

                <div className="ai-play-start-buttons">
                    <button
                        className="ai-play-pass-button"
                        onClick={handlePass}
                        disabled={isAiThinking || isGameOver}>
                        PASS
                    </button>

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
                        isAiThinking || isGameOver
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

                    {isGameOver ? (
                        <div className="game-over-message">
                            <strong>대국 종료</strong>
                            <p>흑과 백이 연속으로 PASS했습니다.</p>
                        </div>
                    ) : blackWinRate === null ? (
                        <p className="position-empty">
                            {isAiThinking
                                ? "AI가 생각하고 있습니다."
                                : "첫 수를 두어주세요."}
                        </p>
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
