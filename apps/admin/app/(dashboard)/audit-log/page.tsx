import type { Metadata } from "next";
import { adminFetch } from "@/lib/api";
import type { AuditLogEntry } from "@repo/types";

export const metadata: Metadata = { title: "Audit Log" };

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function AuditLogPage({ searchParams }: Props) {
  const { page = "1" } = await searchParams;

  let entries: AuditLogEntry[] = [];
  try {
    const res = await adminFetch<{ data: AuditLogEntry[] }>(`/admin/audit-log?page=${page}&limit=50`);
    entries = res.data;
  } catch {
    // unavailable
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>

      <div className="rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800/50">
            <tr>
              {["Time", "User", "Action", "Entity", "ID"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30">
                <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-medium">{entry.userName}</td>
                <td className="px-4 py-3">
                  <code className="text-xs bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                    {entry.action}
                  </code>
                </td>
                <td className="px-4 py-3 text-neutral-500">{entry.entityType}</td>
                <td className="px-4 py-3 text-neutral-400 font-mono text-xs truncate max-w-[120px]">
                  {entry.entityId ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && (
          <p className="text-center py-12 text-neutral-400">No audit log entries</p>
        )}
      </div>
    </div>
  );
}
