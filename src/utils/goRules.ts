export type Position = {
    x: number;
    y: number;
};

export type StoneColor = "BLACK" | "WHITE";

type BoardState = {
    blackStones: Position[];
    whiteStones: Position[];
};

const BOARD_SIZE = 19;

function isSamePosition(a: Position, b: Position) {
    return a.x === b.x && a.y === b.y;
}

function containsPosition(stones: Position[], position: Position) {
    return stones.some((stone) => isSamePosition(stone, position));
}

function getNeighbors(position: Position): Position[] {
    const candidates = [
        { x: position.x - 1, y: position.y },
        { x: position.x + 1, y: position.y },
        { x: position.x, y: position.y - 1 },
        { x: position.x, y: position.y + 1 },
    ];

    return candidates.filter(
        ({ x, y }) => x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE,
    );
}

function getGroup(start: Position, stones: Position[]): Position[] {
    const group: Position[] = [];
    const stack: Position[] = [start];
    const visited = new Set<string>();

    while (stack.length > 0) {
        const current = stack.pop()!;
        const key = `${current.x},${current.y}`;

        if (visited.has(key)) {
            continue;
        }

        visited.add(key);
        group.push(current);

        for (const neighbor of getNeighbors(current)) {
            if (
                containsPosition(stones, neighbor) &&
                !visited.has(`${neighbor.x},${neighbor.y}`)
            ) {
                stack.push(neighbor);
            }
        }
    }

    return group;
}

function hasLiberty(
    group: Position[],
    blackStones: Position[],
    whiteStones: Position[],
) {
    for (const stone of group) {
        for (const neighbor of getNeighbors(stone)) {
            const occupied =
                containsPosition(blackStones, neighbor) ||
                containsPosition(whiteStones, neighbor);

            if (!occupied) {
                return true;
            }
        }
    }

    return false;
}

function removeGroup(stones: Position[], group: Position[]) {
    return stones.filter(
        (stone) =>
            !group.some((groupStone) => isSamePosition(stone, groupStone)),
    );
}

export function playMove(
    blackStones: Position[],
    whiteStones: Position[],
    position: Position,
    color: StoneColor,
): BoardState | null {
    // 이미 돌이 있는 자리
    if (
        containsPosition(blackStones, position) ||
        containsPosition(whiteStones, position)
    ) {
        return null;
    }

    let nextBlack = [...blackStones];
    let nextWhite = [...whiteStones];

    // 새 돌 배치
    if (color === "BLACK") {
        nextBlack.push(position);
    } else {
        nextWhite.push(position);
    }

    // 방금 둔 돌 주변의 상대 돌 그룹 검사
    for (const neighbor of getNeighbors(position)) {
        const opponentStones = color === "BLACK" ? nextWhite : nextBlack;

        if (!containsPosition(opponentStones, neighbor)) {
            continue;
        }

        const group = getGroup(neighbor, opponentStones);

        if (!hasLiberty(group, nextBlack, nextWhite)) {
            if (color === "BLACK") {
                nextWhite = removeGroup(nextWhite, group);
            } else {
                nextBlack = removeGroup(nextBlack, group);
            }
        }
    }

    // 상대 돌 제거 후 내 돌 그룹 확인
    const myStones = color === "BLACK" ? nextBlack : nextWhite;

    const myGroup = getGroup(position, myStones);

    // 자충수
    if (!hasLiberty(myGroup, nextBlack, nextWhite)) {
        return null;
    }

    return {
        blackStones: nextBlack,
        whiteStones: nextWhite,
    };
}
