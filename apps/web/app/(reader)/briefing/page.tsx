import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getDailyBriefing, getArticles } from "@/lib/api";

export const metadata: Metadata = {
  title: "Дневен Брифинг — NewsPlus",
  description: "Топ 10 приказни на денот, избрани од AI.",
};

export const revalidate = 300;

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  publishedAt: string;
  category: { name: string; slug: string };
}

export default async function BriefingPage() {
  let articles: Article[] = [];
  let isGenerated = false;

  // Try AI-generated briefing first
  try {
    const res = await getDailyBriefing();
    if (res.data?.articles?.length) {
      articles = res.data.articles as Article[];
      isGenerated = true;
    }
  } catch {
    // fall through to latest articles
  }

  // Fallback: show latest 10 published articles
  if (!articles.length) {
    try {
      const res = await getArticles({ limit: 10, page: 1 });
      const data = res.data as { data: unknown[] };
      articles = (data.data ?? []) as Article[];
    } catch {
      // nothing
    }
  }

  const dateLabel = new Date().toLocaleDateString("mk-MK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <svg className="h-5 w-5 text-accent" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Дневен Брифинг</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">
          {dateLabel}
        </h1>
        <p className="mt-2 text-neutral-500 dark:text-neutral-400">
          {isGenerated ? "Топ приказни избрани денес од AI" : "Најнови вести"}
        </p>
      </div>

      {!articles.length ? (
        <div className="rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-12 text-center">
          <p className="text-neutral-500">Нема достапни статии.</p>
        </div>
      ) : (
        <ol className="space-y-6">
          {articles.map((article, i) => (
            <li key={article.id}>
              <Link href={`/article/${article.slug}`} className="group flex gap-5 items-start">
                <span className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-sm font-bold text-neutral-500 dark:text-neutral-400 group-hover:bg-accent group-hover:text-white transition-colors">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-wide text-accent">
                    {article.category?.name}
                  </span>
                  <h2 className="mt-0.5 text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-accent transition-colors leading-snug line-clamp-2">
                    {article.title}
                  </h2>
                  {article.excerpt && (
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">
                      {article.excerpt}
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-neutral-400">
                    {new Date(article.publishedAt).toLocaleTimeString("mk-MK", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {article.coverImageUrl && (
                  <div className="shrink-0 hidden sm:block">
                    <Image
                      src={article.coverImageUrl}
                      alt={article.title}
                      width={80}
                      height={60}
                      className="rounded-lg object-cover w-20 h-[60px]"
                    />
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ol>
      )}

      {/* Premium upsell for non-premium */}
      <div className="mt-12 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-100 dark:border-amber-900/30 p-8 text-center">
        <h3 className="font-bold text-neutral-800 dark:text-neutral-200 mb-2">
          Читај подетално со AI Резимиња
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
          Отвори која било статија и притисни го копчето <strong>„AI Резиме"</strong> за брз преглед на клучните точки.
        </p>
        <Link
          href="/premium"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-6 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
        >
          Погледни Premium планови
        </Link>
      </div>
    </div>
  );
}
