const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

interface FetchOptions extends RequestInit {
  tags?: string[];
  revalidate?: number | false;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { tags, revalidate, ...init } = options;

  const res = await fetch(`${API_URL}/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
    next: {
      ...(tags && { tags }),
      ...(revalidate !== undefined && { revalidate }),
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── Homepage ─────────────────────────────────────────────────────────────────

export function getHomepageSections() {
  return apiFetch<{ data: unknown[] }>("/homepage", {
    tags: ["homepage"],
    revalidate: 60,
  });
}

// ─── Articles ─────────────────────────────────────────────────────────────────

export function getArticles(params: {
  category?: string;
  page?: number;
  limit?: number;
  authorSlug?: string;
}) {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  ).toString();

  return apiFetch<{ data: { data: unknown[]; total: number; totalPages: number } }>(
    `/articles?${qs}`,
    { revalidate: 120 },
  );
}

export function getArticle(slug: string) {
  return apiFetch<{ data: unknown }>(`/articles/${slug}`, {
    tags: [`article:${slug}`],
    revalidate: 300,
  });
}

// ─── Categories ───────────────────────────────────────────────────────────────

export function getCategories() {
  return apiFetch<{ data: unknown[] }>("/categories", { revalidate: 3600 });
}

export function getCategory(slug: string) {
  return apiFetch<{ data: { name: string; description: string | null; color: string | null } }>(
    `/categories/${slug}`,
    { revalidate: 3600 },
  );
}

// ─── Topics ───────────────────────────────────────────────────────────────────

export function getTopics() {
  return apiFetch<{ data: unknown[] }>("/topics", { revalidate: 3600 });
}

// ─── Search ───────────────────────────────────────────────────────────────────

export function searchArticles(params: {
  q: string;
  category?: string;
  page?: number;
  limit?: number;
}) {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  ).toString();

  return apiFetch<{ data: { results: unknown[]; total: number } }>(`/search?${qs}`, {
    revalidate: 0,
  });
}
