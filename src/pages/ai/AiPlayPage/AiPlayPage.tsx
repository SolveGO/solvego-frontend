import { useRef, useState } from "react";

import GoBoard from "../../../components/GoBoard/GoBoard";

import {
    AiApiError,
    requestAiExplanation,
    requestAiNextMove,
    type AiCandidate,
    type AiExplanation,
    type AiGameNextMoveResponse,
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

type AiTurn = {
    blackStones: Position[];
    whiteStones: Position[];
    moves: GameMove[];
    aiColor: StoneColor;
    consecutivePasses: number;
};

type GamePhase =
    | { status: "READY" | "PLAYER_TURN" | "ENDED" }
    | { status: "AI_THINKING"; turn: AiTurn }
    | { status: "AI_FAILED"; turn: AiTurn; message: string };

type ExplanationState =
    | { status: "IDLE" }
    | { status: "LOADING"; token: string }
    | { status: "SUCCESS"; token: string; data: AiExplanation }
    | { status: "ERROR"; token: string; message: string };

function isBoardPosition(value: unknown): value is Position {
    if (!value || typeof value !== "object") return false;
    const position = value as Position;
    return Number.isInteger(position.x) && Number.isInteger(position.y) &&
        position.x >= 0 && position.x < 19 && position.y >= 0 && position.y < 19;
}

function isValidCandidate(value: unknown, expectedRank: number): value is AiCandidate {
    if (!value || typeof value !== "object") return false;
    const candidate = value as AiCandidate;
    const moveIsValid = candidate.moveType === "PASS"
        ? candidate.move === null
        : candidate.moveType === "PLAY" && isBoardPosition(candidate.move);
    return candidate.id === `c${expectedRank}` && candidate.rank === expectedRank &&
        moveIsValid && Number.isFinite(candidate.winRate) &&
        candidate.winRate >= 0 && candidate.winRate <= 1 &&
        Number.isFinite(candidate.scoreLead) && Number.isInteger(candidate.visits) &&
        candidate.visits >= 0 && Array.isArray(candidate.pv) &&
        candidate.pv.every((move) => move === null || isBoardPosition(move));
}

// JSON 응답은 TypeScript 타입만으로 보장되지 않는다.
function isValidAiResponse(
    value: unknown,
    turn: AiTurn,
): value is AiGameNextMoveResponse {
    if (!value || typeof value !== "object") {
        return false;
    }
    const data = value as AiGameNextMoveResponse;
    if (
        !Number.isFinite(data.winRate) ||
        data.winRate < 0 || data.winRate > 1 ||
        !Number.isFinite(data.scoreLead) ||
        typeof data.gameEnded !== "boolean"
    ) {
        return false;
    }

    const hasCandidates = data.candidates !== undefined;
    const hasEvidenceToken = data.evidenceToken !== undefined;
    if (hasCandidates !== hasEvidenceToken) return false;
    if (hasCandidates) {
        if (!Array.isArray(data.candidates) || data.candidates.length < 1 ||
            data.candidates.length > 3 || typeof data.evidenceToken !== "string" ||
            data.evidenceToken.length === 0 ||
            !data.candidates.every((candidate, index) =>
                isValidCandidate(candidate, index + 1))) return false;
        if (data.endReason !== "AI_RESIGN") {
            const best = data.candidates[0];
            if (best.moveType !== data.moveType ||
                (best.move === null) !== (data.move === null) ||
                (best.move !== null && data.move !== null &&
                    (best.move.x !== data.move.x || best.move.y !== data.move.y))) return false;
        }
    }

    if (data.gameEnded) {
        if (data.endReason === "AI_RESIGN") {
            return (
                data.moveType === null && data.move === null &&
                data.result === "PLAYER_WIN"
            );
        }
        const expectedResult = data.scoreLead > 0
            ? "AI_WIN"
            : data.scoreLead < 0 ? "PLAYER_WIN" : "DRAW";
        return (
            data.endReason === "DOUBLE_PASS" &&
            data.moveType === "PASS" && data.move === null &&
            data.result === expectedResult &&
            turn.consecutivePasses === 1 &&
            turn.moves.at(-1)?.moveType === "PASS"
        );
    }

    if (data.result !== null || data.endReason !== null) {
        return false;
    }
    if (data.moveType === "PASS") {
        return data.move === null && turn.consecutivePasses === 0;
    }
    const move = data.move;
    return (
        data.moveType === "PLAY" &&
        move !== null && typeof move === "object" &&
        Number.isInteger(move.x) && Number.isInteger(move.y) &&
        move.x >= 0 && move.x < 19 && move.y >= 0 && move.y < 19
    );
}

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

    const [phase, setPhase] = useState<GamePhase>({ status: "READY" });
    // React의 다음 렌더 전에도 중복 요청을 차단한다.
    const requestInFlight = useRef(false);
    const isAiThinking = phase.status === "AI_THINKING";
    const isGameOver = phase.status === "ENDED";
    const isGameStarted = phase.status !== "READY" && !isGameOver;
    const canPlay = phase.status === "PLAYER_TURN";
    const canSelectBoard = phase.status === "READY" || canPlay;

    const [isPositionOpen, setIsPositionOpen] = useState(true);

    const [playerWinRate, setPlayerWinRate] = useState<number | null>(null);

    const [winRateHistory, setWinRateHistory] = useState<WinRatePoint[]>([]);

    const [moves, setMoves] = useState<GameMove[]>([]);

    const [consecutivePasses, setConsecutivePasses] = useState(0);

    const [gameResult, setGameResult] = useState<GameResult | null>(null);

    const [gameEndReason, setGameEndReason] =
        useState<FrontGameEndReason | null>(null);

    const [lastAiScoreLead, setLastAiScoreLead] = useState<number | null>(null);
    const [lastAiCandidates, setLastAiCandidates] = useState<AiCandidate[]>([]);
    const [lastEvidenceToken, setLastEvidenceToken] = useState<string | null>(null);
    const [showCandidateMarkers, setShowCandidateMarkers] = useState(false);
    const [explanationState, setExplanationState] =
        useState<ExplanationState>({ status: "IDLE" });

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

        setPhase({ status: "READY" });

        setGameResult(null);
        setGameEndReason(null);

        setLastAiScoreLead(null);
        clearExplanation();
    }

    function clearExplanation() {
        setLastAiCandidates([]);
        setLastEvidenceToken(null);
        setShowCandidateMarkers(false);
        setExplanationState({ status: "IDLE" });
    }

    async function loadExplanation(token: string) {
        if (
            (explanationState.status === "LOADING" ||
                explanationState.status === "SUCCESS") &&
            explanationState.token === token
        ) return;

        setExplanationState({ status: "LOADING", token });
        try {
            const data = await requestAiExplanation(token);
            setExplanationState((current) =>
                lastEvidenceToken === token && current.status === "LOADING"
                    ? data.source === "TEMPLATE"
                        ? {
                            status: "ERROR",
                            token,
                            message: data.explanation.summary,
                        }
                        : { status: "SUCCESS", token, data }
                    : current,
            );
        } catch {
            setExplanationState((current) =>
                current.status === "LOADING" && current.token === token
                    ? { status: "ERROR", token, message: "해설을 불러오지 못했습니다." }
                    : current,
            );
        }
    }

    function handleExplain() {
        if (!lastEvidenceToken || lastAiCandidates.length === 0) return;

        if (showCandidateMarkers) {
            setShowCandidateMarkers(false);
            return;
        }

        setShowCandidateMarkers(true);
        void loadExplanation(lastEvidenceToken);
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
        if (requestInFlight.current) return;
        requestInFlight.current = true;
        const turn: AiTurn = {
            blackStones: currentBlackStones,
            whiteStones: currentWhiteStones,
            moves: currentMoves,
            aiColor,
            consecutivePasses: currentConsecutivePasses,
        };
        setPhase({ status: "AI_THINKING", turn });

        try {
            const data = await requestAiNextMove(turn.moves);
            if (!isValidAiResponse(data, turn)) {
                throw new Error("AI가 올바르지 않은 응답을 반환했습니다.");
            }

            // 상태를 변경하기 전에 착수 결과까지 계산한다.
            const board = data.moveType === "PLAY"
                ? playMove(
                    turn.blackStones, turn.whiteStones, data.move!, turn.aiColor,
                )
                : { blackStones: turn.blackStones, whiteStones: turn.whiteStones };
            if (board === null) {
                throw new Error("AI가 유효하지 않은 수를 반환했습니다.");
            }
            const nextMoves: GameMove[] = data.moveType === null ? turn.moves : [
                ...turn.moves,
                { player: turn.aiColor, moveType: data.moveType, position: data.move },
            ];

            setBlackStones(board.blackStones);
            setWhiteStones(board.whiteStones);
            setMoves(nextMoves);
            if (data.moveType !== null) {
                setLastMovePosition(data.move);
            }
            setConsecutivePasses(
                data.moveType === "PASS" ? turn.consecutivePasses + 1 : 0,
            );
            updateWinRate(data.winRate);
            setLastAiScoreLead(data.scoreLead);
            setLastAiCandidates(data.candidates ?? []);
            setLastEvidenceToken(data.evidenceToken ?? null);
            setShowCandidateMarkers(false);
            setExplanationState({ status: "IDLE" });
            setGameResult(data.result);
            setGameEndReason(data.endReason);
            setPhase({ status: data.gameEnded ? "ENDED" : "PLAYER_TURN" });
        } catch (error) {
            let message = "AI의 수를 가져오지 못했습니다.";
            if (error instanceof AiApiError && error.status === 502) {
                message = "AI 서버에 연결할 수 없습니다.";
            } else if (error instanceof AiApiError && error.status === 504) {
                message = "AI 응답 시간이 초과되었습니다.";
            }
            setPhase({ status: "AI_FAILED", turn, message });
        } finally {
            // 요청 종료는 사용자 차례로의 전환을 의미하지 않는다.
            requestInFlight.current = false;
        }
    }

    async function handleRetry() {
        if (phase.status !== "AI_FAILED" || requestInFlight.current) return;
        const turn = phase.turn;
        await requestAiMove(
            turn.blackStones, turn.whiteStones, turn.moves,
            turn.aiColor, turn.consecutivePasses,
        );
    }

    async function handleBoardSelect(position: Position) {
        if (!canSelectBoard || requestInFlight.current) {
            return;
        }
        clearExplanation();

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
            setPhase({ status: "PLAYER_TURN" });
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
        if (!canPlay || requestInFlight.current) {
            return;
        }
        clearExplanation();

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

            setPhase({ status: "ENDED" });

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
        if ((!canPlay && phase.status !== "AI_FAILED") || requestInFlight.current) {
            return;
        }

        setGameResult("AI_WIN");

        setGameEndReason("PLAYER_RESIGN");

        setPhase({ status: "ENDED" });
    }

    async function handleStartGame(color: StoneColor) {
        if (requestInFlight.current) {
            return;
        }

        setPlayerColor(color);

        resetBoard();

        setPhase({ status: "PLAYER_TURN" });

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
                                disabled={!canPlay}>
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

            {phase.status === "AI_FAILED" && (
                <div role="alert">
                    <p>
                        {phase.message} AI 차례입니다. 다시 시도해주세요.
                    </p>
                    <button onClick={handleRetry}>AI 요청 재시도</button>
                </div>
            )}

            <div className="ai-play-content">
                <div
                    className={
                        !canSelectBoard
                            ? "ai-play-board-area disabled"
                            : "ai-play-board-area"
                    }>
                    <GoBoard
                        blackStones={blackStones}
                        whiteStones={whiteStones}
                        lastMovePosition={lastMovePosition}
                        candidateMarkers={
                            showCandidateMarkers
                                ? lastAiCandidates.flatMap((candidate) =>
                                    candidate.move === null ? [] : [{
                                        position: candidate.move,
                                        label: String.fromCharCode(64 + candidate.rank),
                                    }])
                                : []
                        }
                        onSelect={handleBoardSelect}
                    />
                </div>

                <div className="ai-play-side-panels">
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
                                        : phase.status === "AI_FAILED"
                                          ? "AI 응답을 기다리고 있습니다."
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

                {lastEvidenceToken && lastAiCandidates.length > 0 && !isAiThinking && (
                    <section className="ai-explanation-panel">
                        <button
                            className="ai-explanation-button"
                            type="button"
                            onClick={handleExplain}
                            aria-expanded={showCandidateMarkers}>
                            {showCandidateMarkers ? "해설 닫기" : "왜 이 수?"}
                        </button>

                        {showCandidateMarkers && (
                            <div className="ai-explanation-content">
                                <div className="ai-candidate-list">
                                    {lastAiCandidates.map((candidate) => (
                                        <div className="ai-candidate-card" key={candidate.id}>
                                            <strong>
                                                {String.fromCharCode(64 + candidate.rank)}
                                            </strong>
                                            <span>예상 승률 {(candidate.winRate * 100).toFixed(1)}%</span>
                                            <span>예상 집 차이 {candidate.scoreLead >= 0 ? "+" : ""}{candidate.scoreLead.toFixed(1)}</span>
                                        </div>
                                    ))}
                                </div>

                                {explanationState.status === "LOADING" && <p>해설을 만들고 있습니다.</p>}
                                {explanationState.status === "ERROR" && (
                                    <div role="alert">
                                        <p>{explanationState.message}</p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (lastEvidenceToken) {
                                                    void loadExplanation(lastEvidenceToken);
                                                }
                                            }}>
                                            다시 시도
                                        </button>
                                    </div>
                                )}
                                {explanationState.status === "SUCCESS" && (
                                    <div className="ai-explanation-text">
                                        <p>{explanationState.data.explanation.summary}</p>
                                        {explanationState.data.explanation.comparison && (
                                            <p>{explanationState.data.explanation.comparison}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                )}
                </div>
            </div>
        </div>
    );
}

export default AiPlayPage;
