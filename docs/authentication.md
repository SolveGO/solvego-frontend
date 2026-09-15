# Browser authentication

Access Tokens exist only in the in-memory store observed by React's
`useSyncExternalStore`. No Access or Refresh Token is written to localStorage or
sessionStorage. Startup removes a legacy `localStorage.accessToken` if present,
but never authenticates with it.

AuthProvider restores authentication with the HttpOnly Refresh cookie on startup.
ProtectedRoute waits during CHECKING, renders retry UI on ERROR, and navigates to
login only on ANONYMOUS. An initial Refresh 401 is anonymous; an outage is ERROR.

Login, refresh and logout send JSON, `credentials: "include"`, and
`X-SolveGO-CSRF: 1`. The browser supplies Origin and handles Set-Cookie.
JavaScript does not read the Refresh cookie. General API calls send Bearer Access
and `credentials: "omit"`.

`authFetch` keeps its existing URL/options and Response-based interface:

1. Send the original request with the current Access Token.
2. On 401, reuse a newer token if another request already refreshed it; otherwise
   await a shared in-tab Refresh Promise.
3. Retry the original request at most once with the new token. No recursive retry.
4. Refresh 401 clears memory authentication. Refresh 403/5xx, invalid responses,
   or network failures do not revoke authentication. They return a non-success
   Response to existing callers (503 for network/invalid-response failures).
5. A second 401 from the general API is returned without another refresh or an
   automatic server logout. General 403/5xx responses never trigger refresh.

The current callers send replayable JSON bodies. Streaming/one-shot request bodies
need separate handling before using this automatic retry wrapper.

Logout immediately clears the local Access Token and blocks automatic refresh.
It waits for an older refresh response before sending server logout. An auth
generation check prevents that old response from restoring memory authentication.
A server logout failure is displayed with a retry button: cookie/session revocation
has not been confirmed. Login also waits for prior refresh cookie responses.

Rotation, reuse detection, Web Locks, BroadcastChannel and Access blacklists are
not implemented. Tabs do not synchronously mirror login/logout; a tab with an old
Access Token may continue until expiry. There is no cross-device logout operation.

## Environments

`.env.development` sets `VITE_API_BASE_URL=http://localhost:8080`. Vite's default
frontend URL is `http://localhost:5173`; keep both hosts as localhost. Environment
variables supplied by the shell can override the file, and Vite may pick another
port if 5173 is occupied, so verify the startup URL against the backend CORS list.

Production's API setting stays in the deployment workflow. Backend prod requires
an explicit `CORS_ALLOWED_ORIGINS` containing the real frontend Origin, and uses
HttpOnly/Secure/SameSite=None cookies scoped to `/api/auth` with no Domain.
Cross-site cookie blocking must be checked in real browsers before deployment.

Run `npm run test:run`, `npm run build`, and `npm run lint`.
API tests cover single refresh, one replay, concurrent/late 401s, memory restoration,
confirmed-authentication failures versus outages, and logout/refresh races. Context
and ProtectedRoute tests cover startup/loading/error/anonymous transitions. Existing
AI page/rules tests remain unchanged.
