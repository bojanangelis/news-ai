import type { Metadata } from "next";
import { ArticleEditor } from "@/components/articles/article-editor";
import { adminFetch } from "@/lib/api";

export const metadata: Metadata = { title: "New Article" };

export default async function NewArticlePage() {
  const [categoriesRes, authorsRes] = await Promise.allSettled([
    adminFetch<{ data: unknown[] }>("/categories"),
    adminFetch<{ data: unknown[] }>("/authors"),
  ]);

  const categories = categoriesRes.status === "fulfilled" ? categoriesRes.value.data : [];
  const authors = authorsRes.status === "fulfilled" ? authorsRes.value.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Article</h1>
        <p className="text-sm text-neutral-500 mt-1">Create and publish a new story</p>
      </div>
      <ArticleEditor
        mode="create"
        categories={categories as import("@repo/types").Category[]}
        authors={authors as import("@repo/types").ArticleAuthor[]}
      />
    </div>
  );
}
