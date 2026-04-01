interface Row {
  articleId: string
  _count: { articleId: number }
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
            <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              #
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Article ID
            </th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Views
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {rows.map((row, idx) => (
            <tr
              key={row.articleId}
              className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30"
            >
              <td className="px-6 py-3 text-neutral-400">{idx + 1}</td>
              <td className="px-6 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-400">
                {row.articleId}
              </td>
              <td className="px-6 py-3 text-right font-semibold">
                {row._count.articleId?.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="text-center py-10 text-neutral-400 text-sm">
          No data yet
        </p>
      )}
    </div>
  )
}
