import type { Metadata } from "next";
import Link from "next/link";
import { ArticlesTable } from "@/components/articles/articles-table";
import { adminFetch } from "@/lib/api";

export const metadata: Metadata = { title: "Articles" };

interface Props {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
}

export default async function ArticlesPage({ searchParams }: Props) {
  const { page = "1", status, q } = await searchParams;

  const qs = new URLSearchParams({
    page,
    limit: "25",
    ...(status && { status }),
    ...(q && { q }),
  }).toString();

  let data: { data: unknown[]; total: number; totalPages: number } = { data: [], total: 0, totalPages: 0 };
  try {
    const res = await adminFetch<typeof data>(`/articles?${qs}`);
    data = res;
  } catch {
    // handled below
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Articles</h1>
          <p className="text-sm text-neutral-500 mt-1">{data.total?.toLocaleString()} total articles</p>
        </div>
        <Link
          href="/articles/new"
          className="inline-flex h-10 items-center rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent/90 transition-colors gap-2"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Article
        </Link>
      </div>

      <ArticlesTable articles={data.data as import("@repo/types").ArticleSummary[]} total={data.total} totalPages={data.totalPages} currentPage={parseInt(page, 10)} />
    </div>
  );
}
