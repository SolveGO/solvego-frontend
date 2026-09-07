import { authFetch } from "./api";

export type Position = {
    x: number;
    y: number;
};

export type StoneColor = "BLACK" | "WHITE";

export type MoveType = "PLAY" | "PASS";

export type GameMove = {
    player: StoneColor;
    moveType: MoveType;
    position: Position | null;
};

export type GameResult = "PLAYER_WIN" | "AI_WIN" | "DRAW";

export type GameEndReason = "AI_RESIGN" | "DOUBLE_PASS";

export type AiGameNextMoveResponse = {
    moveType: MoveType | null;
    move: Position | null;
    winRate: number;
    scoreLead: number;
    gameEnded: boolean;
    result: GameResult | null;
    endReason: GameEndReason | null;
};

export class AiApiError extends Error {
    status: number;

    constructor(status: number) {
        super(`AI API request failed: ${status}`);
        this.status = status;
    }
}

export async function requestAiNextMove(
    moves: GameMove[],
): Promise<AiGameNextMoveResponse> {
    const response = await authFetch("/api/ai/game/next-move", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            moves,
        }),
    });

    if (!response.ok) {
        throw new AiApiError(response.status);
    }

    return response.json();
}
