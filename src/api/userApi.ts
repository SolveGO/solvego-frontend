import { authFetch } from "./api";

export type MyPageProblem = {
    problemId: number;
    title: string;
};

export type MyPageData = {
    username: string;
    joinedAt: string;
    registeredProblemCount: number;
    solvedProblemCount: number;
    wrongProblemCount: number;
    problems: MyPageProblem[];
};

export class UserApiError extends Error {
    status: number;

    constructor(status: number) {
        super(`User API request failed: ${status}`);
        this.status = status;
    }
}

export async function requestMyPage(): Promise<MyPageData> {
    const response = await authFetch("/api/users/me");
    if (!response.ok) throw new UserApiError(response.status);
    return response.json();
}

export async function requestPasswordChange(
    currentPassword: string,
    newPassword: string,
): Promise<void> {
    const response = await authFetch("/api/users/me/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!response.ok) throw new UserApiError(response.status);
}

export async function requestAccountDeletion(): Promise<void> {
    const response = await authFetch("/api/users/me", { method: "DELETE" });
    if (!response.ok) throw new UserApiError(response.status);
}
