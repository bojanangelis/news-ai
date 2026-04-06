interface Props {
  data: { name: string; articles: number }[];
}

export function CategoryBreakdown({ data }: Props) {
  const max = Math.max(...data.map((d) => d.articles), 1);
  const total = data.reduce((s, d) => s + d.articles, 0);

  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-6">
      <div className="mb-4">
        <h2 className="font-semibold">Articles by Category</h2>
        <p className="text-xs text-neutral-400 mt-0.5">{total.toLocaleString()} published total</p>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-neutral-400 py-4 text-center">No categories yet</p>
      ) : (
        <ul className="space-y-3">
          {data.map((d) => {
            const pct = Math.round((d.articles / max) * 100);
            const sharePct = total > 0 ? Math.round((d.articles / total) * 100) : 0;
            return (
              <li key={d.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate max-w-[60%]">{d.name}</span>
                  <span className="text-xs text-neutral-400 tabular-nums">
                    {d.articles.toLocaleString()} · {sharePct}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
