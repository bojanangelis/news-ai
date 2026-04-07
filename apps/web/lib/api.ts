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
  isBreaking?: boolean;
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

// ─── Authors ─────────────────────────────────────────────────────────────────

export function getAuthor(slug: string) {
  return apiFetch<{
    data: {
      id: string;
      displayName: string;
      slug: string;
      bio: string | null;
      avatarUrl: string | null;
      twitterUrl: string | null;
      linkedInUrl: string | null;
      websiteUrl: string | null;
      isVerified: boolean;
      _count: { articles: number };
    };
  }>(`/authors/${slug}`, { revalidate: 3600 });
}

// ─── Topics ───────────────────────────────────────────────────────────────────

export function getTopics() {
  return apiFetch<{ data: unknown[] }>("/topics", { revalidate: 3600 });
}

// ─── Ads ──────────────────────────────────────────────────────────────────────

export function getActiveAds(params: {
  placement: string;
  device?: string;
  category?: string;
  page?: string;
}) {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  ).toString();

  return apiFetch<{ data: { data: unknown[] } }>(`/ads/active?${qs}`, {
    revalidate: 30, // short cache since ads rotate
  });
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export function getSubscriptionPricing() {
  return apiFetch<{
    data: {
      monthly: { price: number; currency: string; label: string };
      yearly: {
        price: number;
        currency: string;
        label: string;
        perDay: number;
        savingsVsMonthly: number;
        freeMonthsEquivalent: number;
      };
      trialDays: number;
    };
  }>("/subscription/pricing", { revalidate: 3600 });
}

export function getSubscriptionStatus(token: string) {
  return apiFetch<{
    data: {
      isPremium: boolean;
      status: string | null;
      plan: string | null;
      expiresAt: string | null;
      trialEndsAt: string | null;
      daysLeft: number | null;
      trialDaysLeft: number | null;
      cancelledAt: string | null;
    };
  }>("/subscription/status", {
    revalidate: 0,
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export function getArticleSummary(articleId: string, sessionId?: string) {
  const qs = sessionId ? `?sessionId=${sessionId}` : "";
  return apiFetch<{
    data: {
      id: string;
      bullets: string[];
      sources: string[];
      audioUrl: string | null;
      generatedAt: string;
    } | null;
    meta: { isPremium: boolean; remaining: number | null };
  }>(`/articles/${articleId}/summary${qs}`, { revalidate: 0 });
}

// ─── Briefing ─────────────────────────────────────────────────────────────────

export function getDailyBriefing() {
  return apiFetch<{
    data: {
      date: string;
      generatedAt: string;
      articles: {
        id: string;
        title: string;
        slug: string;
        excerpt: string | null;
        coverImageUrl: string | null;
        publishedAt: string;
        category: { name: string; slug: string };
      }[];
    } | null;
  }>("/briefing/today", { revalidate: 300 });
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
