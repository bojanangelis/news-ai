"use client";

import { useState } from "react";
import { adminClientFetch } from "@/lib/client-api";

interface TopicRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  _count?: { followers: number; articles: number };
}

interface Props {
  topics: TopicRow[];
}

export function TopicsTable({ topics: initial }: Props) {
  const [topics, setTopics] = useState(initial);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "" });
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    setSaving(true);
    try {
      const res = await adminClientFetch<{ data: TopicRow }>("/topics", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setTopics((prev) => [...prev, res.data]);
      setShowNew(false);
      setForm({ name: "", slug: "", description: "" });
    } catch {
      // TODO: toast
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this topic? Followers will be unsubscribed.")) return;
    try {
      await adminClientFetch(`/topics/${id}`, { method: "DELETE" });
      setTopics((prev) => prev.filter((t) => t.id !== id));
    } catch {
      // TODO: toast
    }
  }

  return (
    <div className="space-y-4">
      {showNew && (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-4">
          <h3 className="font-semibold text-sm">New Topic</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Slug</label>
              <input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={saving || !form.name || !form.slug}
              className="h-9 px-4 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Create"}
            </button>
            <button
              onClick={() => setShowNew(false)}
              className="h-9 px-4 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!showNew && (
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 px-4 text-sm text-neutral-500 hover:border-accent hover:text-accent transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add topic
        </button>
      )}

      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide">Slug</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide">Followers</th>
              <th className="text-left px-4 py-3 font-medium text-neutral-500 text-xs uppercase tracking-wide">Articles</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {topics.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">No topics yet</td>
              </tr>
            ) : (
              topics.map((topic) => (
                <tr key={topic.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{topic.name}</td>
                  <td className="px-4 py-3 text-neutral-500 font-mono text-xs">{topic.slug}</td>
                  <td className="px-4 py-3 text-neutral-500">{topic._count?.followers?.toLocaleString() ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-500">{topic._count?.articles ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(topic.id)}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
