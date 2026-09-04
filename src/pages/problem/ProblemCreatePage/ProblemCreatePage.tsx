import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

import GoBoard from "../../../components/GoBoard/GoBoard";
import { authFetch } from "../../../api/api";
import AuthContext from "../../../contexts/AuthContext";
import { playMove } from "../../../utils/goRules";

import "../ProblemFormPage.css";

type Position = {
    x: number;
    y: number;
};

type BoardMode = "BLACK" | "WHITE" | "ERASE" | "ANSWER";
type NextPlayer = "BLACK" | "WHITE";

function ProblemCreatePage() {
    const navigate = useNavigate();
    const { logout } = useContext(AuthContext);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [nextPlayer, setNextPlayer] = useState<NextPlayer>("BLACK");

    const [blackStones, setBlackStones] = useState<Position[]>([]);
    const [whiteStones, setWhiteStones] = useState<Position[]>([]);

    const [boardMode, setBoardMode] = useState<BoardMode>("BLACK");

    const [answerPosition, setAnswerPosition] = useState<Position | null>(null);

    function isSamePosition(a: Position, b: Position) {
        return a.x === b.x && a.y === b.y;
    }

    function removePosition(stones: Position[], position: Position) {
        return stones.filter((stone) => !isSamePosition(stone, position));
    }

    function handleBoardSelect(position: Position) {
        if (boardMode === "BLACK" || boardMode === "WHITE") {
            const result = playMove(
                blackStones,
                whiteStones,
                position,
                boardMode,
            );

            if (result === null) {
                alert("둘 수 없는 위치입니다.");
                return;
            }

            setBlackStones(result.blackStones);
            setWhiteStones(result.whiteStones);

            setBoardMode(boardMode === "BLACK" ? "WHITE" : "BLACK");

            return;
        }

        if (boardMode === "ERASE") {
            setBlackStones((prev) => removePosition(prev, position));

            setWhiteStones((prev) => removePosition(prev, position));

            if (answerPosition && isSamePosition(answerPosition, position)) {
                setAnswerPosition(null);
            }

            return;
        }

        if (boardMode === "ANSWER") {
            const occupied =
                blackStones.some((stone) => isSamePosition(stone, position)) ||
                whiteStones.some((stone) => isSamePosition(stone, position));

            if (occupied) {
                alert("돌이 놓여 있는 위치는 정답으로 선택할 수 없습니다.");
                return;
            }

            setAnswerPosition(position);
        }
    }

    async function handleCreateProblem() {
        if (answerPosition === null) {
            alert("정답 위치를 선택해주세요.");
            return;
        }

        const response = await authFetch("/api/problems", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                title,
                description,
                blackStones,
                whiteStones,
                nextPlayer,
                answerPosition,
            }),
        });

        if (!response.ok) {
            if (response.status === 401) {
                logout();
                alert("로그인이 만료되었습니다.");
                navigate("/login");
                return;
            }

            alert("문제 등록에 실패했습니다.");
            return;
        }

        navigate("/problems");
    }

    return (
        <div className="problem-form-page">
            <h1>문제 등록</h1>

            <div className="problem-form">
                <div className="problem-form-field">
                    <label>제목</label>

                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                <div className="problem-form-field">
                    <label>설명</label>

                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                <div className="problem-form-field">
                    <label>다음 차례</label>

                    <select
                        value={nextPlayer}
                        onChange={(e) =>
                            setNextPlayer(e.target.value as NextPlayer)
                        }>
                        <option value="BLACK">흑</option>
                        <option value="WHITE">백</option>
                    </select>
                </div>
            </div>

            <div className="board-editor">
                <h2>바둑판 설정</h2>

                <div className="board-mode-buttons">
                    <button onClick={() => setBoardMode("BLACK")}>흑돌</button>

                    <button onClick={() => setBoardMode("WHITE")}>백돌</button>

                    <button onClick={() => setBoardMode("ERASE")}>
                        지우기
                    </button>

                    <button onClick={() => setBoardMode("ANSWER")}>
                        정답 위치
                    </button>
                </div>

                <p className="board-status">현재 모드: {boardMode}</p>

                <GoBoard
                    blackStones={blackStones}
                    whiteStones={whiteStones}
                    selectedPosition={answerPosition}
                    onSelect={handleBoardSelect}
                />

                <div className="board-info">
                    <div>흑돌 개수: {blackStones.length}</div>

                    <div>백돌 개수: {whiteStones.length}</div>

                    {answerPosition && (
                        <div>
                            정답 위치: ({answerPosition.x}, {answerPosition.y})
                        </div>
                    )}
                </div>
            </div>

            <button
                className="problem-form-submit"
                onClick={handleCreateProblem}>
                문제 등록
            </button>
        </div>
    );
}

export default ProblemCreatePage;
