import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleEditor } from "@/components/articles/article-editor";
import { adminFetch } from "@/lib/api";
import type { ArticleDetail, Category, ArticleAuthor } from "@repo/types";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const { data } = await adminFetch<{ data: { title: string } }>(`/articles/${id}`);
    return { title: `Edit: ${data.title}` };
  } catch {
    return { title: "Edit Article" };
  }
}

export default async function EditArticlePage({ params }: Props) {
  const { id } = await params;

  const [articleRes, categoriesRes, authorsRes] = await Promise.allSettled([
    adminFetch<{ data: ArticleDetail }>(`/articles/${id}`),
    adminFetch<{ data: Category[] }>("/categories"),
    adminFetch<{ data: ArticleAuthor[] }>("/authors"),
  ]);

  if (articleRes.status === "rejected") notFound();

  const article = (articleRes as PromiseFulfilledResult<{ data: ArticleDetail }>).value.data;
  const categories = categoriesRes.status === "fulfilled" ? categoriesRes.value.data : [];
  const authors = authorsRes.status === "fulfilled" ? authorsRes.value.data : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight line-clamp-1">{article.title}</h1>
          <p className="text-sm text-neutral-500 mt-1 capitalize">{article.status?.toLowerCase()} · {article.category.name}</p>
        </div>
      </div>
      <ArticleEditor
        mode="edit"
        article={article}
        categories={categories}
        authors={authors}
      />
    </div>
  );
}
