interface Category {
  name: string;
  description: string | null;
  color: string | null;
}

export function CategoryHeader({ category, articleCount }: { category: Category; articleCount: number }) {
  return (
    <div className="border-b border-neutral-100 dark:border-neutral-800 pb-8">
      <div
        className="inline-block w-12 h-1.5 rounded-full mb-4"
        style={{ backgroundColor: category.color ?? "#6366f1" }}
      />
      <h1 className="text-4xl font-bold tracking-tight">{category.name}</h1>
      {category.description && (
        <p className="mt-3 text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl">
          {category.description}
        </p>
      )}
      <p className="mt-2 text-sm text-neutral-400">{articleCount.toLocaleString()} stories</p>
    </div>
  );
}
