import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleEditor } from "@/components/articles/article-editor";
import { adminFetch } from "@/lib/api";
import type { Category, ArticleAuthor } from "@repo/types";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await adminFetch<{ data: { title: string } }>(`/admin/articles/${id}`);
    return { title: `Edit: ${res.data.title}` };
  } catch {
    return { title: "Edit Article" };
  }
}

export default async function EditArticlePage({ params }: Props) {
  const { id } = await params;

  const [articleRes, categoriesRes, authorsRes] = await Promise.allSettled([
    adminFetch<{ data: Record<string, unknown> }>(`/admin/articles/${id}`),
    adminFetch<{ data: Category[] }>("/categories"),
    adminFetch<{ data: ArticleAuthor[] }>("/authors"),
  ]);

  if (articleRes.status === "rejected") notFound();

  const article = (articleRes as PromiseFulfilledResult<{ data: Record<string, unknown> }>).value.data;

  // Categories: interceptor wraps array as { data: Category[] }
  let categories: Category[] = [];
  if (categoriesRes.status === "fulfilled") {
    const raw = categoriesRes.value.data as unknown;
    categories = Array.isArray(raw) ? raw : [];
  }

  // Authors: interceptor wraps as { data: ArticleAuthor[] }
  let authors: ArticleAuthor[] = [];
  if (authorsRes.status === "fulfilled") {
    const raw = authorsRes.value.data as unknown;
    authors = Array.isArray(raw) ? raw : [];
  }

  return (
    <ArticleEditor
      mode="edit"
      article={article as never}
      categories={categories}
      authors={authors}
    />
  );
}
