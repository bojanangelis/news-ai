import { getArticles } from "@/lib/api";
import type { ArticleSummary } from "@repo/types";
import { BreakingTicker } from "./breaking-news-ticker";

export async function BreakingNewsBanner() {
  let articles: ArticleSummary[] = [];

  try {
    const res = await getArticles({ isBreaking: true, limit: 5 });
    articles = (res.data?.data ?? []) as ArticleSummary[];
  } catch {
    return null;
  }

  if (articles.length === 0) return null;

  return <BreakingTicker articles={articles} />;
}
