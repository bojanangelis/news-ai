"use client";

import { useState, useEffect } from "react";
import { scrapingSourcesApi } from "@/lib/client-api";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

interface Category {
  id: string;
  name: string;
  slug: string;
}

type Status = "PENDING" | "ACTIVE" | "ERROR" | "PAUSED";
type LogStatus = "SUCCESS" | "PARTIAL" | "ERROR";

interface ScrapingSourceRow {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  scrapeIntervalMinutes: number;
  lastScrapedAt: string | null;
  status: Status;
  errorMessage: string | null;
  notes: string | null;
  defaultCategoryId: string | null;
  createdAt: string;
  createdBy?: { name: string; email: string };
}

interface ScrapingLog {
  id: string;
  status: LogStatus;
  articlesFound: number;
  articlesSaved: number;
  durationMs: number;
  errorMessage: string | null;
  details: string | null;
  createdAt: string;
}

interface Props {
  sources: ScrapingSourceRow[];
}

const SOURCE_STATUS_STYLES: Record<Status, string> = {
  PENDING: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  ACTIVE:  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  ERROR:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  PAUSED:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500",
};

const LOG_STATUS_STYLES: Record<LogStatus, string> = {
  SUCCESS: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  PARTIAL: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500",
  ERROR:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const emptyForm = { name: "", url: "", scrapeIntervalMinutes: 60, notes: "", defaultCategoryId: "" };

export function ScrapingSourcesTable({ sources: initial }: Props) {
  const [sources, setSources] = useState(initial);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<typeof emptyForm & { notes: string; defaultCategoryId: string }>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [scrapingId, setScrapingId] = useState<string | null>(null);
  const [logsSourceId, setLogsSourceId] = useState<string | null>(null);
  const [logs, setLogs] = useState<ScrapingLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/v1/categories`, { credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        const list = res?.data ?? res;
        if (Array.isArray(list)) setCategories(list);
      })
      .catch(() => {});
  }, []);

  async function handleCreate() {
    if (!form.name || !form.url) return;
    setSaving(true);
    try {
      const res = await scrapingSourcesApi.create({
        name: form.name, url: form.url,
        scrapeIntervalMinutes: form.scrapeIntervalMinutes,
        notes: form.notes || undefined,
        defaultCategoryId: form.defaultCategoryId || undefined,
      }) as { data?: ScrapingSourceRow } | ScrapingSourceRow;
      const created = "data" in res ? res.data! : res;
      setSources((prev) => [created, ...prev]);
      setShowNew(false);
      setForm(emptyForm);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create source");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string) {
    try {
      const res = await scrapingSourcesApi.toggle(id) as { data: ScrapingSourceRow } | ScrapingSourceRow;
      const updated = "data" in res ? res.data : res;
      setSources((prev) => prev.map((s) => s.id === id ? { ...s, isActive: updated.isActive } : s));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to toggle source");
    }
  }

  async function handleScrapeNow(id: string) {
    setScrapingId(id);
    try {
      const res = await scrapingSourcesApi.scrapeNow(id) as
        { data: { status: string; articlesFound: number } } |
        { status: string; articlesFound: number };
      const result = "data" in res ? res.data : res;
      const newStatus: Status =
        result.status === "SUCCESS" ? "ACTIVE"
        : result.status === "PARTIAL" ? "ACTIVE"
        : "ERROR";
      setSources((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: newStatus, lastScrapedAt: new Date().toISOString() } : s
        )
      );
      // Refresh logs if panel is open
      if (logsSourceId === id) await openLogs(id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Scrape failed");
    } finally {
      setScrapingId(null);
    }
  }

  async function openLogs(id: string) {
    setLogsSourceId(id);
    setLogsLoading(true);
    setExpandedLog(null);
    try {
      const res = await scrapingSourcesApi.getLogs(id) as { data: ScrapingLog[] } | ScrapingLog[];
      setLogs(Array.isArray(res) ? res : (res as { data: ScrapingLog[] }).data ?? []);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }

  function closeLogs() {
    setLogsSourceId(null);
    setLogs([]);
    setExpandedLog(null);
  }

  async function handleEdit(id: string) {
    setSaving(true);
    try {
      const res = await scrapingSourcesApi.update(id, editForm as Record<string, unknown>) as
        { data: ScrapingSourceRow } | ScrapingSourceRow;
      const updated = "data" in res ? res.data : res;
      setSources((prev) => prev.map((s) => s.id === id ? { ...s, ...updated } : s));
      setEditingId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update source");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this scraping source? This cannot be undone.")) return;
    try {
      await scrapingSourcesApi.delete(id);
      setSources((prev) => prev.filter((s) => s.id !== id));
      if (logsSourceId === id) closeLogs();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete source");
    }
  }

  const activeSource = sources.find((s) => s.id === logsSourceId);

  return (
    <div className="space-y-4">

      {/* ── Add form ── */}
      {showNew && (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-4">
          <h3 className="font-semibold text-sm">New Scraping Source</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Name", key: "name", placeholder: "e.g. TechCrunch" },
              { label: "URL", key: "url", placeholder: "https://techcrunch.com/feed" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">{label}</label>
                <input
                  placeholder={placeholder}
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Interval (minutes)</label>
              <input type="number" min={5} max={1440} value={form.scrapeIntervalMinutes}
                onChange={(e) => setForm((f) => ({ ...f, scrapeIntervalMinutes: +e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Notes (optional)</label>
              <input placeholder="Any notes" value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Default Category (optional)</label>
              <select value={form.defaultCategoryId}
                onChange={(e) => setForm((f) => ({ ...f, defaultCategoryId: e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50">
                <option value="">Auto (first active category)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCreate} disabled={saving || !form.name || !form.url}
              className="h-9 px-4 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50">
              {saving ? "Saving…" : "Add Source"}
            </button>
            <button onClick={() => { setShowNew(false); setForm(emptyForm); }}
              className="h-9 px-4 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showNew && (
        <button onClick={() => setShowNew(true)}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 px-4 text-sm text-neutral-500 hover:border-accent hover:text-accent transition-colors">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add scraping source
        </button>
      )}

      {/* ── Sources table ── */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide">Source</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide">URL</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide">Interval</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide">Last Scraped</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {sources.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-neutral-400 text-sm">
                  No scraping sources yet. Add one to get started.
                </td>
              </tr>
            ) : (
              sources.map((src) => (
                <>
                  <tr key={src.id}
                    className={[
                      "transition-colors",
                      logsSourceId === src.id
                        ? "bg-accent/5"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-900/30",
                    ].join(" ")}>
                    <td className="px-4 py-3 font-medium">
                      <div>{src.name}</div>
                      {src.notes && (
                        <div className="text-xs text-neutral-400 mt-0.5 truncate max-w-[160px]">{src.notes}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <a href={src.url} target="_blank" rel="noopener noreferrer"
                        className="font-mono text-xs text-accent hover:underline truncate block max-w-[200px]">
                        {src.url}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-neutral-500 text-xs">
                      {src.scrapeIntervalMinutes >= 60
                        ? `${src.scrapeIntervalMinutes / 60}h`
                        : `${src.scrapeIntervalMinutes}m`}
                    </td>
                    <td className="px-4 py-3 text-neutral-500 text-xs">
                      {src.lastScrapedAt
                        ? new Date(src.lastScrapedAt).toLocaleString()
                        : <span className="text-neutral-300 dark:text-neutral-600">Never</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_STATUS_STYLES[src.status]}`}>
                        {src.status}
                      </span>
                      {src.status === "ERROR" && src.errorMessage && (
                        <div className="text-xs text-red-500 mt-0.5 max-w-[180px] truncate" title={src.errorMessage}>
                          {src.errorMessage}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggle(src.id)}
                        className={[
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                          src.isActive ? "bg-accent" : "bg-neutral-200 dark:bg-neutral-700",
                        ].join(" ")}>
                        <span className={[
                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200",
                          src.isActive ? "translate-x-4" : "translate-x-0",
                        ].join(" ")} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Scrape Now */}
                        <button
                          onClick={() => handleScrapeNow(src.id)}
                          disabled={scrapingId === src.id}
                          title="Scrape now"
                          className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent/80 disabled:opacity-50 transition-colors">
                          {scrapingId === src.id ? (
                            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                          ) : (
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          )}
                          {scrapingId === src.id ? "Scraping…" : "Scrape"}
                        </button>

                        {/* Logs */}
                        <button
                          onClick={() => logsSourceId === src.id ? closeLogs() : openLogs(src.id)}
                          className={[
                            "text-xs transition-colors",
                            logsSourceId === src.id
                              ? "text-accent font-medium"
                              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100",
                          ].join(" ")}>
                          Logs
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => {
                            setEditingId(src.id);
                            setEditForm({ name: src.name, url: src.url, scrapeIntervalMinutes: src.scrapeIntervalMinutes, notes: src.notes ?? "", defaultCategoryId: src.defaultCategoryId ?? "" });
                          }}
                          className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                          Edit
                        </button>

                        {/* Delete */}
                        <button onClick={() => handleDelete(src.id)}
                          className="text-xs text-red-500 hover:text-red-700 transition-colors">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Inline edit */}
                  {editingId === src.id && (
                    <tr key={`${src.id}-edit`} className="bg-neutral-50 dark:bg-neutral-900/40">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
                          {(["name", "url", "notes"] as const).map((key) => (
                            <div key={key}>
                              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1 capitalize">{key}</label>
                              <input value={(editForm as Record<string, string>)[key] ?? ""}
                                onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                              />
                            </div>
                          ))}
                          <div>
                            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Interval (min)</label>
                            <input type="number" min={5} max={1440} value={editForm.scrapeIntervalMinutes ?? 60}
                              onChange={(e) => setEditForm((f) => ({ ...f, scrapeIntervalMinutes: +e.target.value }))}
                              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Default Category</label>
                            <select value={editForm.defaultCategoryId ?? ""}
                              onChange={(e) => setEditForm((f) => ({ ...f, defaultCategoryId: e.target.value }))}
                              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50">
                              <option value="">Auto (first active category)</option>
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-3 mt-3">
                          <button onClick={() => handleEdit(src.id)} disabled={saving}
                            className="h-8 px-4 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors disabled:opacity-50">
                            {saving ? "Saving…" : "Save"}
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="h-8 px-4 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Logs panel */}
                  {logsSourceId === src.id && (
                    <tr key={`${src.id}-logs`}>
                      <td colSpan={7} className="px-4 pb-4 pt-0">
                        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800">
                            <div className="flex items-center gap-2">
                              <svg className="h-4 w-4 text-neutral-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                                Scrape logs — <span className="text-neutral-900 dark:text-neutral-100">{activeSource?.name}</span>
                              </span>
                            </div>
                            <button onClick={() => handleScrapeNow(src.id)} disabled={scrapingId === src.id}
                              className="h-7 px-3 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors">
                              {scrapingId === src.id ? "Scraping…" : "Scrape Now"}
                            </button>
                          </div>

                          {logsLoading ? (
                            <div className="px-4 py-6 text-center text-sm text-neutral-400">Loading logs…</div>
                          ) : logs.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-neutral-400">
                              No scrape runs yet. Hit <strong>Scrape Now</strong> to see results.
                            </div>
                          ) : (
                            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                              {logs.map((log) => (
                                <div key={log.id}>
                                  <button
                                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors">
                                    {/* Status badge */}
                                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${LOG_STATUS_STYLES[log.status]}`}>
                                      {log.status}
                                    </span>
                                    {/* Articles */}
                                    <span className="text-xs text-neutral-500 shrink-0">
                                      {log.articlesFound} found
                                    </span>
                                    <span className="text-xs text-green-600 dark:text-green-400 shrink-0">
                                      {log.articlesSaved ?? 0} saved
                                    </span>
                                    {/* Duration */}
                                    <span className="text-xs text-neutral-400 shrink-0">
                                      {log.durationMs < 1000 ? `${log.durationMs}ms` : `${(log.durationMs / 1000).toFixed(1)}s`}
                                    </span>
                                    {/* Error snippet */}
                                    {log.errorMessage && (
                                      <span className="text-xs text-red-500 truncate flex-1">{log.errorMessage}</span>
                                    )}
                                    {/* Timestamp */}
                                    <span className="text-xs text-neutral-400 ml-auto shrink-0">
                                      {new Date(log.createdAt).toLocaleString()}
                                    </span>
                                    {/* Expand chevron */}
                                    <svg
                                      className={`h-3.5 w-3.5 text-neutral-400 transition-transform shrink-0 ${expandedLog === log.id ? "rotate-180" : ""}`}
                                      fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>

                                  {/* Expanded details */}
                                  {expandedLog === log.id && log.details && (
                                    <div className="px-4 pb-4">
                                      <pre className="text-xs bg-neutral-950 text-green-400 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed max-h-64 overflow-y-auto">
                                        {log.details}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
