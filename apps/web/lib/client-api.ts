"use client";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

async function clientFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/v1${path}`, {
    ...options,
    credentials: "include", // send cookies
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(
      typeof error.message === "string" ? error.message : "Request failed",
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    clientFetch("/auth/register", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    clientFetch("/auth/login", { method: "POST", body: JSON.stringify(data) }),

  logout: () => clientFetch("/auth/logout", { method: "POST" }),

  me: () => clientFetch("/auth/me"),

  refresh: () => clientFetch("/auth/refresh", { method: "POST" }),
};

// ─── Bookmarks ────────────────────────────────────────────────────────────────

export const bookmarksApi = {
  list: (page = 1) => clientFetch(`/bookmarks?page=${page}`),

  add: (articleId: string) =>
    clientFetch("/bookmarks", { method: "POST", body: JSON.stringify({ articleId }) }),

  remove: (articleId: string) =>
    clientFetch(`/bookmarks/${articleId}`, { method: "DELETE" }),
};

// ─── Topics ───────────────────────────────────────────────────────────────────

export const topicsApi = {
  follow: (topicId: string) =>
    clientFetch(`/topics/${topicId}/follow`, { method: "POST" }),

  unfollow: (topicId: string) =>
    clientFetch(`/topics/${topicId}/follow`, { method: "DELETE" }),
};

// ─── Search ───────────────────────────────────────────────────────────────────

export const searchApi = {
  search: (q: string, params: { category?: string; page?: number; limit?: number } = {}) => {
    const qs = new URLSearchParams({
      q,
      ...Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)]),
      ),
    }).toString();
    return clientFetch(`/search?${qs}`);
  },
};
