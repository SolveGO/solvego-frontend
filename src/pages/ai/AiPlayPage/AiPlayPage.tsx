import { useState } from "react";

import GoBoard from "../../../components/GoBoard/GoBoard";

import {
    AiApiError,
    requestAiNextMove,
    type GameEndReason,
    type GameMove,
    type GameResult,
    type Position,
    type StoneColor,
} from "../../../api/aiApi";

import { playMove } from "../../../utils/goRules";

import "./AiPlayPage.css";

type WinRatePoint = {
    turn: number;
    playerWinRate: number;
};

type FrontGameEndReason = GameEndReason | "PLAYER_RESIGN";

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
            return `${getX(index)},${getY(item.playerWinRate)}`;
        })
        .join(" ");

    return (
        <div className="winrate-chart">
            <div className="winrate-chart-area">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    role="img"
                    aria-label="사용자 승률 변화 그래프">
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
                            cy={getY(item.playerWinRate)}
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

    const [isGameStarted, setIsGameStarted] = useState(false);

    const [isPositionOpen, setIsPositionOpen] = useState(true);

    const [playerWinRate, setPlayerWinRate] = useState<number | null>(null);

    const [winRateHistory, setWinRateHistory] = useState<WinRatePoint[]>([]);

    const [moves, setMoves] = useState<GameMove[]>([]);

    const [consecutivePasses, setConsecutivePasses] = useState(0);

    const [isGameOver, setIsGameOver] = useState(false);

    const [gameResult, setGameResult] = useState<GameResult | null>(null);

    const [gameEndReason, setGameEndReason] =
        useState<FrontGameEndReason | null>(null);

    const [lastAiScoreLead, setLastAiScoreLead] = useState<number | null>(null);

    function getAiColor(currentPlayerColor: StoneColor): StoneColor {
        return currentPlayerColor === "BLACK" ? "WHITE" : "BLACK";
    }

    function determineResultFromAiScoreLead(scoreLead: number): GameResult {
        if (scoreLead > 0) {
            return "AI_WIN";
        }

        if (scoreLead < 0) {
            return "PLAYER_WIN";
        }

        return "DRAW";
    }

    function getGameResultMessage() {
        if (gameResult === "PLAYER_WIN") {
            return "승리했습니다.";
        }

        if (gameResult === "AI_WIN") {
            return "AI가 승리했습니다.";
        }

        if (gameResult === "DRAW") {
            return "무승부입니다.";
        }

        return "";
    }

    function getGameEndReasonMessage() {
        if (gameEndReason === "AI_RESIGN") {
            return "AI가 기권했습니다.";
        }

        if (gameEndReason === "DOUBLE_PASS") {
            return "흑과 백이 연속으로 PASS했습니다.";
        }

        if (gameEndReason === "PLAYER_RESIGN") {
            return "기권했습니다.";
        }

        return "";
    }

    function resetBoard() {
        setBlackStones([]);
        setWhiteStones([]);

        setLastMovePosition(null);

        setPlayerWinRate(null);
        setWinRateHistory([]);

        setMoves([]);

        setConsecutivePasses(0);

        setIsGameOver(false);

        setGameResult(null);
        setGameEndReason(null);

        setLastAiScoreLead(null);
    }

    function updateWinRate(aiWinRate: number) {
        const currentPlayerWinRate = 1 - aiWinRate;

        setPlayerWinRate(currentPlayerWinRate);

        setWinRateHistory((prev) => [
            ...prev,
            {
                turn: prev.length + 1,
                playerWinRate: currentPlayerWinRate,
            },
        ]);
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
            const data = await requestAiNextMove(currentMoves);

            /*
             * 백엔드의 winRate는 AI 기준.
             * 화면에서는 항상 사용자 기준으로 변환한다.
             */
            updateWinRate(data.winRate);

            setLastAiScoreLead(data.scoreLead);

            /*
             * 대국 종료
             */
            if (data.gameEnded) {
                /*
                 * AI가 두 번째 PASS를 한 경우
                 * AI의 PASS도 수순에 추가한다.
                 */
                if (
                    data.endReason === "DOUBLE_PASS" &&
                    data.moveType === "PASS"
                ) {
                    const nextMoves: GameMove[] = [
                        ...currentMoves,
                        {
                            player: aiColor,
                            moveType: "PASS",
                            position: null,
                        },
                    ];

                    setMoves(nextMoves);

                    setLastMovePosition(null);

                    setConsecutivePasses(currentConsecutivePasses + 1);
                }

                setGameResult(data.result);
                setGameEndReason(data.endReason);

                setIsGameOver(true);
                setIsGameStarted(false);

                return;
            }

            /*
             * AI PASS
             */
            if (data.moveType === "PASS") {
                const nextMoves: GameMove[] = [
                    ...currentMoves,
                    {
                        player: aiColor,
                        moveType: "PASS",
                        position: null,
                    },
                ];

                setMoves(nextMoves);

                setLastMovePosition(null);

                setConsecutivePasses(currentConsecutivePasses + 1);

                return;
            }

            /*
             * 종료되지 않은 정상 응답은
             * PLAY여야 한다.
             */
            if (data.moveType !== "PLAY") {
                alert("AI가 올바르지 않은 응답을 반환했습니다.");

                return;
            }

            /*
             * PLAY인데 좌표가 없으면
             * 잘못된 응답이다.
             */
            if (data.move === null) {
                alert("AI가 착수 좌표를 반환하지 않았습니다.");

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
                    moveType: "PLAY",
                    position: data.move,
                },
            ];

            setBlackStones(aiMoveResult.blackStones);

            setWhiteStones(aiMoveResult.whiteStones);

            setLastMovePosition(data.move);

            setMoves(nextMoves);

            /*
             * 실제 착수가 발생하면
             * 연속 PASS는 끊긴다.
             */
            setConsecutivePasses(0);
        } catch (error) {
            if (error instanceof AiApiError) {
                if (error.status === 502) {
                    alert("AI 서버에 연결할 수 없습니다.");

                    return;
                }

                if (error.status === 504) {
                    alert("AI 응답 시간이 초과되었습니다.");

                    return;
                }
            }

            alert("AI의 수를 가져오지 못했습니다.");
        } finally {
            setIsAiThinking(false);
        }
    }

    async function handleBoardSelect(position: Position) {
        if (isAiThinking || isGameOver) {
            return;
        }

        let currentPlayerColor = playerColor;

        let currentBlackStones = blackStones;

        let currentWhiteStones = whiteStones;

        let currentMoves = moves;

        /*
         * 게임 시작 전에 바둑판을 바로 클릭하면
         * 자동으로 흑으로 새 대국 시작
         */
        if (!isGameStarted) {
            currentPlayerColor = "BLACK";

            currentBlackStones = [];
            currentWhiteStones = [];
            currentMoves = [];

            resetBoard();

            setPlayerColor("BLACK");
            setIsGameStarted(true);
        }

        /*
         * 사용자 착수
         */
        const userMoveResult = playMove(
            currentBlackStones,
            currentWhiteStones,
            position,
            currentPlayerColor,
        );

        if (userMoveResult === null) {
            return;
        }

        const nextBlackStones = userMoveResult.blackStones;

        const nextWhiteStones = userMoveResult.whiteStones;

        const nextMoves: GameMove[] = [
            ...currentMoves,
            {
                player: currentPlayerColor,
                moveType: "PLAY",
                position,
            },
        ];

        setBlackStones(nextBlackStones);

        setWhiteStones(nextWhiteStones);

        setLastMovePosition(position);

        setMoves(nextMoves);

        setConsecutivePasses(0);

        const aiColor = getAiColor(currentPlayerColor);

        await requestAiMove(
            nextBlackStones,
            nextWhiteStones,
            nextMoves,
            aiColor,
            0,
        );
    }

    async function handlePass() {
        if (isAiThinking || isGameOver || !isGameStarted) {
            return;
        }

        const nextMoves: GameMove[] = [
            ...moves,
            {
                player: playerColor,
                moveType: "PASS",
                position: null,
            },
        ];

        const nextConsecutivePasses = consecutivePasses + 1;

        setMoves(nextMoves);

        setLastMovePosition(null);

        setConsecutivePasses(nextConsecutivePasses);

        /*
         * AI가 직전에 PASS했고
         * 사용자가 두 번째 PASS
         */
        if (nextConsecutivePasses >= 2) {
            const result =
                lastAiScoreLead === null
                    ? null
                    : determineResultFromAiScoreLead(lastAiScoreLead);

            setGameResult(result);

            setGameEndReason("DOUBLE_PASS");

            setIsGameOver(true);
            setIsGameStarted(false);

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

    function handleResign() {
        if (isAiThinking || isGameOver || !isGameStarted) {
            return;
        }

        setGameResult("AI_WIN");

        setGameEndReason("PLAYER_RESIGN");

        setIsGameOver(true);
        setIsGameStarted(false);
    }

    async function handleStartGame(color: StoneColor) {
        if (isAiThinking) {
            return;
        }

        setPlayerColor(color);

        resetBoard();

        setIsGameStarted(true);

        /*
         * 사용자가 흑이면
         * 사용자가 먼저 착수
         */
        if (color === "BLACK") {
            return;
        }

        /*
         * 사용자가 백이면
         * AI가 흑으로 먼저 착수
         */
        await requestAiMove([], [], [], "BLACK", 0);
    }

    return (
        <div className="ai-play-page">
            <div className="ai-play-header">
                <h1>AI 대국</h1>

                <div className="ai-play-start-buttons">
                    {!isGameStarted ? (
                        <>
                            <button
                                className={
                                    playerColor === "BLACK"
                                        ? "black-active"
                                        : ""
                                }
                                onClick={() => handleStartGame("BLACK")}
                                disabled={isAiThinking}>
                                흑으로 시작
                            </button>

                            <button
                                className={
                                    playerColor === "WHITE"
                                        ? "white-active"
                                        : ""
                                }
                                onClick={() => handleStartGame("WHITE")}
                                disabled={isAiThinking}>
                                백으로 시작
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                className="ai-play-pass-button"
                                onClick={handlePass}
                                disabled={isAiThinking || isGameOver}>
                                PASS
                            </button>

                            <button
                                onClick={handleResign}
                                disabled={isAiThinking || isGameOver}>
                                기권
                            </button>
                        </>
                    )}
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

                <div
                    className={`position-panel ${
                        isPositionOpen ? "open" : "closed"
                    }`}>
                    <button
                        className="position-panel-toggle"
                        type="button"
                        onClick={() => setIsPositionOpen((prev) => !prev)}
                        aria-expanded={isPositionOpen}>
                        <span>형세</span>

                        <span className="position-panel-arrow">
                            {isPositionOpen ? "▲" : "▼"}
                        </span>
                    </button>

                    {isPositionOpen && (
                        <div className="position-panel-content">
                            {isGameOver ? (
                                <div className="game-over-message">
                                    <strong>대국 종료</strong>

                                    <p>{getGameResultMessage()}</p>

                                    <p>{getGameEndReasonMessage()}</p>
                                </div>
                            ) : playerWinRate === null ? (
                                <p className="position-empty">
                                    {isAiThinking
                                        ? "AI가 생각하고 있습니다."
                                        : isGameStarted
                                          ? "첫 수를 두어주세요."
                                          : "바둑판을 클릭하면 흑으로 바로 시작할 수 있습니다."}
                                </p>
                            ) : (
                                <>
                                    <div className="position-rate-row">
                                        <span>내 승률</span>

                                        <strong>
                                            {(playerWinRate * 100).toFixed(1)}%
                                        </strong>
                                    </div>

                                    <div className="position-bar">
                                        <div
                                            className="position-bar-fill"
                                            style={{
                                                width: `${
                                                    playerWinRate * 100
                                                }%`,
                                            }}
                                        />
                                    </div>

                                    <WinRateChart history={winRateHistory} />
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AiPlayPage;
