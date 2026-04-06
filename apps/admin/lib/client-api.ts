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
  create: (data: { name: string; url: string; scrapeIntervalMinutes?: number; maxPagesPerRun?: number; maxArticlesPerRun?: number; notes?: string; defaultCategoryId?: string }) =>
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

export const adsAdminApi = {
  // Dashboard
  getDashboard: () => adminClientFetch("/admin/ads/dashboard"),

  // Advertisers
  listAdvertisers: () => adminClientFetch("/admin/ads/advertisers"),
  createAdvertiser: (data: unknown) =>
    adminClientFetch("/admin/ads/advertisers", { method: "POST", body: JSON.stringify(data) }),
  updateAdvertiser: (id: string, data: unknown) =>
    adminClientFetch(`/admin/ads/advertisers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  // Campaigns
  listCampaigns: (advertiserId?: string) =>
    adminClientFetch(`/admin/ads/campaigns${advertiserId ? `?advertiserId=${advertiserId}` : ""}`),
  createCampaign: (data: unknown) =>
    adminClientFetch("/admin/ads/campaigns", { method: "POST", body: JSON.stringify(data) }),

  // Ads
  list: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : "";
    return adminClientFetch(`/admin/ads${qs}`);
  },
  get: (id: string) => adminClientFetch(`/admin/ads/${id}`),
  create: (data: unknown) =>
    adminClientFetch("/admin/ads", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: unknown) =>
    adminClientFetch(`/admin/ads/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  updateStatus: (id: string, data: { status: string; rejectionReason?: string }) =>
    adminClientFetch(`/admin/ads/${id}/status`, { method: "PATCH", body: JSON.stringify(data) }),
  toggle: (id: string) =>
    adminClientFetch(`/admin/ads/${id}/toggle`, { method: "POST" }),
  delete: (id: string) =>
    adminClientFetch(`/admin/ads/${id}`, { method: "DELETE" }),
  getStats: (id: string, params?: { from?: string; to?: string }) => {
    const qs = params ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : "";
    return adminClientFetch(`/admin/ads/${id}/stats${qs}`);
  },
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
