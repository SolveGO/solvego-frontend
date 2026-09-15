import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { beforeEach, describe, expect, it, vi } from "vitest";

import AiPlayPage from "./AiPlayPage";

import { AiApiError, requestAiExplanation, requestAiNextMove, type AiGameNextMoveResponse } from "../../../api/aiApi";

import { playMove } from "../../../utils/goRules";

/*
 * 실제 GoBoard를 테스트하는 게 아니라
 * AiPlayPage의 상태 전환을 테스트하는 것이 목적이다.
 *
 * 테스트에서 버튼을 누르면
 * 바둑판의 특정 좌표를 클릭한 것처럼 동작시킨다.
 */
vi.mock("../../../components/GoBoard/GoBoard", () => ({
    default: ({
        onSelect, blackStones, whiteStones, candidateMarkers,
    }: {
        blackStones: { x: number; y: number }[];
        whiteStones: { x: number; y: number }[];
        onSelect: (position: { x: number; y: number }) => void;
        candidateMarkers?: Array<{ position: { x: number; y: number }; label: string }>;
    }) => (
        <>
        <output data-testid="board">{JSON.stringify({ blackStones, whiteStones })}</output>
        <output data-testid="candidate-markers">{JSON.stringify(candidateMarkers ?? [])}</output>
        <button
            type="button"
            onClick={() =>
                onSelect({
                    x: 3,
                    y: 3,
                })
            }>
            바둑판 클릭
        </button>
        </>
    ),
}));

/*
 * API 함수 자체는 실제 서버를 호출하지 않고 mock 처리한다.
 */
vi.mock("../../../api/aiApi", async () => {
    const actual =
        await vi.importActual<typeof import("../../../api/aiApi")>(
            "../../../api/aiApi",
        );

    return {
        ...actual,
        requestAiNextMove: vi.fn(),
        requestAiExplanation: vi.fn(),
    };
});

/*
 * 바둑 규칙 자체는 goRules 테스트의 책임.
 *
 * 여기서는 착수하면 정상적인 새 보드가
 * 반환된다고 가정한다.
 */
vi.mock("../../../utils/goRules", () => ({
    playMove: vi.fn(),
}));

describe("AiPlayPage", () => {
    beforeEach(() => {
        vi.resetAllMocks();

        vi.mocked(playMove).mockImplementation(
            (blackStones, whiteStones, position, color) => {
                if (color === "BLACK") {
                    return {
                        blackStones: [...blackStones, position],
                        whiteStones,
                    };
                }

                return {
                    blackStones,
                    whiteStones: [...whiteStones, position],
                };
            },
        );
    });

    it("대국 시작 전에는 흑으로 시작과 백으로 시작 버튼을 표시한다", () => {
        render(<AiPlayPage />);

        expect(
            screen.getByRole("button", {
                name: "흑으로 시작",
            }),
        ).toBeInTheDocument();

        expect(
            screen.getByRole("button", {
                name: "백으로 시작",
            }),
        ).toBeInTheDocument();

        expect(
            screen.queryByRole("button", {
                name: "PASS",
            }),
        ).not.toBeInTheDocument();

        expect(
            screen.queryByRole("button", {
                name: "기권",
            }),
        ).not.toBeInTheDocument();
    });

    it("대국 시작 전에 바둑판을 클릭하면 자동으로 흑으로 시작한다", async () => {
        vi.mocked(requestAiNextMove).mockResolvedValue({
            moveType: "PLAY",
            move: {
                x: 15,
                y: 15,
            },
            winRate: 0.4,
            scoreLead: 1,
            gameEnded: false,
            result: null,
            endReason: null,
        });

        render(<AiPlayPage />);

        fireEvent.click(
            screen.getByRole("button", {
                name: "바둑판 클릭",
            }),
        );

        await waitFor(() => {
            expect(requestAiNextMove).toHaveBeenCalledTimes(1);
        });

        expect(requestAiNextMove).toHaveBeenCalledWith([
            {
                player: "BLACK",
                moveType: "PLAY",
                position: {
                    x: 3,
                    y: 3,
                },
            },
        ]);

        expect(
            screen.getByRole("button", {
                name: "PASS",
            }),
        ).toBeInTheDocument();

        expect(
            screen.getByRole("button", {
                name: "기권",
            }),
        ).toBeInTheDocument();
    });

    it("백으로 시작하면 AI가 흑으로 먼저 착수하도록 빈 수순을 요청한다", async () => {
        vi.mocked(requestAiNextMove).mockResolvedValue({
            moveType: "PLAY",
            move: {
                x: 3,
                y: 3,
            },
            winRate: 0.55,
            scoreLead: 1,
            gameEnded: false,
            result: null,
            endReason: null,
        });

        render(<AiPlayPage />);

        fireEvent.click(
            screen.getByRole("button", {
                name: "백으로 시작",
            }),
        );

        await waitFor(() => {
            expect(requestAiNextMove).toHaveBeenCalledWith([]);
        });

        expect(
            screen.getByRole("button", {
                name: "PASS",
            }),
        ).toBeInTheDocument();
    });

    it("왜 이 수를 누르면 후보 마커를 표시하고 동일 턴 해설을 재사용한다", async () => {
        vi.mocked(requestAiNextMove).mockResolvedValue({
            moveType: "PLAY", move: { x: 15, y: 15 },
            winRate: 0.6, scoreLead: 1.5,
            gameEnded: false, result: null, endReason: null,
            evidenceToken: "signed-evidence",
            candidates: [
                { id: "c1", rank: 1, moveType: "PLAY", move: { x: 15, y: 15 }, winRate: 0.6, scoreLead: 1.5, visits: 3, pv: [] },
                { id: "c2", rank: 2, moveType: "PLAY", move: { x: 3, y: 15 }, winRate: 0.55, scoreLead: 0.8, visits: 2, pv: [] },
            ],
        });
        vi.mocked(requestAiExplanation).mockResolvedValue({
            source: "LLM", perspective: "WHITE", candidates: [],
            explanation: {
                summary: "A 후보가 가장 높은 평가를 받았습니다.",
                comparison: "B 후보도 함께 비교했습니다.",
                pvExplanation: "가능한 예상 진행입니다.",
                limitation: "낮은 탐색량의 결과입니다.",
                evidenceRefs: ["c1", "c2"],
            },
        });
        render(<AiPlayPage />);
        fireEvent.click(screen.getByRole("button", { name: "바둑판 클릭" }));
        const explainButton = await screen.findByRole("button", { name: "왜 이 수?" });

        fireEvent.click(explainButton);
        expect(JSON.parse(screen.getByTestId("candidate-markers").textContent!)).toEqual([
            { position: { x: 15, y: 15 }, label: "A" },
            { position: { x: 3, y: 15 }, label: "B" },
        ]);
        await screen.findByText("A 후보가 가장 높은 평가를 받았습니다.");
        fireEvent.click(explainButton);
        expect(requestAiExplanation).toHaveBeenCalledTimes(1);
        expect(requestAiExplanation).toHaveBeenCalledWith("signed-evidence");
    });

    it("다음 사용자 착수는 이전 후보와 해설을 제거한다", async () => {
        vi.mocked(requestAiNextMove).mockResolvedValue({
            moveType: "PLAY", move: { x: 15, y: 15 }, winRate: 0.6, scoreLead: 1,
            gameEnded: false, result: null, endReason: null,
            evidenceToken: "token", candidates: [
                { id: "c1", rank: 1, moveType: "PLAY", move: { x: 15, y: 15 }, winRate: 0.6, scoreLead: 1, visits: 5, pv: [] },
            ],
        });
        vi.mocked(requestAiExplanation).mockRejectedValue(new Error("LLM failed"));
        render(<AiPlayPage />);
        fireEvent.click(screen.getByRole("button", { name: "바둑판 클릭" }));
        fireEvent.click(await screen.findByRole("button", { name: "왜 이 수?" }));
        await screen.findByRole("alert");
        expect(screen.getByRole("button", { name: "PASS" })).toBeEnabled();
        expect(screen.getByText("40.0%")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "바둑판 클릭" }));
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(JSON.parse(screen.getByTestId("candidate-markers").textContent!)).toEqual([]);
    });

    it("새 대국을 시작하면 이전 후보 표시를 제거한다", async () => {
        vi.mocked(requestAiNextMove).mockResolvedValue({
            moveType: "PLAY", move: { x: 15, y: 15 }, winRate: 0.6, scoreLead: 1,
            gameEnded: false, result: null, endReason: null,
            evidenceToken: "token", candidates: [
                { id: "c1", rank: 1, moveType: "PLAY", move: { x: 15, y: 15 }, winRate: 0.6, scoreLead: 1, visits: 5, pv: [] },
            ],
        });
        vi.mocked(requestAiExplanation).mockResolvedValue({
            source: "TEMPLATE", perspective: "WHITE", candidates: [],
            explanation: {
                summary: "요약", comparison: "비교", pvExplanation: "진행",
                limitation: "한계", evidenceRefs: ["c1"],
            },
        });
        render(<AiPlayPage />);
        fireEvent.click(screen.getByRole("button", { name: "바둑판 클릭" }));
        fireEvent.click(await screen.findByRole("button", { name: "왜 이 수?" }));
        await screen.findByText("요약");
        fireEvent.click(screen.getByRole("button", { name: "기권" }));
        fireEvent.click(screen.getByRole("button", { name: "흑으로 시작" }));

        expect(screen.queryByRole("button", { name: "왜 이 수?" })).not.toBeInTheDocument();
        expect(JSON.parse(screen.getByTestId("candidate-markers").textContent!)).toEqual([]);
    });

    it("사용자가 기권하면 AI 승리로 대국을 종료한다", () => {
        render(<AiPlayPage />);

        fireEvent.click(
            screen.getByRole("button", {
                name: "흑으로 시작",
            }),
        );

        fireEvent.click(
            screen.getByRole("button", {
                name: "기권",
            }),
        );

        expect(screen.getByText("대국 종료")).toBeInTheDocument();

        expect(screen.getByText("AI가 승리했습니다.")).toBeInTheDocument();

        expect(screen.getByText("기권했습니다.")).toBeInTheDocument();

        /*
         * 대국이 끝났으므로
         * 다시 새 대국 시작 버튼이 표시된다.
         */
        expect(
            screen.getByRole("button", {
                name: "흑으로 시작",
            }),
        ).toBeInTheDocument();

        expect(
            screen.getByRole("button", {
                name: "백으로 시작",
            }),
        ).toBeInTheDocument();
    });

    it("형세 패널을 접었다가 다시 펼칠 수 있다", () => {
        render(<AiPlayPage />);

        const toggle = screen.getByRole("button", {
            name: /형세/,
        });

        expect(toggle).toHaveAttribute("aria-expanded", "true");

        expect(
            screen.getByText(
                "바둑판을 클릭하면 흑으로 바로 시작할 수 있습니다.",
            ),
        ).toBeInTheDocument();

        fireEvent.click(toggle);

        expect(toggle).toHaveAttribute("aria-expanded", "false");

        expect(
            screen.queryByText(
                "바둑판을 클릭하면 흑으로 바로 시작할 수 있습니다.",
            ),
        ).not.toBeInTheDocument();

        fireEvent.click(toggle);

        expect(toggle).toHaveAttribute("aria-expanded", "true");
    });

    it("AI 승률을 사용자 승률로 변환해서 표시한다", async () => {
        vi.mocked(requestAiNextMove).mockResolvedValue({
            moveType: "PLAY",
            move: {
                x: 15,
                y: 15,
            },

            /*
             * AI 승률 30%
             * → 사용자 승률 70%
             */
            winRate: 0.3,

            scoreLead: -5,
            gameEnded: false,
            result: null,
            endReason: null,
        });

        render(<AiPlayPage />);

        fireEvent.click(
            screen.getByRole("button", {
                name: "바둑판 클릭",
            }),
        );

        await waitFor(() => {
            expect(screen.getByText("70.0%")).toBeInTheDocument();
        });

        expect(screen.getByText("내 승률")).toBeInTheDocument();
    });

    it("사용자가 PASS하면 PASS 수순을 AI에게 전달한다", async () => {
        vi.mocked(requestAiNextMove).mockResolvedValue({
            moveType: "PLAY",
            move: {
                x: 10,
                y: 10,
            },
            winRate: 0.5,
            scoreLead: 0,
            gameEnded: false,
            result: null,
            endReason: null,
        });

        render(<AiPlayPage />);

        fireEvent.click(
            screen.getByRole("button", {
                name: "흑으로 시작",
            }),
        );

        fireEvent.click(
            screen.getByRole("button", {
                name: "PASS",
            }),
        );

        await waitFor(() => {
            expect(requestAiNextMove).toHaveBeenCalledWith([
                {
                    player: "BLACK",
                    moveType: "PASS",
                    position: null,
                },
            ]);
        });
    });

    it("백엔드가 AI 기권을 반환하면 사용자의 승리로 종료한다", async () => {
        vi.mocked(requestAiNextMove).mockResolvedValue({
            moveType: null,
            move: null,
            winRate: 0.08,
            scoreLead: -20,
            gameEnded: true,
            result: "PLAYER_WIN",
            endReason: "AI_RESIGN",
        });

        render(<AiPlayPage />);

        fireEvent.click(
            screen.getByRole("button", {
                name: "바둑판 클릭",
            }),
        );

        await waitFor(() => {
            expect(screen.getByText("승리했습니다.")).toBeInTheDocument();
        });

        expect(screen.getByText("AI가 기권했습니다.")).toBeInTheDocument();
    });

    it("사용자 PASS 후 AI도 PASS하면 DOUBLE_PASS로 종료한다", async () => {
        vi.mocked(requestAiNextMove).mockResolvedValue({
            moveType: "PASS",
            move: null,
            winRate: 0.7,
            scoreLead: 4,
            gameEnded: true,
            result: "AI_WIN",
            endReason: "DOUBLE_PASS",
        });

        render(<AiPlayPage />);

        fireEvent.click(
            screen.getByRole("button", {
                name: "흑으로 시작",
            }),
        );

        fireEvent.click(
            screen.getByRole("button", {
                name: "PASS",
            }),
        );

        await waitFor(() => {
            expect(screen.getByText("AI가 승리했습니다.")).toBeInTheDocument();
        });

        expect(
            screen.getByText("흑과 백이 연속으로 PASS했습니다."),
        ).toBeInTheDocument();
    });

    it("AI가 먼저 PASS하고 사용자가 이어서 PASS하면 프론트에서 DOUBLE_PASS 종료한다", async () => {
        /*
         * AI 기준 scoreLead가 음수이므로
         * 최종적으로 사용자가 승리한다.
         */
        vi.mocked(requestAiNextMove).mockResolvedValue({
            moveType: "PASS",
            move: null,
            winRate: 0.2,
            scoreLead: -5,
            gameEnded: false,
            result: null,
            endReason: null,
        });

        render(<AiPlayPage />);

        /*
         * 사용자가 흑으로 첫 수
         */
        fireEvent.click(
            screen.getByRole("button", {
                name: "바둑판 클릭",
            }),
        );

        await waitFor(() => {
            expect(requestAiNextMove).toHaveBeenCalledTimes(1);
        });

        /*
         * 직전 AI가 PASS했으므로
         * 사용자가 PASS하면 연속 2 PASS.
         */
        fireEvent.click(
            screen.getByRole("button", {
                name: "PASS",
            }),
        );

        expect(screen.getByText("대국 종료")).toBeInTheDocument();

        expect(screen.getByText("승리했습니다.")).toBeInTheDocument();

        expect(
            screen.getByText("흑과 백이 연속으로 PASS했습니다."),
        ).toBeInTheDocument();

        /*
         * 두 번째 PASS 이후에는
         * AI API를 다시 호출하면 안 된다.
         */
        expect(requestAiNextMove).toHaveBeenCalledTimes(1);
    });
});


const validMove: AiGameNextMoveResponse = {
    moveType: "PLAY", move: { x: 15, y: 15 },
    winRate: 0.4, scoreLead: -3,
    gameEnded: false, result: null, endReason: null,
};
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const boardText = () => screen.getByTestId("board").textContent;

describe("AI 실패 복구", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(playMove).mockImplementation((blackStones, whiteStones, position, color) => ({
            blackStones: color === "BLACK" ? [...blackStones, position] : blackStones,
            whiteStones: color === "WHITE" ? [...whiteStones, position] : whiteStones,
        }));
    });

    it.each([
        ["착수", new AiApiError(502)],
        ["PASS", new AiApiError(504)],
        ["백 시작", new TypeError("Failed to fetch")],
    ])("%s 실패 시 차례를 유지하고 동일 수순으로 재시도한다", async (scenario, error) => {
        vi.mocked(requestAiNextMove).mockRejectedValueOnce(error).mockRejectedValueOnce(error);
        render(<AiPlayPage />);
        if (scenario === "백 시작") click("백으로 시작");
        else if (scenario === "PASS") { click("흑으로 시작"); click("PASS"); }
        else click("바둑판 클릭");
        await screen.findByRole("alert");
        const originalBoard = boardText();
        const originalMoves = structuredClone(vi.mocked(requestAiNextMove).mock.calls[0][0]);
        expect(originalMoves).toEqual(scenario === "백 시작" ? [] : [{
            player: "BLACK", moveType: scenario === "PASS" ? "PASS" : "PLAY",
            position: scenario === "PASS" ? null : { x: 3, y: 3 },
        }]);
        expect(screen.getByRole("button", { name: "PASS" })).toBeDisabled();
        click("바둑판 클릭"); click("PASS");
        expect(requestAiNextMove).toHaveBeenCalledTimes(1);
        expect(boardText()).toBe(originalBoard);
        expect(screen.queryByText("대국 종료")).not.toBeInTheDocument();

        click("AI 요청 재시도");
        await screen.findByRole("alert");
        expect(requestAiNextMove).toHaveBeenNthCalledWith(2, originalMoves);
        expect(boardText()).toBe(originalBoard);
        expect(screen.getByRole("button", { name: "PASS" })).toBeDisabled();

        let resolve!: (value: AiGameNextMoveResponse) => void;
        vi.mocked(requestAiNextMove).mockReturnValueOnce(new Promise(r => { resolve = r; }));
        const retry = screen.getByRole("button", { name: "AI 요청 재시도" });
        act(() => { fireEvent.click(retry); fireEvent.click(retry); });
        click("바둑판 클릭"); click("PASS");
        expect(requestAiNextMove).toHaveBeenCalledTimes(3);
        expect(requestAiNextMove).toHaveBeenNthCalledWith(3, originalMoves);
        await act(async () => resolve(validMove));
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "PASS" })).toBeEnabled();
        expect(screen.getByRole("img").querySelectorAll("circle")).toHaveLength(1);
        const board = JSON.parse(boardText()!);
        expect(board[scenario === "백 시작" ? "blackStones" : "whiteStones"]).toEqual([validMove.move]);

        vi.mocked(requestAiNextMove).mockResolvedValueOnce(validMove);
        click("PASS");
        await waitFor(() => expect(requestAiNextMove).toHaveBeenCalledTimes(4));
        expect(vi.mocked(requestAiNextMove).mock.calls[3][0]).toEqual([
            ...originalMoves,
            { player: scenario === "백 시작" ? "BLACK" : "WHITE", moveType: "PLAY", position: validMove.move },
            { player: scenario === "백 시작" ? "WHITE" : "BLACK", moveType: "PASS", position: null },
        ]);
    });

    it.each([
        ["null", null],
        ["누락된 필드", {}],
        ["좌표 없음", { ...validMove, move: null }],
        ["좌표 범위 초과", { ...validMove, move: { x: 19, y: 0 } }],
        ["소수 좌표", { ...validMove, move: { x: 0.5, y: 0 } }],
        ["승률 범위 초과", { ...validMove, winRate: 2 }],
        ["집 차이 NaN", { ...validMove, scoreLead: NaN }],
        ["알 수 없는 수", { ...validMove, moveType: "INVALID" }],
        ["PASS에 좌표 존재", { ...validMove, moveType: "PASS" }],
        ["잘못된 종료 결과", { ...validMove, gameEnded: true }],
        ["집 차이와 모순된 종료 결과", { ...validMove, gameEnded: true, moveType: "PASS", move: null, endReason: "DOUBLE_PASS", result: "AI_WIN" }],
    ])("잘못된 응답(%s)은 기존 바둑판과 평가를 변경하지 않는다", async (_name, response) => {
        vi.mocked(requestAiNextMove).mockResolvedValueOnce(validMove)
            .mockResolvedValueOnce(response as AiGameNextMoveResponse);
        render(<AiPlayPage />);
        click("바둑판 클릭");
        await screen.findByText("60.0%");
        const originalBoard = boardText();
        click("PASS");
        await screen.findByRole("alert");
        const failedMoves = structuredClone(vi.mocked(requestAiNextMove).mock.calls[1][0]);
        expect(boardText()).toBe(originalBoard);
        expect(screen.getByText("60.0%")).toBeInTheDocument();
        expect(screen.getByRole("img").querySelectorAll("circle")).toHaveLength(1);
        expect(screen.queryByText("대국 종료")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "PASS" })).toBeDisabled();
        vi.mocked(requestAiNextMove).mockResolvedValueOnce(validMove);
        click("AI 요청 재시도");
        await waitFor(() => expect(screen.getByRole("button", { name: "PASS" })).toBeEnabled());
        expect(requestAiNextMove).toHaveBeenNthCalledWith(3, failedMoves);
        expect(screen.getByRole("img").querySelectorAll("circle")).toHaveLength(2);
    });

    it("선행 PASS 없이 DOUBLE_PASS를 반환하면 종료하지 않는다", async () => {
        vi.mocked(requestAiNextMove).mockResolvedValueOnce({
            ...validMove, moveType: "PASS", move: null, gameEnded: true,
            endReason: "DOUBLE_PASS", result: "PLAYER_WIN",
        });
        render(<AiPlayPage />);
        click("바둑판 클릭");
        await screen.findByRole("alert");
        expect(screen.queryByText("대국 종료")).not.toBeInTheDocument();
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it("착수 불가능한 AI 수는 평가까지 반영하지 않는다", async () => {
        vi.mocked(requestAiNextMove).mockResolvedValue(validMove);
        vi.mocked(playMove).mockReturnValueOnce({ blackStones: [{ x: 3, y: 3 }], whiteStones: [] })
            .mockReturnValueOnce(null);
        render(<AiPlayPage />);
        click("바둑판 클릭");
        await screen.findByRole("alert");
        expect(JSON.parse(boardText()!)).toEqual({ blackStones: [{ x: 3, y: 3 }], whiteStones: [] });
        expect(screen.queryByRole("img")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "PASS" })).toBeDisabled();
    });

    it("PASS 재시도 후 AI PASS로 정상 종료한다", async () => {
        vi.mocked(requestAiNextMove).mockRejectedValueOnce(new AiApiError(504)).mockResolvedValueOnce({
            ...validMove, moveType: "PASS", move: null, gameEnded: true,
            endReason: "DOUBLE_PASS", result: "PLAYER_WIN",
        });
        render(<AiPlayPage />);
        click("흑으로 시작"); click("PASS");
        await screen.findByRole("alert");
        click("AI 요청 재시도");
        await screen.findByText("승리했습니다.");
        expect(requestAiNextMove).toHaveBeenCalledTimes(2);
        expect(vi.mocked(requestAiNextMove).mock.calls[1][0]).toHaveLength(1);
    });

    it("실패 후 기권하고 새 대국을 시작하면 실패 문맥을 제거한다", async () => {
        vi.mocked(requestAiNextMove).mockRejectedValueOnce(new AiApiError(502)).mockResolvedValueOnce(validMove);
        render(<AiPlayPage />);
        click("바둑판 클릭");
        await screen.findByRole("alert");
        click("기권");
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        click("백으로 시작");
        await screen.findByText("60.0%");
        expect(requestAiNextMove).toHaveBeenNthCalledWith(2, []);
    });
});
