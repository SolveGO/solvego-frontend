import { getAuthState, setAuthState } from "./authSession";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
let refreshPromise: Promise<string> | null = null;
let authGeneration = 0;
let sessionEnded = false;

export class AuthRequestError extends Error {
    public status: number;

    constructor(status: number, message = "인증 요청에 실패했습니다.") {
        super(message);
        this.status = status;
    }
}

async function cookieRequest(path: string, body: object = {}) {
    return fetch(`${API_BASE_URL}/api/auth/${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-SolveGO-CSRF": "1" },
        body: JSON.stringify(body),
    });
}

async function readAccessToken(response: Response) {
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !("accessToken" in data) ||
        typeof data.accessToken !== "string" || !data.accessToken) {
        throw new Error("잘못된 인증 응답입니다.");
    }
    return data.accessToken;
}

export function refreshAccessToken(): Promise<string> {
    if (sessionEnded) return Promise.reject(new AuthRequestError(401));
    if (refreshPromise) return refreshPromise;
    const generation = authGeneration;
    const pending = (async () => {
        const response = await cookieRequest("refresh");
        if (generation !== authGeneration) throw new Error("인증 상태가 변경되었습니다.");
        if (response.status === 401) {
            sessionEnded = true;
            authGeneration++;
            setAuthState({ accessToken: null, status: "ANONYMOUS" });
            throw new AuthRequestError(401, "로그인이 만료되었습니다.");
        }
        if (!response.ok) throw new AuthRequestError(response.status);
        const token = await readAccessToken(response);
        if (generation !== authGeneration) throw new Error("인증 상태가 변경되었습니다.");
        setAuthState({ accessToken: token, status: "AUTHENTICATED" });
        return token;
    })();
    refreshPromise = pending;
    // Attach cleanup to both outcomes without creating an unhandled rejected Promise.
    const clear = () => { if (refreshPromise === pending) refreshPromise = null; };
    void pending.then(clear, clear);
    return pending;
}

export async function restoreSession() {
    if (getAuthState().status !== "CHECKING" && getAuthState().status !== "ERROR") return;
    // Remove tokens left by older app versions; never restore them from browser storage.
    try { localStorage.removeItem("accessToken"); } catch { /* Storage may be disabled. */ }
    const generation = authGeneration;
    try {
        await refreshAccessToken();
    } catch {
        if (generation === authGeneration && getAuthState().status !== "ANONYMOUS") {
            setAuthState({ accessToken: null, status: "ERROR" });
        }
    }
}

export async function loginSession(username: string, password: string) {
    const previous = getAuthState();
    const generation = ++authGeneration;
    sessionEnded = true;
    // Finish older cookie responses before a login installs a new cookie.
    if (refreshPromise) await refreshPromise.catch(() => {});
    try {
        const response = await cookieRequest("login", { username, password });
        if (!response.ok) throw new AuthRequestError(response.status, "로그인에 실패했습니다.");
        const token = await readAccessToken(response);
        if (generation !== authGeneration) throw new Error("인증 상태가 변경되었습니다.");
        sessionEnded = false;
        setAuthState({ accessToken: token, status: "AUTHENTICATED" });
    } catch (error) {
        if (generation === authGeneration) {
            sessionEnded = previous.status !== "AUTHENTICATED";
            setAuthState(previous.status === "AUTHENTICATED" ? previous
                : { accessToken: null, status: "ANONYMOUS" });
        }
        throw error;
    }
}

export async function logoutSession() {
    ++authGeneration;
    sessionEnded = true;
    setAuthState({ accessToken: null, status: "ANONYMOUS" });
    if (refreshPromise) await refreshPromise.catch(() => {});
    const response = await cookieRequest("logout");
    if (!response.ok) throw new AuthRequestError(response.status, "서버 로그아웃에 실패했습니다. 다시 시도해주세요.");
}

export async function authFetch(url: string, options: RequestInit = {}) {
    const generation = authGeneration;
    const token = getAuthState().accessToken;
    const send = (accessToken: string | null) => {
        const headers = new Headers(options.headers);
        headers.delete("Authorization");
        if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
        return fetch(`${API_BASE_URL}${url}`, { ...options, credentials: "omit", headers });
    };
    const response = await send(token);
    if (response.status !== 401 || url.startsWith("/api/auth/") ||
        generation !== authGeneration || sessionEnded) return response;

    // A later 401 may belong to an older token whose refresh has already completed.
    const currentToken = getAuthState().accessToken;
    try {
        const newToken = currentToken && currentToken !== token
            ? currentToken : await refreshAccessToken();
        if (generation !== authGeneration) return response;
        // Deliberately no recursion: a second 401 is returned, never refreshed again.
        return await send(newToken);
    } catch (error) {
        // Keep the Response-based contract for existing callers. Only a refresh 401
        // changes authentication state; outages must not look like expired credentials.
        if (error instanceof AuthRequestError && error.status === 401) return response;
        const status = error instanceof AuthRequestError ? error.status : 503;
        return new Response(JSON.stringify({ message: "인증 갱신 요청을 완료하지 못했습니다." }), {
            status,
            headers: { "Content-Type": "application/json" },
        });
    }
}

export async function publicFetch(url: string, options: RequestInit = {}) {
    return fetch(`${API_BASE_URL}${url}`, { ...options, credentials: "omit" });
}
