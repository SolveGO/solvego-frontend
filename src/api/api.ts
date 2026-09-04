export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function authFetch(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem("accessToken");

    return fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
            ...options.headers,
            ...(token && {
                Authorization: `Bearer ${token}`,
            }),
        },
    });
}
