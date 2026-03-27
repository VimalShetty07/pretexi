const API_URL = "/api";

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

  put: <T>(endpoint: string, data: unknown, token?: string) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(data), token }),

  delete: <T>(endpoint: string, token?: string) =>
    request<T>(endpoint, { method: "DELETE", token }),

  /** Multipart POST (e.g. profile photo). Do not set Content-Type — browser sets boundary. */
  postForm: async <T>(endpoint: string, formData: FormData, token?: string): Promise<T> => {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${endpoint}`, { method: "POST", headers, body: formData });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { detail?: string }).detail || `API error: ${res.status}`);
    }
    return res.json() as Promise<T>;
  },
};
