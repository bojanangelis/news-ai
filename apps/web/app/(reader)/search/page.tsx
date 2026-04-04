import type { Metadata } from "next"
import { SearchResults } from "@/components/feed/search-results"

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false },
}

interface Props {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, category, page } = await searchParams

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          {q ? `Резултати за „${q}"` : "Пребарување"}
        </h1>
      </div>
      <SearchResults
        initialQuery={q ?? ""}
        category={category}
        page={page ? parseInt(page, 10) : 1}
      />
    </div>
  )
}
