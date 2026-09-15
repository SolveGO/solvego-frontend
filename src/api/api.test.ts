import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const json = (body: object, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json" },
});
const deferred = () => {
    let resolve!: (response: Response) => void;
    const promise = new Promise<Response>(r => { resolve = r; });
    return { promise, resolve };
};

async function setup() {
    const api = await import("./api");
    const store = await import("./authSession");
    store.setAuthState({ accessToken: "old-access", status: "AUTHENTICATED" });
    return { api, store };
}

beforeEach(() => { vi.resetModules(); vi.stubGlobal("fetch", vi.fn()); localStorage.clear(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("메모리 인증과 자동 갱신", () => {
    it("로그인은 쿠키 credentials/CSRF를 보내고 Access를 메모리에만 저장한다", async () => {
        const { api, store } = await setup();
        vi.mocked(fetch).mockResolvedValue(json({ accessToken: "login-access" }));
        await api.loginSession("alice", "password");
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/auth/login"), {
            method: "POST", credentials: "include",
            headers: { "Content-Type": "application/json", "X-SolveGO-CSRF": "1" },
            body: JSON.stringify({ username: "alice", password: "password" }),
        });
        expect(store.getAuthState().accessToken).toBe("login-access");
        expect(localStorage.getItem("accessToken")).toBeNull();
    });

    it("정상 API는 쿠키 없이 현재 Bearer를 전송한다", async () => {
        const { api } = await setup();
        vi.mocked(fetch).mockResolvedValue(json({ ok: true }));
        await api.authFetch("/api/problems");
        const options = vi.mocked(fetch).mock.calls[0][1]!;
        expect(new Headers(options.headers).get("Authorization")).toBe("Bearer old-access");
        expect(options.credentials).toBe("omit");
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("401 후 단일 갱신과 원래 POST의 정확히 한 번 재전송", async () => {
        const { api } = await setup();
        vi.mocked(fetch).mockResolvedValueOnce(json({}, 401))
            .mockResolvedValueOnce(json({ accessToken: "new-access" }))
            .mockResolvedValueOnce(json({ saved: true }));
        const body = JSON.stringify({ moves: [{ player: "BLACK", moveType: "PASS", position: null }] });
        const result = await api.authFetch("/api/ai/game/next-move", {
            method: "POST", body, headers: new Headers({ "Content-Type": "application/json" }),
        });
        expect(result.status).toBe(200);
        expect(fetch).toHaveBeenCalledTimes(3);
        const calls = vi.mocked(fetch).mock.calls;
        expect(calls[1][0]).toContain("/api/auth/refresh");
        expect(calls[1][1]?.credentials).toBe("include");
        expect(calls[2][0]).toBe(calls[0][0]);
        expect(calls[2][1]?.method).toBe("POST");
        expect(calls[2][1]?.body).toBe(body);
        expect(new Headers(calls[2][1]?.headers).get("Authorization")).toBe("Bearer new-access");
    });

    it("동시 401은 같은 refresh Promise를 공유한다", async () => {
        const { api } = await setup();
        const pending = deferred();
        vi.mocked(fetch).mockImplementation(async (url, options) => {
            if (String(url).endsWith("/auth/refresh")) return pending.promise;
            return new Headers(options?.headers).get("Authorization") === "Bearer new-access"
                ? json({ ok: true }) : json({}, 401);
        });
        const requests = [api.authFetch("/a"), api.authFetch("/b"), api.authFetch("/c")];
        await vi.waitFor(() => expect(vi.mocked(fetch).mock.calls.filter(c => String(c[0]).endsWith("/refresh"))).toHaveLength(1));
        pending.resolve(json({ accessToken: "new-access" }));
        const results = await Promise.all(requests);
        expect(results.every(r => r.ok)).toBe(true);
        expect(fetch).toHaveBeenCalledTimes(7);
    });

    it("늦은 이전 Access의 401은 이미 갱신된 Access로 재전송한다", async () => {
        const { api } = await setup();
        const late = deferred();
        vi.mocked(fetch).mockResolvedValueOnce(json({}, 401)).mockReturnValueOnce(late.promise)
            .mockResolvedValueOnce(json({ accessToken: "new-access" }))
            .mockResolvedValueOnce(json({})).mockResolvedValueOnce(json({}));
        const first = api.authFetch("/first");
        const second = api.authFetch("/late");
        await first;
        late.resolve(json({}, 401));
        await second;
        expect(vi.mocked(fetch).mock.calls.filter(c => String(c[0]).endsWith("/refresh"))).toHaveLength(1);
    });

    it("재전송도 401이면 반복 갱신하거나 세션을 폐기하지 않는다", async () => {
        const { api, store } = await setup();
        vi.mocked(fetch).mockResolvedValueOnce(json({}, 401))
            .mockResolvedValueOnce(json({ accessToken: "new-access" })).mockResolvedValueOnce(json({}, 401));
        expect((await api.authFetch("/protected")).status).toBe(401);
        expect(fetch).toHaveBeenCalledTimes(3);
        expect(store.getAuthState().status).toBe("AUTHENTICATED");
    });

    it("refresh 401만 인증을 종료하고 재귀 갱신하지 않는다", async () => {
        const { api, store } = await setup();
        vi.mocked(fetch).mockResolvedValue(json({}, 401));
        expect((await api.authFetch("/protected")).status).toBe(401);
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(store.getAuthState()).toEqual({ accessToken: null, status: "ANONYMOUS" });
    });

    it.each([403, 502, 503, 504])("refresh %s 오류는 인증 종료로 처리하지 않는다", async status => {
        const { api, store } = await setup();
        vi.mocked(fetch).mockResolvedValueOnce(json({}, 401)).mockResolvedValueOnce(json({}, status));
        expect((await api.authFetch("/protected")).status).toBe(status);
        expect(store.getAuthState().accessToken).toBe("old-access");
        expect(store.getAuthState().status).toBe("AUTHENTICATED");
    });

    it("refresh 네트워크 실패 후 다음 요청에서 복구할 수 있다", async () => {
        const { api, store } = await setup();
        vi.mocked(fetch).mockResolvedValueOnce(json({}, 401)).mockRejectedValueOnce(new TypeError("offline"));
        expect((await api.authFetch("/protected")).status).toBe(503);
        expect(store.getAuthState().status).toBe("AUTHENTICATED");
        vi.mocked(fetch).mockResolvedValueOnce(json({}, 401)).mockResolvedValueOnce(json({ accessToken: "recovered" })).mockResolvedValueOnce(json({}));
        expect((await api.authFetch("/protected")).ok).toBe(true);
    });

    it.each([403, 502, 504])("일반 API의 %s는 갱신하지 않는다", async status => {
        const { api } = await setup();
        vi.mocked(fetch).mockResolvedValue(json({}, status));
        expect((await api.authFetch("/protected")).status).toBe(status);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("앱 초기화는 저장된 옛 Access를 제거하고 Refresh 쿠키로 복원한다", async () => {
        const api = await import("./api");
        const store = await import("./authSession");
        localStorage.setItem("accessToken", "legacy");
        vi.mocked(fetch).mockResolvedValue(json({ accessToken: "restored" }));
        await Promise.all([api.restoreSession(), api.restoreSession()]);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(store.getAuthState()).toEqual({ accessToken: "restored", status: "AUTHENTICATED" });
        expect(localStorage.getItem("accessToken")).toBeNull();
    });

    it("초기화 네트워크 실패는 ERROR이며 다시 복원할 수 있다", async () => {
        const api = await import("./api");
        const store = await import("./authSession");
        vi.mocked(fetch).mockRejectedValueOnce(new TypeError("offline"));
        await api.restoreSession();
        expect(store.getAuthState().status).toBe("ERROR");
        vi.mocked(fetch).mockResolvedValueOnce(json({ accessToken: "restored" }));
        await api.restoreSession();
        expect(store.getAuthState().status).toBe("AUTHENTICATED");
    });

    it("로그아웃은 쿠키 엔드포인트를 호출하고 늦은 refresh가 Access를 되살리지 못한다", async () => {
        const { api, store } = await setup();
        const pending = deferred();
        vi.mocked(fetch).mockReturnValueOnce(pending.promise).mockResolvedValueOnce(new Response(null, { status: 204 }));
        const refresh = api.refreshAccessToken();
        const rejected = expect(refresh).rejects.toThrow("인증 상태가 변경");
        const logout = api.logoutSession();
        expect(store.getAuthState().accessToken).toBeNull();
        pending.resolve(json({ accessToken: "late" }));
        await rejected;
        await logout;
        expect(store.getAuthState().status).toBe("ANONYMOUS");
        expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining("/api/auth/logout"), expect.objectContaining({ credentials: "include" }));
    });

    it("서버 로그아웃 실패는 오류를 반환하며 재시도 가능하다", async () => {
        const { api, store } = await setup();
        vi.mocked(fetch).mockResolvedValueOnce(json({}, 503)).mockResolvedValueOnce(new Response(null, { status: 204 }));
        await expect(api.logoutSession()).rejects.toMatchObject({ status: 503 });
        expect(store.getAuthState().accessToken).toBeNull();
        await api.logoutSession();
        expect(fetch).toHaveBeenCalledTimes(2);
    });
    it("초기 Refresh 401은 비로그인 상태로 복원을 완료한다", async () => {
        const api = await import("./api");
        const store = await import("./authSession");
        vi.mocked(fetch).mockResolvedValue(json({}, 401));
        await api.restoreSession();
        expect(store.getAuthState()).toEqual({ accessToken: null, status: "ANONYMOUS" });
    });

    it("로그인 실패가 초기 인증 확인을 영구 대기 상태로 남기지 않는다", async () => {
        const api = await import("./api");
        const store = await import("./authSession");
        vi.mocked(fetch).mockResolvedValue(json({}, 401));
        await expect(api.loginSession("wrong", "password")).rejects.toMatchObject({ status: 401 });
        expect(store.getAuthState().status).toBe("ANONYMOUS");
    });

    it("잘못된 갱신 성공 응답은 기존 토큰을 변경하거나 재전송하지 않는다", async () => {
        const { api, store } = await setup();
        vi.mocked(fetch).mockResolvedValueOnce(json({}, 401)).mockResolvedValueOnce(json({ accessToken: null }));
        expect((await api.authFetch("/protected")).status).toBe(503);
        expect(store.getAuthState().accessToken).toBe("old-access");
        expect(fetch).toHaveBeenCalledTimes(2);
    });

});
