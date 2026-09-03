import { useEffect, useState } from "react";
import ProblemCard from "../components/ProblemCard";
import { API_BASE_URL } from "../api/api";
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

    function getPageNumbers(
        currentPage: number,
        totalPages: number,
    ): (number | "...")[] {
        if (totalPages <= 9) {
            return Array.from({ length: totalPages }, (_, i) => i);
        }

        const pages: (number | "...")[] = [];

        // 첫 페이지
        pages.push(0);

        const start = Math.max(1, currentPage - 3);
        const end = Math.min(totalPages - 2, currentPage + 3);

        // 앞쪽 생략
        if (start > 1) {
            pages.push("...");
        }

        // 현재 페이지 주변
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        // 뒤쪽 생략
        if (end < totalPages - 2) {
            pages.push("...");
        }

        // 마지막 페이지
        pages.push(totalPages - 1);

        return pages;
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

            <div className="pagination">
                {getPageNumbers(page, totalPages).map((item, index) =>
                    item === "..." ? (
                        <span
                            key={`ellipsis-${index}`}
                            className="page-ellipsis">
                            ...
                        </span>
                    ) : (
                        <button
                            key={item}
                            className={
                                page === item
                                    ? "page-button active"
                                    : "page-button"
                            }
                            onClick={() => setPage(item)}>
                            {item + 1}
                        </button>
                    ),
                )}
            </div>
        </div>
    );
}

export default ProblemListPage;
