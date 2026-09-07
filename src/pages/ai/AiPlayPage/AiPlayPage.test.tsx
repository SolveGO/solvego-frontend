import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { beforeEach, describe, expect, it, vi } from "vitest";

import AiPlayPage from "./AiPlayPage";

import { requestAiNextMove } from "../../../api/aiApi";

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
        onSelect,
    }: {
        onSelect: (position: { x: number; y: number }) => void;
    }) => (
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
        vi.clearAllMocks();

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
