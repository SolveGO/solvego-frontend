// In-memory store consumed by React via useSyncExternalStore. Nothing is persisted.
export type AuthStatus = "CHECKING" | "AUTHENTICATED" | "ANONYMOUS" | "ERROR";
type AuthState = { accessToken: string | null; status: AuthStatus };
let state: AuthState = { accessToken: null, status: "CHECKING" };
const listeners = new Set<() => void>();

export const getAuthState = () => state;
export function subscribeAuth(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}
export function setAuthState(next: AuthState) {
    state = next;
    listeners.forEach(listener => listener());
}
