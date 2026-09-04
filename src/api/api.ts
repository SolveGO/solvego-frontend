export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

let isHandlingUnauthorized = false;

export async function authFetch(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem("accessToken");

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
            ...options.headers,
            ...(token && {
                Authorization: `Bearer ${token}`,
            }),
        },
    });

    if (response.status === 401 && !isHandlingUnauthorized) {
        isHandlingUnauthorized = true;

        localStorage.removeItem("accessToken");

        alert("로그인이 만료되었습니다.");

        window.location.href = "/login";
    }

    return response;
}
