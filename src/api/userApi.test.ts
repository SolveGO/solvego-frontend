import { beforeEach, describe, expect, it, vi } from "vitest";

import { authFetch } from "./api";
import {
    requestAccountDeletion,
    requestMyPage,
    requestPasswordChange,
} from "./userApi";

vi.mock("./api", () => ({ authFetch: vi.fn() }));

describe("userApi", () => {
    beforeEach(() => vi.resetAllMocks());

    it("마이페이지 데이터를 인증 요청으로 조회한다", async () => {
        const data = {
            username: "solvego",
            joinedAt: "2026-01-02T03:04:00",
            registeredProblemCount: 1,
            solvedProblemCount: 2,
            wrongProblemCount: 1,
            problems: [],
        };
        vi.mocked(authFetch).mockResolvedValue(
            new Response(JSON.stringify(data), { status: 200 }),
        );

        await expect(requestMyPage()).resolves.toEqual(data);
        expect(authFetch).toHaveBeenCalledWith("/api/users/me");
    });

    it("현재 비밀번호와 새 비밀번호를 전송한다", async () => {
        vi.mocked(authFetch).mockResolvedValue(new Response(null, { status: 204 }));

        await requestPasswordChange("old", "new");

        expect(authFetch).toHaveBeenCalledWith("/api/users/me/password", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentPassword: "old", newPassword: "new" }),
        });
    });

    it("회원 탈퇴 요청을 전송한다", async () => {
        vi.mocked(authFetch).mockResolvedValue(new Response(null, { status: 204 }));

        await requestAccountDeletion();

        expect(authFetch).toHaveBeenCalledWith("/api/users/me", { method: "DELETE" });
    });
});
