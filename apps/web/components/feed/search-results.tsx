"use client"

import { useState, useEffect, useRef } from "react"
import { ArticleCard } from "@/components/article/article-card"
import { searchApi } from "@/lib/client-api"
import type { ArticleSummary } from "@repo/types"

interface Props {
  initialQuery: string
  category?: string
  page?: number
}

export function SearchResults({ initialQuery, category, page = 1 }: Props) {
  const [results, setResults] = useState<ArticleSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!initialQuery.trim()) {
      setResults([])
      return
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = (await searchApi.search(initialQuery, { category, page })) as {
          data: { results: ArticleSummary[]; total: number }
        }
        setResults(res.data.results)
        setTotal(res.data.total)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(debounceRef.current)
  }, [initialQuery, category, page])

  if (!initialQuery) {
    return (
      <div className="py-16 text-center text-neutral-400">
        <p className="text-sm">Внесете клучен збор за пребарување.</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-neutral-500 mb-6">
        {loading
          ? "Пребарување\u2026"
          : `${total.toLocaleString("mk-MK")} ${total === 1 ? "\u0440\u0435\u0437\u0443\u043b\u0442\u0430\u0442" : "\u0440\u0435\u0437\u0443\u043b\u0442\u0430\u0442\u0438"}`}
      </p>

      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="py-16 text-center text-neutral-400">
          <p className="text-lg font-medium">Нема резултати</p>
          <p className="text-sm mt-1">Обидете се со други клучни зборови.</p>
        </div>
      )}
    </div>
  )
}
