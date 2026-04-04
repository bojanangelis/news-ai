import type { Metadata } from "next";
import Link from "next/link";
import { adminFetch } from "@/lib/api";

export const metadata: Metadata = { title: "Audit Log" };
export const dynamic = "force-dynamic";

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  createdAt: string;
  userName: string;
  userEmail: string;
}

interface AuditLogResponse {
  total: number;
  page: number;
  totalPages: number;
  entries: AuditEntry[];
}

interface Props {
  searchParams: Promise<{ page?: string }>;
}

const LIMIT = 50;

function actionBadge(action: string) {
  const [domain] = action.split(".");
  const styles: Record<string, string> = {
    user:      "bg-blue-50   text-blue-700   dark:bg-blue-900/30  dark:text-blue-300",
    article:   "bg-green-50  text-green-700  dark:bg-green-900/30 dark:text-green-300",
    homepage:  "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    scraping:  "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    category:  "bg-pink-50   text-pink-700   dark:bg-pink-900/30  dark:text-pink-300",
  };
  const cls = styles[domain ?? ""] ?? "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300";
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold font-mono ${cls}`}>
      {action}
    </span>
  );
}

function JsonDiff({ label, value }: { label: string; value: unknown }) {
  if (!value) return null;
  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-[10px] font-semibold uppercase tracking-wide text-neutral-400 hover:text-neutral-600">
        {label}
      </summary>
      <pre className="mt-1 text-[10px] leading-relaxed bg-neutral-50 dark:bg-neutral-800 rounded p-2 overflow-x-auto text-neutral-600 dark:text-neutral-300 max-w-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

export default async function AuditLogPage({ searchParams }: Props) {
  const { page: pageStr = "1" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr, 10));

  let result: AuditLogResponse = { total: 0, page: 1, totalPages: 0, entries: [] };
  try {
    const res = await adminFetch<{ data: AuditLogResponse }>(
      `/admin/audit-log?page=${page}&limit=${LIMIT}`,
    );
    result = res.data;
  } catch {
    // handled below
  }

  const { entries, total, totalPages } = result;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {total.toLocaleString()} total events
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800/50">
            <tr>
              {["Time", "User", "Action", "Entity", "Changes"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 align-top">
                <td className="px-4 py-3 text-neutral-500 whitespace-nowrap text-xs">
                  {new Date(entry.createdAt).toLocaleString("mk-MK", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </td>
                <td className="px-4 py-3 min-w-[120px]">
                  <p className="font-medium text-sm leading-tight">{entry.userName}</p>
                  <p className="text-xs text-neutral-400 truncate max-w-[160px]">{entry.userEmail}</p>
                </td>
                <td className="px-4 py-3">{actionBadge(entry.action)}</td>
                <td className="px-4 py-3">
                  <p className="text-neutral-600 dark:text-neutral-300">{entry.entityType}</p>
                  {entry.entityId && (
                    <p className="font-mono text-[11px] text-neutral-400 truncate max-w-[110px]">
                      {entry.entityId}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <JsonDiff label="Before" value={entry.before} />
                  <JsonDiff label="After"  value={entry.after}  />
                  {!entry.before && !entry.after && (
                    <span className="text-neutral-300 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {entries.length === 0 && (
          <div className="py-16 text-center text-neutral-400">
            <p className="text-sm">No audit log entries yet.</p>
            <p className="text-xs mt-1 text-neutral-300">Events are recorded as admins take actions.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-neutral-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/audit-log?page=${page - 1}`}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                ← Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/audit-log?page=${page + 1}`}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
