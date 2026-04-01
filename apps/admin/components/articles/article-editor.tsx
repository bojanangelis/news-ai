"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { articlesAdminApi } from "@/lib/client-api";
import type { ArticleDetail, Category, ArticleAuthor } from "@repo/types";

interface Props {
  mode: "create" | "edit";
  article?: ArticleDetail;
  categories: Category[];
  authors: ArticleAuthor[];
}

export function ArticleEditor({ mode, article, categories, authors }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: article?.title ?? "",
    excerpt: article?.excerpt ?? "",
    categoryId: article?.category.id ?? "",
    authorId: article?.author.id ?? "",
    isPremium: article?.isPremium ?? false,
    status: "DRAFT",
    sections: article?.sections ?? [],
  });

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      if (mode === "create") {
        await articlesAdminApi.create(form);
        router.push("/articles");
      } else if (article) {
        await articlesAdminApi.update(article.id, form);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!article) return;
    setPublishing(true);
    try {
      await articlesAdminApi.publish(article.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main editor */}
        <div className="lg:col-span-2 space-y-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-6">
          <div>
            <label className="block text-sm font-medium mb-1.5">Title</label>
            <input type="text" value={form.title} onChange={set("title")} placeholder="Article title..."
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2.5 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-accent transition-colors" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Excerpt</label>
            <textarea value={form.excerpt} onChange={set("excerpt")} rows={3} placeholder="Brief summary of the article..."
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent transition-colors" />
          </div>

          <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-4 text-sm text-neutral-500 text-center">
            Rich text editor (Tiptap) — install <code className="bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-xs">@tiptap/react</code> and wire up here
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Publish panel */}
          <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-5 space-y-3">
            <h3 className="font-semibold text-sm">Publish</h3>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 transition-colors">
                {saving ? "Saving..." : "Save draft"}
              </button>
              {mode === "edit" && article && (
                <button onClick={handlePublish} disabled={publishing}
                  className="flex-1 h-9 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors">
                  {publishing ? "Publishing..." : "Publish"}
                </button>
              )}
            </div>
          </div>

          {/* Category */}
          <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-5">
            <label className="block text-sm font-medium mb-2">Category</label>
            <select value={form.categoryId} onChange={set("categoryId")}
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
              <option value="">Select category…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Author */}
          <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-5">
            <label className="block text-sm font-medium mb-2">Author</label>
            <select value={form.authorId} onChange={set("authorId")}
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
              <option value="">Select author…</option>
              {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {/* Premium toggle */}
          <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-5">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-medium">Premium Article</span>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, isPremium: !f.isPremium }))}
                className={[
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  form.isPremium ? "bg-accent" : "bg-neutral-200 dark:bg-neutral-700",
                ].join(" ")}
              >
                <span className={[
                  "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                  form.isPremium ? "translate-x-6" : "translate-x-1",
                ].join(" ")} />
              </button>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
