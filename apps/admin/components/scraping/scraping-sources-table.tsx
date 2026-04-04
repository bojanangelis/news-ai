"use client";

import React, { useState, useEffect } from "react";
import { scrapingSourcesApi } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  maxPagesPerRun: number;
  maxArticlesPerRun: number;
  lastScrapedAt: string | null;
  lastSuccessAt: string | null;
  status: Status;
  errorMessage: string | null;
  notes: string | null;
  consecutiveErrors: number;
  totalArticlesSaved: number;
  healthScore: number | null;
  defaultCategoryId: string | null;
  defaultCategory: { id: string; name: string; slug: string } | null;
  createdAt: string;
  createdBy?: { name: string; email: string };
}

interface ScrapingLog {
  id: string;
  status: LogStatus;
  articlesFound: number;
  articlesSaved: number;
  articlesSkipped: number;
  articlesFailed: number;
  pagesVisited: number;
  feedUrl: string | null;
  durationMs: number;
  errorMessage: string | null;
  details: string | null;
  createdAt: string;
}

interface HealthEntry {
  sourceId: string;
  name: string;
  status: string;
  healthScore: number | null;
  lastScrapedAt: string | null;
  consecutiveErrors: number;
  totalArticlesSaved: number;
  avgArticlesLast7Runs: number;
  lastRunArticlesFound: number;
  lastRunArticlesSaved: number;
  isOverdue: boolean;
  warnings: string[];
}

interface Props {
  sources: ScrapingSourceRow[];
}

// ─── Style maps ───────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function healthDot(score: number | null, consecutiveErrors: number): string {
  if (consecutiveErrors >= 3) return "bg-red-500";
  if (score === null) return "bg-neutral-300 dark:bg-neutral-600";
  if (score >= 80) return "bg-green-500";
  if (score >= 55) return "bg-yellow-400";
  return "bg-red-500";
}

function healthTitle(score: number | null, consecutiveErrors: number): string {
  if (consecutiveErrors >= 3) return `${consecutiveErrors} consecutive errors`;
  if (score === null) return "No runs yet";
  return `Health score: ${score}/100`;
}

function isOverdue(src: ScrapingSourceRow): boolean {
  if (!src.lastScrapedAt || !src.isActive) return false;
  const elapsed = Date.now() - new Date(src.lastScrapedAt).getTime();
  return elapsed > src.scrapeIntervalMinutes * 60_000 * 2;
}

function fmtDuration(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function fmtInterval(minutes: number): string {
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60}h`;
  if (minutes >= 60) return `${(minutes / 60).toFixed(1)}h`;
  return `${minutes}m`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const emptyForm = {
  name: "",
  url: "",
  scrapeIntervalMinutes: 60,
  maxPagesPerRun: 1,
  maxArticlesPerRun: 50,
  notes: "",
  defaultCategoryId: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ScrapingSourcesTable({ sources: initial }: Props) {
  const [sources, setSources] = useState(initial);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<typeof emptyForm>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [scrapingId, setScrapingId] = useState<string | null>(null);
  const [scrapingAll, setScrapingAll] = useState(false);
  const [recategorizing, setRecategorizing] = useState(false);
  const [backfillingImages, setBackfillingImages] = useState(false);
  const [logsSourceId, setLogsSourceId] = useState<string | null>(null);
  const [logs, setLogs] = useState<ScrapingLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthEntry[]>([]);
  const [healthOpen, setHealthOpen] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const { toast, confirm } = useToast();

  useEffect(() => {
    fetch(`${API_URL}/v1/categories`, { credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        const list = res?.data ?? res;
        if (Array.isArray(list)) setCategories(list);
      })
      .catch(() => {});
  }, []);

  // ── Create ───────────────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!form.name || !form.url) return;
    setSaving(true);
    try {
      const res = await scrapingSourcesApi.create({
        name: form.name,
        url: form.url,
        scrapeIntervalMinutes: form.scrapeIntervalMinutes,
        maxPagesPerRun: form.maxPagesPerRun,
        maxArticlesPerRun: form.maxArticlesPerRun,
        notes: form.notes || undefined,
        defaultCategoryId: form.defaultCategoryId || undefined,
      }) as { data?: ScrapingSourceRow } | ScrapingSourceRow;
      const created = ("data" in res ? res.data : res) as ScrapingSourceRow;
      setSources((prev) => [created, ...prev]);
      setShowNew(false);
      setForm(emptyForm);
      toast.success("Source added", created.name);
    } catch (e) {
      toast.error("Failed to create source", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle ───────────────────────────────────────────────────────────────────

  async function handleToggle(id: string) {
    try {
      const res = await scrapingSourcesApi.toggle(id) as { data: ScrapingSourceRow } | ScrapingSourceRow;
      const updated = "data" in res ? res.data : res;
      setSources((prev) => prev.map((s) => s.id === id ? { ...s, isActive: updated.isActive } : s));
    } catch (e) {
      toast.error("Failed to toggle source", e instanceof Error ? e.message : undefined);
    }
  }

  // ── Scrape Now ───────────────────────────────────────────────────────────────

  async function handleScrapeNow(id: string) {
    setScrapingId(id);
    try {
      const res = await scrapingSourcesApi.scrapeNow(id) as
        { data: { status: string; articlesFound: number; articlesSaved: number } } |
        { status: string; articlesFound: number; articlesSaved: number };
      const result = "data" in res ? res.data : res;
      const newStatus: Status = result.status === "ERROR" ? "ERROR" : "ACTIVE";
      setSources((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, status: newStatus, lastScrapedAt: new Date().toISOString(), lastSuccessAt: result.status === "SUCCESS" ? new Date().toISOString() : s.lastSuccessAt }
            : s,
        ),
      );
      if (result.status === "ERROR") {
        toast.error("Scrape completed with errors", `Found ${result.articlesFound} · Saved ${result.articlesSaved}`);
      } else {
        toast.success("Scrape complete", `Found ${result.articlesFound} · Saved ${result.articlesSaved}`);
      }
      if (logsSourceId === id) await openLogs(id);
    } catch (e) {
      toast.error("Scrape failed", e instanceof Error ? e.message : undefined);
    } finally {
      setScrapingId(null);
    }
  }

  // ── Scrape All ───────────────────────────────────────────────────────────────

  async function handleScrapeAll() {
    const ok = await confirm({
      title: "Scrape all active sources?",
      description: "This will trigger an immediate scrape across all active sources. It may take several minutes.",
      confirmLabel: "Scrape all",
    });
    if (!ok) return;
    setScrapingAll(true);
    try {
      const res = await fetch(`${API_URL}/v1/admin/scraping-sources/scrape-all`, {
        method: "POST",
        credentials: "include",
      }).then(r => r.json());
      const data = res?.data ?? res;
      toast.success("Scrape all complete", `${data.succeeded}/${data.total} succeeded · ${data.failed} failed`);
      const srcRes = await fetch(`${API_URL}/v1/admin/scraping-sources`, { credentials: "include" }).then(r => r.json());
      const list: ScrapingSourceRow[] = srcRes?.data ?? srcRes;
      if (Array.isArray(list)) setSources(list);
    } catch (e) {
      toast.error("Scrape all failed", e instanceof Error ? e.message : undefined);
    } finally {
      setScrapingAll(false);
    }
  }

  // ── Backfill images ───────────────────────────────────────────────────────────

  async function handleBackfillImages() {
    const ok = await confirm({
      title: "Backfill missing images?",
      description: "Will fetch og:image for up to 100 articles that have no image. Makes HTTP requests to each article page.",
      confirmLabel: "Start backfill",
    });
    if (!ok) return;
    setBackfillingImages(true);
    try {
      const res = await fetch(`${API_URL}/v1/admin/scraping-sources/backfill-images?limit=100`, {
        method: "POST",
        credentials: "include",
      }).then(r => r.json());
      toast.success("Image backfill complete", `${res.updated ?? 0} updated · ${res.failed ?? 0} no image found`);
    } catch (e) {
      toast.error("Backfill failed", e instanceof Error ? e.message : undefined);
    } finally {
      setBackfillingImages(false);
    }
  }

  // ── Recategorize ─────────────────────────────────────────────────────────────

  async function handleRecategorize() {
    const ok = await confirm({
      title: "Re-run keyword categorization?",
      description: "Will update category assignments for all published articles based on title keywords. Safe to run multiple times.",
      confirmLabel: "Recategorize all",
    });
    if (!ok) return;
    setRecategorizing(true);
    try {
      const res = await fetch(`${API_URL}/v1/admin/scraping-sources/recategorize`, {
        method: "POST",
        credentials: "include",
      }).then(r => r.json());
      const data = res?.data ?? res;
      const breakdown = Object.entries(data.breakdown as Record<string, number>)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => `${name} +${count}`)
        .join(" · ");
      toast.success(`Recategorized ${data.updated} articles`, breakdown || `${data.unmatched} unmatched`);
    } catch (e) {
      toast.error("Recategorization failed", e instanceof Error ? e.message : undefined);
    } finally {
      setRecategorizing(false);
    }
  }

  // ── Health ───────────────────────────────────────────────────────────────────

  async function fetchHealth() {
    setHealthLoading(true);
    try {
      const res = await fetch(`${API_URL}/v1/admin/scraping-sources/health`, {
        credentials: "include",
      }).then((r) => r.json());
      const list = res?.data ?? res;
      if (Array.isArray(list)) setHealth(list);
    } catch {} finally {
      setHealthLoading(false);
    }
  }

  function toggleHealth() {
    if (!healthOpen && health.length === 0) fetchHealth();
    setHealthOpen((o) => !o);
  }

  // ── Logs ─────────────────────────────────────────────────────────────────────

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

  // ── Edit ─────────────────────────────────────────────────────────────────────

  async function handleEdit(id: string) {
    setSaving(true);
    try {
      const res = await scrapingSourcesApi.update(id, editForm as unknown as Record<string, unknown>) as
        { data: ScrapingSourceRow } | ScrapingSourceRow;
      const updated = "data" in res ? res.data : res;
      setSources((prev) => prev.map((s) => s.id === id ? { ...s, ...updated } : s));
      setEditingId(null);
      toast.success("Source updated");
    } catch (e) {
      toast.error("Failed to update source", e instanceof Error ? e.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Delete this scraping source?",
      description: "All logs for this source will also be deleted. This cannot be undone.",
      confirmLabel: "Delete source",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await scrapingSourcesApi.delete(id);
      setSources((prev) => prev.filter((s) => s.id !== id));
      if (logsSourceId === id) closeLogs();
      toast.success("Source deleted");
    } catch (e) {
      toast.error("Failed to delete source", e instanceof Error ? e.message : undefined);
    }
  }

  const activeSource = sources.find((s) => s.id === logsSourceId);
  const activeCount = sources.filter((s) => s.isActive).length;
  const errorCount = sources.filter((s) => s.status === "ERROR").length;

  return (
    <div className="space-y-4">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {!showNew && (
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 px-4 text-sm text-neutral-500 hover:border-accent hover:text-accent transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add source
          </button>
        )}

        <button
          onClick={handleScrapeAll}
          disabled={scrapingAll || activeCount === 0}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent/10 text-accent px-4 text-sm font-medium hover:bg-accent/20 disabled:opacity-50 transition-colors"
        >
          {scrapingAll ? (
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          {scrapingAll ? "Scraping all…" : `Scrape all (${activeCount})`}
        </button>

        <button
          onClick={handleRecategorize}
          disabled={recategorizing}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 px-4 text-sm text-neutral-600 dark:text-neutral-400 hover:border-accent hover:text-accent disabled:opacity-50 transition-colors"
        >
          {recategorizing ? (
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          )}
          {recategorizing ? "Recategorizing…" : "Recategorize all"}
        </button>

        <button
          onClick={handleBackfillImages}
          disabled={backfillingImages}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-700 px-4 text-sm text-neutral-600 dark:text-neutral-400 hover:border-accent hover:text-accent disabled:opacity-50 transition-colors"
        >
          {backfillingImages ? (
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
          {backfillingImages ? "Fetching images…" : "Backfill images"}
        </button>

        {/* Summary badges */}
        <span className="text-xs text-neutral-500">{sources.length} sources · {activeCount} active</span>
        {errorCount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
            {errorCount} in error
          </span>
        )}
      </div>

      {/* ── Health panel ── */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <button
          onClick={toggleHealth}
          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors"
        >
          <svg
            className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${healthOpen ? "rotate-90" : ""}`}
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span>Health overview</span>
          {healthLoading && (
            <svg className="h-3 w-3 animate-spin text-neutral-400 ml-1" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          {health.length > 0 && !healthLoading && (() => {
            const warnings = health.filter(h => h.warnings.length > 0 || h.consecutiveErrors >= 3 || h.isOverdue);
            const healthy = health.length - warnings.length;
            return (
              <span className="ml-auto flex items-center gap-3 text-xs font-normal text-neutral-500">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  {healthy} healthy
                </span>
                {warnings.length > 0 && (
                  <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                    <span className="h-2 w-2 rounded-full bg-yellow-400" />
                    {warnings.length} need attention
                  </span>
                )}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); fetchHealth(); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); fetchHealth(); } }}
                  className="cursor-pointer hover:text-accent"
                  title="Refresh health data"
                >
                  ↺
                </span>
              </span>
            );
          })()}
        </button>

        {healthOpen && (
          <div className="border-t border-neutral-200 dark:border-neutral-800">
            {health.length === 0 && !healthLoading ? (
              <p className="px-4 py-6 text-sm text-center text-neutral-400">No data yet — health data loads from active sources.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-900/40 text-neutral-500">
                    <th className="px-4 py-2 text-left font-medium">Source</th>
                    <th className="px-4 py-2 text-center font-medium">Score</th>
                    <th className="px-4 py-2 text-center font-medium">Last run</th>
                    <th className="px-4 py-2 text-center font-medium">Avg/7 runs</th>
                    <th className="px-4 py-2 text-left font-medium">Warnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {health.map((h) => {
                    const dot = h.consecutiveErrors >= 3 ? "bg-red-500"
                      : h.isOverdue ? "bg-yellow-400"
                      : h.healthScore === null ? "bg-neutral-300 dark:bg-neutral-600"
                      : h.healthScore >= 80 ? "bg-green-500"
                      : h.healthScore >= 55 ? "bg-yellow-400"
                      : "bg-red-500";
                    return (
                      <tr key={h.sourceId} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/20">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${dot}`} />
                            <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[180px]">{h.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {h.healthScore !== null ? (
                            <span className={`font-mono font-medium ${h.healthScore >= 80 ? "text-green-600 dark:text-green-400" : h.healthScore >= 55 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                              {h.healthScore}
                            </span>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center text-neutral-500">
                          <span title={`Found: ${h.lastRunArticlesFound} · Saved: ${h.lastRunArticlesSaved}`}>
                            {h.lastRunArticlesSaved > 0 ? `+${h.lastRunArticlesSaved}` : h.lastRunArticlesFound > 0 ? `0/${h.lastRunArticlesFound}` : "—"}
                          </span>
                          {h.lastScrapedAt && (
                            <span className="block text-neutral-400">{timeAgo(h.lastScrapedAt)}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center text-neutral-500 font-mono">
                          {h.avgArticlesLast7Runs > 0 ? h.avgArticlesLast7Runs : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          {h.warnings.length > 0 ? (
                            <ul className="space-y-0.5">
                              {h.warnings.map((w, i) => (
                                <li key={i} className="text-yellow-700 dark:text-yellow-400">{w}</li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-green-600 dark:text-green-400">OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── Add form ── */}
      {showNew && (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-4">
          <h3 className="font-semibold text-sm">New Scraping Source</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Name", key: "name", placeholder: "e.g. Sloboden Pechat" },
              { label: "URL", key: "url", placeholder: "https://example.com/feed" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">{label}</label>
                <input
                  placeholder={placeholder}
                  value={(form as unknown as Record<string, string>)[key]}
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
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Max pages per run</label>
              <input type="number" min={1} max={10} value={form.maxPagesPerRun}
                onChange={(e) => setForm((f) => ({ ...f, maxPagesPerRun: +e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              <p className="text-xs text-neutral-400 mt-1">Follow RSS pagination (1 = no pagination)</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Max articles per run</label>
              <input type="number" min={1} max={500} value={form.maxArticlesPerRun}
                onChange={(e) => setForm((f) => ({ ...f, maxArticlesPerRun: +e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Default Category</label>
              <select value={form.defaultCategoryId}
                onChange={(e) => setForm((f) => ({ ...f, defaultCategoryId: e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50">
                <option value="">Auto (keyword routing)</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Notes (optional)</label>
              <input placeholder="Any notes" value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
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

      {/* ── Sources table ── */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide w-6" />
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide">Source</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide">Category</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide">Interval</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide">Last Scraped</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide">Total Saved</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {sources.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-neutral-400 text-sm">
                  No scraping sources yet. Add one to get started.
                </td>
              </tr>
            ) : (
              sources.map((src) => (
                <React.Fragment key={src.id}>
                  <tr
                    className={[
                      "transition-colors",
                      logsSourceId === src.id
                        ? "bg-accent/5"
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-900/30",
                    ].join(" ")}
                  >
                    {/* Health dot */}
                    <td className="px-4 py-3">
                      <span
                        title={healthTitle(src.healthScore, src.consecutiveErrors ?? 0)}
                        className={`block h-2.5 w-2.5 rounded-full ${healthDot(src.healthScore, src.consecutiveErrors ?? 0)}`}
                      />
                    </td>

                    {/* Name + URL */}
                    <td className="px-4 py-3 font-medium">
                      <div>{src.name}</div>
                      <a href={src.url} target="_blank" rel="noopener noreferrer"
                        className="font-mono text-xs text-accent hover:underline truncate block max-w-[200px]">
                        {src.url}
                      </a>
                      {src.notes && (
                        <div className="text-xs text-neutral-400 mt-0.5 truncate max-w-[200px]">{src.notes}</div>
                      )}
                      {/* Overdue warning */}
                      {isOverdue(src) && (
                        <div className="text-xs text-orange-500 mt-0.5">⚠ Overdue</div>
                      )}
                      {/* Consecutive errors warning */}
                      {(src.consecutiveErrors ?? 0) >= 3 && (
                        <div className="text-xs text-red-500 mt-0.5">✗ {src.consecutiveErrors} consecutive errors</div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 text-xs text-neutral-500">
                      {src.defaultCategory
                        ? <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-medium">{src.defaultCategory.name}</span>
                        : <span className="text-neutral-300 dark:text-neutral-600 italic">Auto (keyword)</span>
                      }
                    </td>

                    {/* Interval */}
                    <td className="px-4 py-3 text-neutral-500 text-xs">
                      <div>{fmtInterval(src.scrapeIntervalMinutes)}</div>
                      <div className="text-neutral-400">p{src.maxPagesPerRun ?? 1} · {src.maxArticlesPerRun ?? 50} art</div>
                    </td>

                    {/* Last scraped */}
                    <td className="px-4 py-3 text-neutral-500 text-xs">
                      <div title={src.lastScrapedAt ? new Date(src.lastScrapedAt).toLocaleString() : undefined}>
                        {timeAgo(src.lastScrapedAt)}
                      </div>
                      {src.lastSuccessAt && src.lastSuccessAt !== src.lastScrapedAt && (
                        <div className="text-neutral-400" title={new Date(src.lastSuccessAt).toLocaleString()}>
                          ✓ {timeAgo(src.lastSuccessAt)}
                        </div>
                      )}
                    </td>

                    {/* Total saved */}
                    <td className="px-4 py-3 text-neutral-500 text-xs">
                      {(src.totalArticlesSaved ?? 0).toLocaleString()}
                    </td>

                    {/* Status */}
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

                    {/* Active toggle */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(src.id)}
                        className={[
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                          src.isActive ? "bg-accent" : "bg-neutral-200 dark:bg-neutral-700",
                        ].join(" ")}
                      >
                        <span className={[
                          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200",
                          src.isActive ? "translate-x-4" : "translate-x-0",
                        ].join(" ")} />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleScrapeNow(src.id)}
                          disabled={scrapingId === src.id}
                          title="Scrape now"
                          className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent/80 disabled:opacity-50 transition-colors"
                        >
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
                          {scrapingId === src.id ? "…" : "Scrape"}
                        </button>

                        <button
                          onClick={() => logsSourceId === src.id ? closeLogs() : openLogs(src.id)}
                          className={[
                            "text-xs transition-colors",
                            logsSourceId === src.id
                              ? "text-accent font-medium"
                              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100",
                          ].join(" ")}
                        >
                          Logs
                        </button>

                        <button
                          onClick={() => {
                            setEditingId(src.id);
                            setEditForm({
                              name: src.name,
                              url: src.url,
                              scrapeIntervalMinutes: src.scrapeIntervalMinutes,
                              maxPagesPerRun: src.maxPagesPerRun ?? 1,
                              maxArticlesPerRun: src.maxArticlesPerRun ?? 50,
                              notes: src.notes ?? "",
                              defaultCategoryId: src.defaultCategoryId ?? "",
                            });
                          }}
                          className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(src.id)}
                          className="text-xs text-red-500 hover:text-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* ── Inline edit row ── */}
                  {editingId === src.id && (
                    <tr key={`${src.id}-edit`} className="bg-neutral-50 dark:bg-neutral-900/40">
                      <td colSpan={9} className="px-4 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-4xl">
                          {(["name", "url", "notes"] as const).map((key) => (
                            <div key={key}>
                              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1 capitalize">{key}</label>
                              <input
                                value={(editForm as Record<string, string>)[key] ?? ""}
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
                            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Max pages per run</label>
                            <input type="number" min={1} max={10} value={editForm.maxPagesPerRun ?? 1}
                              onChange={(e) => setEditForm((f) => ({ ...f, maxPagesPerRun: +e.target.value }))}
                              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Max articles per run</label>
                            <input type="number" min={1} max={500} value={editForm.maxArticlesPerRun ?? 50}
                              onChange={(e) => setEditForm((f) => ({ ...f, maxArticlesPerRun: +e.target.value }))}
                              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Default Category</label>
                            <select
                              value={editForm.defaultCategoryId ?? ""}
                              onChange={(e) => setEditForm((f) => ({ ...f, defaultCategoryId: e.target.value }))}
                              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                            >
                              <option value="">Auto (keyword routing)</option>
                              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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

                  {/* ── Logs panel ── */}
                  {logsSourceId === src.id && (
                    <tr key={`${src.id}-logs`}>
                      <td colSpan={9} className="px-4 pb-4 pt-0">
                        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">

                          {/* Log panel header */}
                          <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800">
                            <div className="flex items-center gap-2">
                              <svg className="h-4 w-4 text-neutral-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                                Scrape logs — <span className="text-neutral-900 dark:text-neutral-100">{activeSource?.name}</span>
                              </span>
                            </div>
                            <button
                              onClick={() => handleScrapeNow(src.id)}
                              disabled={scrapingId === src.id}
                              className="h-7 px-3 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
                            >
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
                                    className="w-full flex flex-wrap items-center gap-2 px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors"
                                  >
                                    {/* Status */}
                                    <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${LOG_STATUS_STYLES[log.status]}`}>
                                      {log.status}
                                    </span>

                                    {/* Article counts */}
                                    <span className="text-xs text-neutral-500 shrink-0">
                                      {log.articlesFound} found
                                    </span>
                                    <span className="text-xs text-green-600 dark:text-green-400 shrink-0">
                                      {log.articlesSaved} saved
                                    </span>
                                    {(log.articlesSkipped ?? 0) > 0 && (
                                      <span className="text-xs text-neutral-400 shrink-0">
                                        {log.articlesSkipped} dup
                                      </span>
                                    )}
                                    {(log.articlesFailed ?? 0) > 0 && (
                                      <span className="text-xs text-red-500 shrink-0">
                                        {log.articlesFailed} failed
                                      </span>
                                    )}

                                    {/* Pages */}
                                    {(log.pagesVisited ?? 1) > 1 && (
                                      <span className="text-xs text-neutral-400 shrink-0">
                                        {log.pagesVisited}p
                                      </span>
                                    )}

                                    {/* Duration */}
                                    <span className="text-xs text-neutral-400 shrink-0">
                                      {fmtDuration(log.durationMs)}
                                    </span>

                                    {/* Error snippet */}
                                    {log.errorMessage && (
                                      <span className="text-xs text-red-500 truncate flex-1 min-w-0">{log.errorMessage}</span>
                                    )}

                                    {/* Timestamp */}
                                    <span className="text-xs text-neutral-400 ml-auto shrink-0">
                                      {new Date(log.createdAt).toLocaleString()}
                                    </span>

                                    {/* Chevron */}
                                    <svg
                                      className={`h-3.5 w-3.5 text-neutral-400 transition-transform shrink-0 ${expandedLog === log.id ? "rotate-180" : ""}`}
                                      fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>

                                  {/* Expanded details */}
                                  {expandedLog === log.id && (
                                    <div className="px-4 pb-4 space-y-2">
                                      {log.feedUrl && log.feedUrl !== src.url && (
                                        <p className="text-xs text-neutral-500">
                                          Feed URL: <a href={log.feedUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-mono">{log.feedUrl}</a>
                                        </p>
                                      )}
                                      {log.details && (
                                        <pre className="text-xs bg-neutral-950 text-green-400 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap wrap-break-word leading-relaxed max-h-80 overflow-y-auto">
                                          {log.details}
                                        </pre>
                                      )}
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
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
