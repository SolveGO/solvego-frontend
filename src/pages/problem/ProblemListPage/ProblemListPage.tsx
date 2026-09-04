import { useEffect, useState } from "react";
import ProblemCard from "../../../components/ProblemCard/ProblemCard";
import { API_BASE_URL } from "../../../api/api";
import "./ProblemListPage.css";

type Problem = {
    problemId: number;
    title: string;
    creatorName: string;
};

type ProblemPageResponse = {
    problems: Problem[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
};

function ProblemListPage() {
    const [problems, setProblems] = useState<Problem[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    const groupSize = 5;

    useEffect(() => {
        async function fetchProblems() {
            const response = await fetch(
                `${API_BASE_URL}/api/problems?page=${page}&size=10`,
            );

            const data: ProblemPageResponse = await response.json();

            setProblems(data.problems);
            setTotalPages(data.totalPages);
        }

        fetchProblems();
    }, [page]);

    function getPageNumbers(currentPage: number, totalPages: number): number[] {
        const currentGroup = Math.floor(currentPage / groupSize);

        const start = currentGroup * groupSize;
        const end = Math.min(start + groupSize, totalPages);

        return Array.from({ length: end - start }, (_, i) => start + i);
    }

    const currentGroup = Math.floor(page / groupSize);
    const groupStart = currentGroup * groupSize;
    const groupEnd = Math.min(groupStart + groupSize - 1, totalPages - 1);

    function handlePreviousGroup() {
        if (groupStart === 0) {
            return;
        }

        setPage(groupStart - groupSize);
    }

    function handleNextGroup() {
        if (groupEnd >= totalPages - 1) {
            return;
        }

        setPage(groupStart + groupSize);
    }

    return (
        <div className="problem-list-page">
            <h1>문제 목록</h1>

            <div className="problem-list">
                {problems.map((problem) => (
                    <ProblemCard
                        key={problem.problemId}
                        problemId={problem.problemId}
                        title={problem.title}
                        creatorName={problem.creatorName}
                    />
                ))}
            </div>

            {totalPages > 0 && (
                <div className="pagination">
                    <button
                        className="page-button"
                        onClick={() => setPage(0)}
                        disabled={page === 0}>
                        처음
                    </button>

                    <button
                        className="page-button"
                        onClick={handlePreviousGroup}
                        disabled={groupStart === 0}>
                        이전
                    </button>

                    {getPageNumbers(page, totalPages).map((pageNumber) => (
                        <button
                            key={pageNumber}
                            className={
                                page === pageNumber
                                    ? "page-button active"
                                    : "page-button"
                            }
                            onClick={() => setPage(pageNumber)}>
                            {pageNumber + 1}
                        </button>
                    ))}

                    <button
                        className="page-button"
                        onClick={handleNextGroup}
                        disabled={groupEnd === totalPages - 1}>
                        다음
                    </button>

                    <button
                        className="page-button"
                        onClick={() => setPage(totalPages - 1)}
                        disabled={page === totalPages - 1}>
                        끝
                    </button>
                </div>
            )}
        </div>
    );
}

export default ProblemListPage;
