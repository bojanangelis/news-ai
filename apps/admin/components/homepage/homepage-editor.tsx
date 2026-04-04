"use client";

import { useState, useCallback } from "react";
import { adminClientFetch } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";
import type { HomepageSection } from "@repo/types";

interface Category {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
}

interface Props {
  sections: HomepageSection[];
  categories: Category[];
}

const SECTION_TYPES = ["HERO", "FEATURED_GRID", "CATEGORY_ROW", "TRENDING", "EDITORS_PICK"] as const;

const SECTION_TYPE_LABELS: Record<string, string> = {
  HERO:          "Главни вести",
  FEATURED_GRID: "Избрани статии",
  CATEGORY_ROW:  "По категорија",
  TRENDING:      "Популарно",
  EDITORS_PICK:  "Избор на редакцијата",
};

export function HomepageEditor({ sections: initial, categories }: Props) {
  const [sections, setSections] = useState(initial);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", type: "CATEGORY_ROW" as string, categoryId: "" });
  const [saving, setSaving] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const { toast, confirm } = useToast();

  async function handleCreate() {
    setSaving(true);
    try {
      const res = await adminClientFetch<{ data: HomepageSection }>("/homepage/sections", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          categoryId: form.categoryId || undefined,
          order: sections.length,
          isActive: true,
        }),
      });
      setSections((prev) => [...prev, res.data]);
      setShowNew(false);
      setForm({ title: "", type: "CATEGORY_ROW", categoryId: "" });
      toast.success("Секцијата е додадена");
    } catch {
      toast.error("Грешка при додавање");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    try {
      await adminClientFetch(`/homepage/sections/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !isActive }),
      });
      setSections((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: !isActive } : s)));
      toast.success(isActive ? "Секцијата е скриена" : "Секцијата е активна");
    } catch {
      toast.error("Грешка при ажурирање");
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Отстрани ја оваа секција?",
      description: "Секцијата ќе биде отстранета од распоредот на почетната страница.",
      confirmLabel: "Отстрани",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      await adminClientFetch(`/homepage/sections/${id}`, { method: "DELETE" });
      setSections((prev) => prev.filter((s) => s.id !== id));
      toast.success("Секцијата е отстранета");
    } catch {
      toast.error("Грешка при бришење");
    }
  }

  const handleDragStart = useCallback((id: string) => setDraggingId(id), []);
  const handleDragOver = useCallback((id: string) => setDragOverId(id), []);

  async function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }

    const fromIdx = sections.findIndex((s) => s.id === draggingId);
    const toIdx = sections.findIndex((s) => s.id === targetId);
    const reordered = [...sections];
    const moved = reordered.splice(fromIdx, 1)[0]!;
    reordered.splice(toIdx, 0, moved);
    const withOrder = reordered.map((s, i) => ({ ...s, order: i }));
    setSections(withOrder);

    setDraggingId(null);
    setDragOverId(null);

    try {
      await adminClientFetch("/homepage/reorder", {
        method: "POST",
        body: JSON.stringify({ order: withOrder.map((s) => ({ id: s.id, order: s.order })) }),
      });
    } catch {
      setSections(initial);
    }
  }

  const selectedCategory = categories.find((c) => c.id === form.categoryId);

  return (
    <div className="space-y-4">
      {/* New section form */}
      {showNew && (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-4">
          <h3 className="font-semibold text-sm">Нова секција</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Наслов</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="пр. Најнови вести"
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Тип</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                {SECTION_TYPES.map((t) => (
                  <option key={t} value={t}>{SECTION_TYPE_LABELS[t] ?? t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category selector */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Категорија
              {form.type !== "CATEGORY_ROW" && (
                <span className="ml-1 text-neutral-400 font-normal">(опционално)</span>
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, categoryId: "" }))}
                className={`h-8 px-3 rounded-lg text-xs font-medium border transition-colors ${
                  !form.categoryId
                    ? "bg-accent text-white border-accent"
                    : "border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-accent hover:text-accent"
                }`}
              >
                Сите категории
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, categoryId: cat.id }))}
                  className={`h-8 px-3 rounded-lg text-xs font-medium border transition-colors ${
                    form.categoryId === cat.id
                      ? "text-white border-transparent"
                      : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-accent hover:text-accent"
                  }`}
                  style={form.categoryId === cat.id && cat.color ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={saving || !form.title || (form.type === "CATEGORY_ROW" && !form.categoryId)}
              className="h-9 px-4 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Зачувување…" : "Додај секција"}
            </button>
            <button
              onClick={() => setShowNew(false)}
              className="h-9 px-4 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Откажи
            </button>
          </div>

          {form.type === "CATEGORY_ROW" && !form.categoryId && (
            <p className="text-xs text-amber-500">Изберете категорија за овој тип на секција.</p>
          )}
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
          Додај секција
        </button>
      )}

      {/* Section list */}
      <div className="space-y-2">
        {sections.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700 py-12 text-center text-neutral-400 text-sm">
            Нема секции. Додај нова погоре.
          </div>
        )}
        {sections.map((section, i) => {
          const sectionCategory = categories.find((c) => c.slug === section.categorySlug);
          return (
            <div
              key={section.id}
              draggable
              onDragStart={() => handleDragStart(section.id)}
              onDragOver={(e) => { e.preventDefault(); handleDragOver(section.id); }}
              onDrop={() => handleDrop(section.id)}
              onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
              className={`flex items-center gap-4 rounded-xl border px-4 py-3 bg-white dark:bg-neutral-900 transition-all cursor-grab active:cursor-grabbing ${
                draggingId === section.id ? "opacity-50 scale-[0.98]" : ""
              } ${
                dragOverId === section.id && draggingId !== section.id
                  ? "border-accent ring-1 ring-accent/30"
                  : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              {/* Drag handle */}
              <svg className="h-4 w-4 text-neutral-300 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 6a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm5 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM8 12a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm5 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM8 18a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Zm5 0a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" />
              </svg>

              {/* Order badge */}
              <span className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-medium flex items-center justify-center text-neutral-500 shrink-0">
                {i + 1}
              </span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{section.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-neutral-500">
                    {SECTION_TYPE_LABELS[section.type] ?? section.type.replace(/_/g, " ")}
                  </span>
                  {sectionCategory && (
                    <>
                      <span className="text-neutral-300 dark:text-neutral-600">·</span>
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium"
                        style={sectionCategory.color ? { color: sectionCategory.color } : {}}
                      >
                        {sectionCategory.name}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Active toggle */}
              <button
                onClick={() => handleToggle(section.id, section.isActive)}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent/50 ${
                  section.isActive ? "bg-accent" : "bg-neutral-200 dark:bg-neutral-700"
                }`}
                title={section.isActive ? "Активна — клик за скривање" : "Скриена — клик за прикажување"}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
                    section.isActive ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>

              {/* Delete */}
              <button
                onClick={() => handleDelete(section.id)}
                className="text-neutral-300 hover:text-red-500 transition-colors shrink-0"
                title="Отстрани секција"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {sections.length > 0 && (
        <p className="text-xs text-neutral-400">Повлечете ги редовите за промена на редоследот. Промените се зачувуваат автоматски.</p>
      )}
    </div>
  );
}
