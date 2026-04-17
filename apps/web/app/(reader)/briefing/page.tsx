import type { Metadata } from "next";
import { getDailyBriefing, getArticles } from "@/lib/api";
import { BriefingArticleCard } from "@/components/briefing/briefing-article-card";
import { getSessionFromCookies } from "@/lib/auth";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Дневен Брифинг — NewsPlus",
  description: "Топ приказни на денот, избрани и анализирани од AI.",
};

export const revalidate = 300;

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  publishedAt: string;
  isExternal?: boolean;
  category: { name: string; slug: string };
}

export default async function BriefingPage() {
  const session = await getSessionFromCookies();
  const isPremium = session?.isPremium ?? false;

  let articles: Article[] = [];
  let narrative: string | null = null;
  let isGenerated = false;

  try {
    const res = await getDailyBriefing();
    if (res.data?.articles?.length) {
      articles = res.data.articles as Article[];
      narrative = (res.data as unknown as { narrative?: string | null }).narrative ?? null;
      isGenerated = true;
    }
  } catch {
    // fall through
  }

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
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className={!isPremium ? "lg:grid lg:grid-cols-[1fr_300px] lg:gap-14" : ""}>

        {/* ── Main column ─────────────────────────────────────────── */}
        <div className="min-w-0">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <svg className="h-4 w-4 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">
                {isGenerated ? "AI Дневен Брифинг" : "Најнови вести"}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 capitalize">
              {dateLabel}
            </h1>

            {/* AI narrative */}
            {narrative && (
              <p className="mt-3 text-base text-neutral-600 dark:text-neutral-400 leading-relaxed italic border-l-2 border-indigo-400 pl-4">
                {narrative}
              </p>
            )}

            {!narrative && (
              <p className="mt-2 text-sm text-neutral-500">
                {isGenerated ? `${articles.length} главни приказни избрани денес` : "Најнови статии"}
              </p>
            )}
          </div>

          {/* Instruction */}
          <p className="mb-4 text-xs text-neutral-400 flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Притисни на статија за да видиш AI анализа пред да ја отвориш
          </p>

          {/* Article list */}
          {!articles.length ? (
            <div className="rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-12 text-center">
              <p className="text-neutral-500">Нема достапни статии.</p>
            </div>
          ) : (
            <ol className="space-y-0">
              {articles.map((article, i) => (
                <BriefingArticleCard key={article.id} article={article} index={i} />
              ))}
            </ol>
          )}
        </div>

        {/* ── Sidebar — hidden for premium users ──────────────────── */}
        {!isPremium && <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-6">

            {/* How it works */}
            <div className="rounded-2xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Како функционира</h3>
              <ul className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
                <li className="flex gap-2">
                  <span className="text-indigo-500 shrink-0">1.</span>
                  AI избира топ приказни од денот
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500 shrink-0">2.</span>
                  Притисни статија за AI анализа
                </li>
                <li className="flex gap-2">
                  <span className="text-indigo-500 shrink-0">3.</span>
                  Одлучи дали да ја читаш целосно
                </li>
              </ul>
            </div>

            {/* Premium upsell */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-100 dark:border-indigo-900/40 p-5">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-4 w-4 text-indigo-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Premium</span>
              </div>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                Целосна AI анализа
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                Отклучи длабока анализа, контекст, разговор со AI и проверка на извори за секоја статија.
              </p>
              <Link
                href="/premium"
                className="block w-full text-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-colors"
              >
                Надгради — 199 МКД/месец
              </Link>
            </div>

          </div>
        </aside>}
      </div>
    </div>
  );
}
