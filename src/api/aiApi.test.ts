import { beforeEach, describe, expect, it, vi } from "vitest";

import { AiApiError, requestAiNextMove, type GameMove } from "./aiApi";

import { authFetch } from "./api";

vi.mock("./api", () => ({
    authFetch: vi.fn(),
}));

describe("requestAiNextMove", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("AI 다음 수 요청을 올바른 URL과 POST body로 전송한다", async () => {
        const moves: GameMove[] = [
            {
                player: "BLACK",
                moveType: "PLAY",
                position: {
                    x: 3,
                    y: 3,
                },
            },
            {
                player: "WHITE",
                moveType: "PASS",
                position: null,
            },
        ];

        const responseData = {
            moveType: "PLAY" as const,
            move: {
                x: 15,
                y: 15,
            },
            winRate: 0.6,
            scoreLead: 3.5,
            gameEnded: false,
            result: null,
            endReason: null,
        };

        vi.mocked(authFetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => responseData,
        } as Response);

        await requestAiNextMove(moves);

        expect(authFetch).toHaveBeenCalledTimes(1);

        expect(authFetch).toHaveBeenCalledWith("/api/ai/game/next-move", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                moves,
            }),
        });
    });

    it("요청이 성공하면 백엔드 응답을 반환한다", async () => {
        const responseData = {
            moveType: "PLAY" as const,
            move: {
                x: 10,
                y: 10,
            },
            winRate: 0.35,
            scoreLead: -2.5,
            gameEnded: false,
            result: null,
            endReason: null,
        };

        vi.mocked(authFetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => responseData,
        } as Response);

        const result = await requestAiNextMove([]);

        expect(result).toEqual(responseData);
    });

    it("PASS 응답도 정상적으로 반환한다", async () => {
        const responseData = {
            moveType: "PASS" as const,
            move: null,
            winRate: 0.45,
            scoreLead: -1,
            gameEnded: false,
            result: null,
            endReason: null,
        };

        vi.mocked(authFetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => responseData,
        } as Response);

        const result = await requestAiNextMove([]);

        expect(result).toEqual(responseData);

        expect(result.moveType).toBe("PASS");

        expect(result.move).toBeNull();
    });

    it("대국 종료 응답도 정상적으로 반환한다", async () => {
        const responseData = {
            moveType: null,
            move: null,
            winRate: 0.08,
            scoreLead: -15,
            gameEnded: true,
            result: "PLAYER_WIN" as const,
            endReason: "AI_RESIGN" as const,
        };

        vi.mocked(authFetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => responseData,
        } as Response);

        const result = await requestAiNextMove([]);

        expect(result.gameEnded).toBe(true);

        expect(result.result).toBe("PLAYER_WIN");

        expect(result.endReason).toBe("AI_RESIGN");
    });

    it("응답이 실패하면 상태 코드를 포함한 AiApiError를 던진다", async () => {
        vi.mocked(authFetch).mockResolvedValue({
            ok: false,
            status: 502,
        } as Response);

        try {
            await requestAiNextMove([]);

            throw new Error("에러가 발생해야 합니다.");
        } catch (error) {
            expect(error).toBeInstanceOf(AiApiError);

            expect((error as AiApiError).status).toBe(502);
        }
    });

    it("504 응답이면 status가 504인 AiApiError를 던진다", async () => {
        vi.mocked(authFetch).mockResolvedValue({
            ok: false,
            status: 504,
        } as Response);

        try {
            await requestAiNextMove([]);

            throw new Error("에러가 발생해야 합니다.");
        } catch (error) {
            expect(error).toBeInstanceOf(AiApiError);

            expect((error as AiApiError).status).toBe(504);
        }
    });
});
