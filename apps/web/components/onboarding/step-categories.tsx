"use client";

const MIN_SELECTED = 3;

export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

interface Props {
  categories: Category[];
  selected: string[];
  onToggle: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepCategories({ categories, selected, onToggle, onNext, onBack }: Props) {
  const canContinue = selected.length >= MIN_SELECTED;
  const remaining = MIN_SELECTED - selected.length;

  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-2xl font-bold tracking-tight mb-2">What do you care about?</h2>
      <p className="text-sm text-neutral-500 mb-6">Pick at least 3. We'll personalise your feed.</p>

      <div className="flex flex-wrap gap-2.5 flex-1 content-start">
        {categories.map((cat) => {
          const isSelected = selected.includes(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onToggle(cat.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                isSelected
                  ? "bg-accent text-white"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-neutral-400">
        {selected.length} of {categories.length} selected
        {!canContinue && remaining > 0 && ` — pick ${remaining} more`}
      </p>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="h-11 px-5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canContinue}
          className="flex-1 h-11 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
