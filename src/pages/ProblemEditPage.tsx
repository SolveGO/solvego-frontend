import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import GoBoard from "../components/GoBoard";
import { authFetch } from "../api/api";
import AuthContext from "../contexts/AuthContext";
import "./ProblemFormPage.css";

type Position = {
    x: number;
    y: number;
};

type BoardMode = "BLACK" | "WHITE" | "ERASE" | "ANSWER";
type NextPlayer = "BLACK" | "WHITE";

type ProblemEditResponse = {
    problemId: number;
    title: string;
    description: string;
    blackStones: Position[];
    whiteStones: Position[];
    nextPlayer: NextPlayer;
    answerPosition: Position;
};

function ProblemEditPage() {
    const navigate = useNavigate();
    const { problemId } = useParams();
    const { logout } = useContext(AuthContext);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [nextPlayer, setNextPlayer] = useState<NextPlayer>("BLACK");

    const [blackStones, setBlackStones] = useState<Position[]>([]);
    const [whiteStones, setWhiteStones] = useState<Position[]>([]);
    const [boardMode, setBoardMode] = useState<BoardMode>("BLACK");
    const [answerPosition, setAnswerPosition] = useState<Position | null>(null);

    useEffect(() => {
        async function fetchProblemForEdit() {
            const response = await authFetch(`/api/problems/${problemId}/edit`);

            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    alert("로그인이 만료되었습니다.");
                    navigate("/login");
                    return;
                }

                if (response.status === 403) {
                    alert("문제를 수정할 권한이 없습니다.");
                    navigate(`/problems/${problemId}`);
                    return;
                }

                if (response.status === 404) {
                    alert("존재하지 않는 문제입니다.");
                    navigate("/problems");
                    return;
                }

                alert("문제 정보를 불러오지 못했습니다.");
                return;
            }

            const data: ProblemEditResponse = await response.json();

            setTitle(data.title);
            setDescription(data.description);
            setNextPlayer(data.nextPlayer);
            setBlackStones(data.blackStones);
            setWhiteStones(data.whiteStones);
            setAnswerPosition(data.answerPosition);
        }

        fetchProblemForEdit();
    }, [problemId, navigate]);

    function isSamePosition(a: Position, b: Position) {
        return a.x === b.x && a.y === b.y;
    }

    function removePosition(stones: Position[], position: Position) {
        return stones.filter((stone) => !isSamePosition(stone, position));
    }

    function handleBoardSelect(position: Position) {
        if (boardMode === "BLACK") {
            const alreadyExists = blackStones.some((stone) =>
                isSamePosition(stone, position),
            );

            if (alreadyExists) {
                return;
            }

            setWhiteStones((prev) => removePosition(prev, position));
            setBlackStones((prev) => [...prev, position]);
            setBoardMode("WHITE");
        } else if (boardMode === "WHITE") {
            const alreadyExists = whiteStones.some((stone) =>
                isSamePosition(stone, position),
            );

            if (alreadyExists) {
                return;
            }

            setBlackStones((prev) => removePosition(prev, position));
            setWhiteStones((prev) => [...prev, position]);
            setBoardMode("BLACK");
        } else if (boardMode === "ERASE") {
            setBlackStones((prev) => removePosition(prev, position));
            setWhiteStones((prev) => removePosition(prev, position));
        } else if (boardMode === "ANSWER") {
            setAnswerPosition(position);
        }
    }

    async function handleUpdateProblem() {
        if (answerPosition === null) {
            alert("정답 위치를 선택해주세요.");
            return;
        }

        const response = await authFetch(`/api/problems/${problemId}`, {
            method: "PUT",
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

            if (response.status === 403) {
                alert("문제를 수정할 권한이 없습니다.");
                return;
            }

            if (response.status === 404) {
                alert("존재하지 않는 문제입니다.");
                navigate("/problems");
                return;
            }

            alert("문제 수정에 실패했습니다.");
            return;
        }

        navigate(`/problems/${problemId}`);
    }

    return (
        <div>
            <h1>문제 수정</h1>

            <div>
                <label>제목</label>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
            </div>

            <div>
                <label>설명</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>

            <div>
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

            <h2>바둑판 설정</h2>

            <div>
                <button onClick={() => setBoardMode("BLACK")}>흑돌</button>
                <button onClick={() => setBoardMode("WHITE")}>백돌</button>
                <button onClick={() => setBoardMode("ERASE")}>지우기</button>
                <button onClick={() => setBoardMode("ANSWER")}>
                    정답 위치
                </button>
            </div>

            <p>현재 모드: {boardMode}</p>

            <GoBoard
                blackStones={blackStones}
                whiteStones={whiteStones}
                onSelect={handleBoardSelect}
            />

            <p>흑돌 개수: {blackStones.length}</p>
            <p>백돌 개수: {whiteStones.length}</p>

            {answerPosition && (
                <p>
                    정답 위치: ({answerPosition.x}, {answerPosition.y})
                </p>
            )}

            <button
                className="problem-form-submit"
                onClick={handleUpdateProblem}>
                수정 완료
            </button>
        </div>
    );
}

export default ProblemEditPage;
