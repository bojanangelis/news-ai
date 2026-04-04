import Link from "next/link";

interface Row {
  articleId: string;
  views: number;
  article: { id: string; title: string; slug: string; category: { name: string } } | null;
}

export function TopArticlesTable({ rows }: { rows: Row[] }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
        <h2 className="font-semibold">Top Articles (Last 7 Days)</h2>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 dark:bg-neutral-800/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide w-8">#</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Title</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">Category</th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide">Views</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {rows.map((row, idx) => (
            <tr key={row.articleId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
              <td className="px-6 py-3 text-neutral-400 text-xs">{idx + 1}</td>
              <td className="px-6 py-3 max-w-sm">
                {row.article ? (
                  <Link
                    href={`/articles/${row.article.id}`}
                    className="font-medium hover:text-accent transition-colors line-clamp-1"
                  >
                    {row.article.title}
                  </Link>
                ) : (
                  <span className="font-mono text-xs text-neutral-400">{row.articleId}</span>
                )}
              </td>
              <td className="px-6 py-3 text-neutral-400 text-xs">
                {row.article?.category.name ?? "—"}
              </td>
              <td className="px-6 py-3 text-right font-semibold tabular-nums">
                {row.views.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="text-center py-10 text-neutral-400 text-sm">No view data yet</p>
      )}
    </div>
  );
}
