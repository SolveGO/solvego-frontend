import { Link } from "react-router-dom";
import "./ProblemCard.css";

type ProblemCardProps = {
    problemId: number;
    title: string;
    creatorName: string;
};

function ProblemCard(props: ProblemCardProps) {
    return (
        <Link className="problem-card" to={`/problems/${props.problemId}`}>
            <span className="problem-number">#{props.problemId}</span>

            <h2 className="problem-title">{props.title}</h2>

            <p className="problem-creator">작성자 {props.creatorName}</p>
        </Link>
    );
}

export default ProblemCard;
