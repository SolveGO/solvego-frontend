import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import GoBoard from "./GoBoard";


describe("GoBoard candidate markers", () => {
    it("A/B/C overlay를 좌표에 표시하면서 기존 착수 이벤트를 유지한다", () => {
        const onSelect = vi.fn();
        render(
            <GoBoard
                blackStones={[{ x: 3, y: 3 }]}
                whiteStones={[]}
                candidateMarkers={[
                    { position: { x: 3, y: 3 }, label: "A" },
                    { position: { x: 15, y: 3 }, label: "B" },
                    { position: { x: 3, y: 15 }, label: "C" },
                ]}
                onSelect={onSelect}
            />,
        );

        expect(screen.getByLabelText("A 후보")).toBeInTheDocument();
        expect(screen.getByLabelText("B 후보")).toBeInTheDocument();
        expect(screen.getByLabelText("C 후보")).toBeInTheDocument();
        expect(screen.getByLabelText("A 후보").parentElement)
            .toHaveClass("go-point");

        fireEvent.click(screen.getByLabelText("B 후보").parentElement!);
        expect(onSelect).toHaveBeenCalledWith({ x: 15, y: 3 });
    });
});
