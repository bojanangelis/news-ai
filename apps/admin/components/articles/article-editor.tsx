"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { articlesAdminApi } from "@/lib/client-api";
import type { Category, ArticleAuthor } from "@repo/types";

interface Section {
  _key: string;
  type: string;
  order: number;
  content?: string;
  level?: number;
  url?: string;
  caption?: string;
  attribution?: string;
}

interface ArticleData {
  id?: string;
  title?: string;
  slug?: string;
  excerpt?: string;
  status?: string;
  isPremium?: boolean;
  isBreaking?: boolean;
  ogImageUrl?: string;
  coverImageId?: string;
  categoryId?: string;
  authorId?: string;
  sections?: Section[];
  category?: { id: string; name: string }
  author?: { id: string; name: string }
  coverImage?: { url: string } | null
  publishedAt?: string | null
}

interface Props {
  mode: "create" | "edit";
  article?: ArticleData;
  categories: Category[];
  authors: ArticleAuthor[];
}

const SECTION_TYPES = ["PARAGRAPH", "HEADING", "QUOTE", "IMAGE", "DIVIDER"] as const;

let keyCounter = 0;
function newKey() { return `s-${++keyCounter}-${Date.now()}`; }

function makeSection(type: string): Section {
  return { _key: newKey(), type, order: 0, content: "", level: type === "HEADING" ? 2 : undefined };
}

function renderSectionPreview(section: Section) {
  switch (section.type) {
    case "HEADING":
      return (
        <div key={section._key} className={`font-bold text-neutral-900 dark:text-neutral-100 ${
          section.level === 1 ? "text-3xl mt-8 mb-4" :
          section.level === 2 ? "text-2xl mt-6 mb-3" :
          "text-xl mt-5 mb-2"
        }`}>
          {section.content || <span className="text-neutral-400 italic">Empty heading</span>}
        </div>
      );
    case "QUOTE":
      return (
        <blockquote key={section._key} className="border-l-4 border-accent pl-4 my-4 italic text-neutral-600 dark:text-neutral-400">
          <p>{section.content}</p>
          {section.attribution && <cite className="text-sm not-italic text-neutral-500 mt-1 block">— {section.attribution}</cite>}
        </blockquote>
      );
    case "IMAGE":
      return (
        <figure key={section._key} className="my-6">
          {section.url ? (
            <img src={section.url} alt={section.caption ?? ""} className="w-full rounded-xl object-cover max-h-96" />
          ) : (
            <div className="w-full h-48 bg-neutral-100 dark:bg-neutral-800 rounded-xl flex items-center justify-center text-neutral-400">No image URL</div>
          )}
          {section.caption && <figcaption className="text-sm text-neutral-500 mt-2 text-center">{section.caption}</figcaption>}
        </figure>
      );
    case "DIVIDER":
      return <hr key={section._key} className="my-8 border-neutral-200 dark:border-neutral-700" />;
    default:
      return (
        <p key={section._key} className="text-neutral-700 dark:text-neutral-300 leading-relaxed my-4 whitespace-pre-wrap">
          {section.content || <span className="text-neutral-400 italic">Empty paragraph</span>}
        </p>
      );
  }
}

export function ArticleEditor({ mode, article, categories, authors }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [title, setTitle] = useState(article?.title ?? "");
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? "");
  const [categoryId, setCategoryId] = useState(article?.category?.id ?? article?.categoryId ?? "");
  const [authorId, setAuthorId] = useState(article?.author?.id ?? article?.authorId ?? "");
  const [isPremium, setIsPremium] = useState(article?.isPremium ?? false);
  const [isBreaking, setIsBreaking] = useState(article?.isBreaking ?? false);
  const [ogImageUrl, setOgImageUrl] = useState(article?.ogImageUrl ?? "");
  const [sections, setSections] = useState<Section[]>(() =>
    (article?.sections ?? []).map((s) => ({ ...s, _key: newKey() }))
  );

  const coverImg = ogImageUrl || article?.coverImage?.url || null;

  const addSection = useCallback((type: string) => {
    setSections((prev) => [...prev, { ...makeSection(type), order: prev.length }]);
  }, []);

  const removeSection = useCallback((key: string) => {
    setSections((prev) => prev.filter((s) => s._key !== key).map((s, i) => ({ ...s, order: i })));
  }, []);

  const updateSection = useCallback((key: string, patch: Partial<Section>) => {
    setSections((prev) => prev.map((s) => s._key === key ? { ...s, ...patch } : s));
  }, []);

  const moveSection = useCallback((key: string, dir: -1 | 1) => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s._key === key);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next]!, arr[idx]!];
      return arr.map((s, i) => ({ ...s, order: i }));
    });
  }, []);

  const buildPayload = () => ({
    title,
    excerpt,
    categoryId,
    authorId,
    isPremium,
    isBreaking,
    ogImageUrl: ogImageUrl || undefined,
    sections: sections.map((s, i) => ({
      type: s.type,
      order: i,
      content: s.content,
      level: s.level,
      url: s.url,
      caption: s.caption,
      attribution: s.attribution,
    })),
  });

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (mode === "create") {
        const res = await articlesAdminApi.create(buildPayload()) as { data?: { id?: string } };
        const id = res?.data?.id ?? (res as unknown as { id?: string })?.id;
        router.push(id ? `/articles/${id}` : "/articles");
      } else if (article?.id) {
        await articlesAdminApi.update(article.id, buildPayload());
        setSuccess("Saved");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!article?.id) return;
    setPublishing(true);
    setError("");
    try {
      await articlesAdminApi.publish(article.id);
      setSuccess("Published!");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  const currentCategory = categories.find((c) => c.id === categoryId);
  const currentAuthor = authors.find((a) => a.id === authorId);
  const webUrl = article?.slug ? `${process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000"}/article/${article.slug}` : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/articles")} className="text-neutral-400 hover:text-neutral-600 transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold leading-tight line-clamp-1">{title || "Untitled article"}</h1>
            {article?.status && (
              <span className={`text-xs font-medium capitalize ${
                article.status === "PUBLISHED" ? "text-emerald-600" :
                article.status === "DRAFT" ? "text-neutral-500" : "text-amber-600"
              }`}>{article.status.toLowerCase()}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {webUrl && (
            <a href={webUrl} target="_blank" rel="noopener noreferrer"
              className="h-9 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors inline-flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Web
            </a>
          )}
          <button onClick={handleSave} disabled={saving}
            className="h-9 px-4 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 transition-colors">
            {saving ? "Saving…" : "Save"}
          </button>
          {mode === "edit" && article?.status !== "PUBLISHED" && (
            <button onClick={handlePublish} disabled={publishing}
              className="h-9 px-4 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors">
              {publishing ? "Publishing…" : "Publish"}
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>
      )}
      {success && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">{success}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 w-fit">
        {(["edit", "preview"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? "bg-white dark:bg-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "edit" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main editor */}
          <div className="lg:col-span-2 space-y-5">
            {/* Cover image */}
            <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-5 space-y-3">
              <label className="block text-sm font-semibold">Cover Image URL</label>
              <input
                type="url"
                value={ogImageUrl}
                onChange={(e) => setOgImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-colors"
              />
              {coverImg && (
                <img src={coverImg} alt="" className="w-full h-48 object-cover rounded-xl" onError={(e) => (e.currentTarget.style.display = "none")} />
              )}
            </div>

            {/* Title & Excerpt */}
            <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5">Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="Article title…"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2.5 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-accent/50 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5">Excerpt</label>
                <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={3}
                  placeholder="Brief summary…"
                  className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 transition-colors" />
              </div>
            </div>

            {/* Content sections */}
            <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Content</h3>
                <span className="text-xs text-neutral-400">{sections.length} blocks</span>
              </div>

              {sections.length === 0 && (
                <p className="text-sm text-neutral-400 text-center py-6 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl">
                  No content yet — add a block below
                </p>
              )}

              <div className="space-y-3">
                {sections.map((section, idx) => (
                  <div key={section._key} className="rounded-xl border border-neutral-200 dark:border-neutral-700 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-neutral-400 uppercase tracking-wide w-20 shrink-0">{section.type}</span>
                      {section.type === "HEADING" && (
                        <select value={section.level ?? 2} onChange={(e) => updateSection(section._key, { level: +e.target.value })}
                          className="h-7 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 text-xs focus:outline-none">
                          {[1,2,3,4].map((l) => <option key={l} value={l}>H{l}</option>)}
                        </select>
                      )}
                      <div className="ml-auto flex items-center gap-1">
                        <button onClick={() => moveSection(section._key, -1)} disabled={idx === 0}
                          className="h-6 w-6 rounded-md flex items-center justify-center text-neutral-400 hover:text-neutral-600 disabled:opacity-30 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <button onClick={() => moveSection(section._key, 1)} disabled={idx === sections.length - 1}
                          className="h-6 w-6 rounded-md flex items-center justify-center text-neutral-400 hover:text-neutral-600 disabled:opacity-30 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        <button onClick={() => removeSection(section._key)}
                          className="h-6 w-6 rounded-md flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>

                    {section.type === "DIVIDER" ? (
                      <div className="border-t border-neutral-200 dark:border-neutral-700 my-1" />
                    ) : section.type === "IMAGE" ? (
                      <div className="space-y-2">
                        <input type="url" value={section.url ?? ""} onChange={(e) => updateSection(section._key, { url: e.target.value })}
                          placeholder="Image URL…"
                          className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                        <input type="text" value={section.caption ?? ""} onChange={(e) => updateSection(section._key, { caption: e.target.value })}
                          placeholder="Caption (optional)…"
                          className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                        {section.url && <img src={section.url} alt="" className="w-full h-40 object-cover rounded-lg" onError={(e) => (e.currentTarget.style.display = "none")} />}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          value={section.content ?? ""}
                          onChange={(e) => updateSection(section._key, { content: e.target.value })}
                          placeholder={section.type === "HEADING" ? "Heading text…" : section.type === "QUOTE" ? "Quote text…" : "Paragraph text…"}
                          rows={section.type === "HEADING" ? 1 : section.type === "PARAGRAPH" ? 5 : 3}
                          className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-accent/50"
                        />
                        {section.type === "QUOTE" && (
                          <input type="text" value={section.attribution ?? ""} onChange={(e) => updateSection(section._key, { attribution: e.target.value })}
                            placeholder="Attribution (e.g. source name)…"
                            className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add block buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                {SECTION_TYPES.map((type) => (
                  <button key={type} onClick={() => addSection(type)}
                    className="h-8 px-3 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-600 text-xs text-neutral-500 hover:border-accent hover:text-accent transition-colors flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-5 space-y-3">
              <h3 className="text-sm font-semibold">Category</h3>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50">
                <option value="">Select category…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-5 space-y-3">
              <h3 className="text-sm font-semibold">Author</h3>
              <select value={authorId} onChange={(e) => setAuthorId(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50">
                <option value="">Select author…</option>
                {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-5 space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium">Premium</span>
                <Toggle value={isPremium} onChange={setIsPremium} color="accent" />
              </label>
              <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-sm font-medium">Breaking News</span>
                    <p className="text-xs text-neutral-400 mt-0.5">Shows red banner sitewide</p>
                  </div>
                  <Toggle value={isBreaking} onChange={setIsBreaking} color="red" />
                </label>
              </div>
            </div>

            {article?.publishedAt && (
              <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-5">
                <p className="text-xs text-neutral-500">Published {new Date(article.publishedAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Preview tab */
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 overflow-hidden">
            {coverImg && (
              <img src={coverImg} alt="" className="w-full h-72 object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
            )}
            <div className="p-8 space-y-4">
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                {currentCategory && <span className="bg-accent/10 text-accent font-medium px-2 py-0.5 rounded-full">{currentCategory.name}</span>}
                {currentAuthor && <span>by {currentAuthor.name}</span>}
                {isBreaking && <span className="bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">BREAKING</span>}
                {isPremium && <span className="bg-amber-100 text-amber-600 font-medium px-2 py-0.5 rounded-full">Premium</span>}
              </div>

              <h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                {title || <span className="text-neutral-400 italic">No title</span>}
              </h1>

              {excerpt && (
                <p className="text-lg text-neutral-500 leading-relaxed border-l-4 border-neutral-200 dark:border-neutral-700 pl-4">
                  {excerpt}
                </p>
              )}

              <div className="border-t border-neutral-100 dark:border-neutral-800 pt-6">
                {sections.length === 0 ? (
                  <p className="text-neutral-400 italic text-center py-8">No content sections yet</p>
                ) : (
                  sections.map((s) => renderSectionPreview(s))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ value, onChange, color }: { value: boolean; onChange: (v: boolean) => void; color: "accent" | "red" }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        value ? (color === "red" ? "bg-red-500" : "bg-accent") : "bg-neutral-200 dark:bg-neutral-700"
      }`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}
