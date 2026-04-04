import type { Metadata } from "next";
import { adminFetch } from "@/lib/api";
import { HomepageEditor } from "@/components/homepage/homepage-editor";
import type { HomepageSection } from "@repo/types";

export const metadata: Metadata = { title: "Homepage Editor" };

export const dynamic = "force-dynamic";

interface Category {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
}

interface AdminSection {
  id: string;
  type: HomepageSection["type"];
  title: string | null;
  order: number;
  isActive: boolean;
  categoryId: string | null;
  categorySlug: string | null;
}

export default async function HomepagePage() {
  let sections: AdminSection[] = [];
  let categories: Category[] = [];
  try {
    const [sectionsRes, categoriesRes] = await Promise.all([
      adminFetch<{ data: AdminSection[] }>("/homepage/sections"),
      adminFetch<{ data: Category[] }>("/categories"),
    ]);
    sections = sectionsRes.data;
    categories = categoriesRes.data;
  } catch {
    // handled below
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Homepage Editor</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Drag and drop to reorder sections. Changes publish immediately.
        </p>
      </div>

      <HomepageEditor sections={sections as any} categories={categories} />
    </div>
  );
}
