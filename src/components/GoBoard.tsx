import "./GoBoard.css";

type Position = {
    x: number;
    y: number;
};

type GoBoardProps = {
    blackStones: Position[];
    whiteStones: Position[];
    selectedPosition?: Position | null;
    onSelect: (position: Position) => void;
};

function GoBoard(props: GoBoardProps) {
    const size = 19;

    return (
        <div className="go-board">
            {Array.from({ length: size }).map((_, y) =>
                Array.from({ length: size }).map((_, x) => {
                    const hasBlackStone = props.blackStones.some(
                        (stone) => stone.x === x && stone.y === y,
                    );

                    const hasWhiteStone = props.whiteStones.some(
                        (stone) => stone.x === x && stone.y === y,
                    );

                    const isSelected =
                        props.selectedPosition?.x === x &&
                        props.selectedPosition?.y === y;

                    return (
                        <button
                            key={`${x}-${y}`}
                            className={[
                                "go-point",
                                x === 0 ? "left-edge" : "",
                                x === size - 1 ? "right-edge" : "",
                                y === 0 ? "top-edge" : "",
                                y === size - 1 ? "bottom-edge" : "",
                            ].join(" ")}
                            onClick={() => props.onSelect({ x, y })}>
                            {hasBlackStone && (
                                <span className="stone black-stone" />
                            )}

                            {hasWhiteStone && (
                                <span className="stone white-stone" />
                            )}

                            {isSelected && <span className="selected-marker" />}
                        </button>
                    );
                }),
            )}
        </div>
    );
}

export default GoBoard;
