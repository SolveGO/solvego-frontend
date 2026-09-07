import { describe, expect, it } from "vitest";

import { playMove, type Position } from "./goRules";

describe("playMove", () => {
    it("빈 자리에 흑돌을 둘 수 있다", () => {
        const result = playMove([], [], { x: 3, y: 3 }, "BLACK");

        expect(result).toEqual({
            blackStones: [{ x: 3, y: 3 }],
            whiteStones: [],
        });
    });

    it("빈 자리에 백돌을 둘 수 있다", () => {
        const result = playMove([], [], { x: 10, y: 10 }, "WHITE");

        expect(result).toEqual({
            blackStones: [],
            whiteStones: [{ x: 10, y: 10 }],
        });
    });

    it("이미 돌이 있는 자리에는 둘 수 없다", () => {
        const blackStones: Position[] = [{ x: 3, y: 3 }];

        expect(playMove(blackStones, [], { x: 3, y: 3 }, "WHITE")).toBeNull();

        const whiteStones: Position[] = [{ x: 5, y: 5 }];

        expect(playMove([], whiteStones, { x: 5, y: 5 }, "BLACK")).toBeNull();
    });

    it("상대 돌의 마지막 활로를 막으면 상대 돌을 잡는다", () => {
        /*
         *     흑
         *   흑 백 흑
         *     ↓
         *     흑
         */

        const blackStones: Position[] = [
            { x: 0, y: 1 },
            { x: 1, y: 0 },
            { x: 2, y: 1 },
        ];

        const whiteStones: Position[] = [{ x: 1, y: 1 }];

        const result = playMove(
            blackStones,
            whiteStones,
            { x: 1, y: 2 },
            "BLACK",
        );

        expect(result).not.toBeNull();

        expect(result?.whiteStones).toEqual([]);

        expect(result?.blackStones).toContainEqual({
            x: 1,
            y: 2,
        });
    });

    it("연결된 상대 돌 그룹의 활로가 모두 없어지면 그룹 전체를 잡는다", () => {
        /*
         * 백 그룹:
         *
         * (1,1) - (2,1)
         *
         * 마지막 활로가 (2,2) 하나인 상태.
         */

        const blackStones: Position[] = [
            { x: 0, y: 1 },
            { x: 1, y: 0 },
            { x: 1, y: 2 },

            { x: 2, y: 0 },
            { x: 3, y: 1 },
        ];

        const whiteStones: Position[] = [
            { x: 1, y: 1 },
            { x: 2, y: 1 },
        ];

        const result = playMove(
            blackStones,
            whiteStones,
            { x: 2, y: 2 },
            "BLACK",
        );

        expect(result).not.toBeNull();

        expect(result?.whiteStones).toEqual([]);
    });

    it("자충수는 둘 수 없다", () => {
        /*
         *     백
         *   백 ? 백
         *     백
         */

        const whiteStones: Position[] = [
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: 2, y: 1 },
            { x: 1, y: 2 },
        ];

        const result = playMove([], whiteStones, { x: 1, y: 1 }, "BLACK");

        expect(result).toBeNull();
    });

    it("상대 돌을 잡아서 활로가 생기면 자충수가 아니다", () => {
        /*
         * 중앙 백돌의 마지막 활로에
         * 흑이 착수한다.
         *
         * 착수 직후에는 막혀 보이지만
         * 백돌이 제거되면서 활로가 생긴다.
         */

        const blackStones: Position[] = [
            { x: 0, y: 1 },
            { x: 1, y: 0 },
            { x: 2, y: 1 },
        ];

        const whiteStones: Position[] = [{ x: 1, y: 1 }];

        const result = playMove(
            blackStones,
            whiteStones,
            { x: 1, y: 2 },
            "BLACK",
        );

        expect(result).not.toBeNull();

        expect(result?.whiteStones).toEqual([]);
    });

    it("모서리에서도 정상적으로 착수할 수 있다", () => {
        const result = playMove([], [], { x: 0, y: 0 }, "BLACK");

        expect(result).not.toBeNull();

        expect(result?.blackStones).toContainEqual({
            x: 0,
            y: 0,
        });
    });

    it("변에서도 정상적으로 착수할 수 있다", () => {
        const result = playMove([], [], { x: 0, y: 10 }, "WHITE");

        expect(result).not.toBeNull();

        expect(result?.whiteStones).toContainEqual({
            x: 0,
            y: 10,
        });
    });
});
