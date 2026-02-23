const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type FetchOptions = RequestInit & {
  token?: string;
};

async function request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((customHeaders as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, { headers, ...rest });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: "GET", token }),

  post: <T>(endpoint: string, data: unknown, token?: string) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(data), token }),

  patch: <T>(endpoint: string, data: unknown, token?: string) =>
    request<T>(endpoint, { method: "PATCH", body: JSON.stringify(data), token }),

  delete: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: "DELETE", token }),
};
