import type { Metadata } from "next";
import { adminFetch } from "@/lib/api";
import { CategoriesTable } from "@/components/categories/categories-table";

export const metadata: Metadata = { title: "Categories" };

export const revalidate = 120;

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  _count?: { articles: number };
}

export default async function CategoriesPage() {
  let categories: CategoryRow[] = [];
  try {
    const res = await adminFetch<{ data: CategoryRow[] }>("/categories");
    categories = res.data;
  } catch {
    // handled below
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
        <p className="text-sm text-neutral-500 mt-1">{categories.length} categories</p>
      </div>

      <CategoriesTable categories={categories} />
    </div>
  );
}
