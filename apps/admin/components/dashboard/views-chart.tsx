interface Props {
  data: { date: string; views: number }[];
}

export function ViewsChart({ data }: Props) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.views), 1);

  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-semibold">Views — Last 7 Days</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Total: {data.reduce((s, d) => s + d.views, 0).toLocaleString()} views
          </p>
        </div>
      </div>

      <div className="flex items-end gap-2 h-36">
        {data.map((d) => {
          const pct = max > 0 ? Math.round((d.views / max) * 100) : 0;
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[10px] text-neutral-400 tabular-nums">
                {d.views > 0 ? d.views.toLocaleString() : ""}
              </span>
              <div className="w-full flex items-end" style={{ height: "96px" }}>
                <div
                  className="w-full rounded-t-md bg-blue-500/80 dark:bg-blue-400/70 transition-all"
                  style={{ height: `${Math.max(pct, d.views > 0 ? 4 : 0)}%` }}
                />
              </div>
              <span className="text-[11px] text-neutral-500 font-medium">{d.date}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
