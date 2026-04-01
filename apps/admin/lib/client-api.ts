"use client";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

export async function adminClientFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/v1${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(typeof error.message === "string" ? error.message : "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const articlesAdminApi = {
  publish: (id: string) =>
    adminClientFetch(`/articles/${id}/publish`, { method: "POST" }),
  archive: (id: string) =>
    adminClientFetch(`/articles/${id}/archive`, { method: "POST" }),
  create: (data: unknown) =>
    adminClientFetch("/articles", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: unknown) =>
    adminClientFetch(`/articles/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};

export const scrapingSourcesApi = {
  list: () => adminClientFetch("/admin/scraping-sources"),
  create: (data: { name: string; url: string; scrapeIntervalMinutes?: number; notes?: string; defaultCategoryId?: string }) =>
    adminClientFetch("/admin/scraping-sources", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    adminClientFetch(`/admin/scraping-sources/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  toggle: (id: string) =>
    adminClientFetch(`/admin/scraping-sources/${id}/toggle`, { method: "POST" }),
  scrapeNow: (id: string) =>
    adminClientFetch(`/admin/scraping-sources/${id}/scrape`, { method: "POST" }),
  getLogs: (id: string) =>
    adminClientFetch(`/admin/scraping-sources/${id}/logs?limit=30`),
  delete: (id: string) =>
    adminClientFetch(`/admin/scraping-sources/${id}`, { method: "DELETE" }),
};

export const mediaAdminApi = {
  upload: (formData: FormData) =>
    fetch(`${API_URL}/v1/media/upload`, {
      method: "POST",
      credentials: "include",
      body: formData,
    }).then((r) => r.json()),
  list: (page = 1) => adminClientFetch(`/media?page=${page}&limit=40`),
  delete: (id: string) => adminClientFetch(`/media/${id}`, { method: "DELETE" }),
};
