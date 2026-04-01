import type { Metadata } from "next";
import { SearchResults } from "@/components/feed/search-results";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false },
};

interface Props {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, category, page } = await searchParams;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Search</h1>
      <SearchResults initialQuery={q ?? ""} category={category} page={page ? parseInt(page, 10) : 1} />
    </div>
  );
}
