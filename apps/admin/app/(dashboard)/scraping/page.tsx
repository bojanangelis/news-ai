import type { Metadata } from "next";
import { adminFetch } from "@/lib/api";
import { ScrapingSourcesTable } from "@/components/scraping/scraping-sources-table";

export const metadata: Metadata = { title: "Scraping Sources" };

export const revalidate = 30;

interface ScrapingSourceRow {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  scrapeIntervalMinutes: number;
  maxPagesPerRun: number;
  maxArticlesPerRun: number;
  lastScrapedAt: string | null;
  lastSuccessAt: string | null;
  status: "PENDING" | "ACTIVE" | "ERROR" | "PAUSED";
  errorMessage: string | null;
  notes: string | null;
  consecutiveErrors: number;
  totalArticlesSaved: number;
  healthScore: number | null;
  defaultCategoryId: string | null;
  defaultCategory: { id: string; name: string; slug: string } | null;
  createdAt: string;
  createdBy?: { name: string; email: string };
}

export default async function ScrapingPage() {
  let sources: ScrapingSourceRow[] = [];
  try {
    const res = await adminFetch<{ data: ScrapingSourceRow[] }>("/admin/scraping-sources");
    sources = res.data ?? [];
  } catch {
    // handled below — table shows empty state
  }

  const active = sources.filter((s) => s.isActive).length;
  const errors = sources.filter((s) => s.status === "ERROR").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scraping Sources</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {sources.length} source{sources.length !== 1 ? "s" : ""} &middot; {active} active
            {errors > 0 && (
              <span className="ml-2 text-red-500 font-medium">&middot; {errors} in error</span>
            )}
          </p>
        </div>
      </div>

      <ScrapingSourcesTable sources={sources} />
    </div>
  );
}
