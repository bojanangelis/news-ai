import Link from "next/link";
import Image from "next/image";
import type { ArticleSummary } from "@repo/types";

interface Section {
  id: string;
  title: string | null;
  items: Array<{ id: string; order: number; article: ArticleSummary }>;
}

interface Props {
  section: Section;
}

function getImage(article: ArticleSummary) {
  return (
    article.coverImage ??
    (article.ogImageUrl ? { url: article.ogImageUrl, alt: article.title, width: 800, height: 450 } : null)
  );
}

export function HeroSection({ section }: Props) {
  const [hero, ...secondary] = section.items.map((i) => i.article);
  if (!hero) return null;

  const heroImage = getImage(hero);

  return (
    <section aria-labelledby="hero-heading">
      {section.title && (
        <h2 id="hero-heading" className="sr-only">{section.title}</h2>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Main hero card */}
        <Link
          href={`/article/${hero.slug}`}
          className="group lg:col-span-3 relative overflow-hidden rounded-3xl aspect-[4/3] lg:aspect-auto lg:min-h-[480px] block"
        >
          {heroImage && (
            <Image
              src={heroImage.url}
              alt={heroImage.alt}
              fill
              priority
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: hero.category.color ?? "#f59e0b" }}
            >
              {hero.category.name}
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold leading-tight line-clamp-3 group-hover:underline underline-offset-2">
              {hero.title}
            </h2>
            <div className="mt-3 flex items-center gap-2 text-white/70 text-xs">
              <span>{hero.author.name}</span>
              <span>·</span>
              <span>{hero.readTimeMinutes} min read</span>
            </div>
          </div>
        </Link>

        {/* Secondary articles */}
        {secondary.length > 0 && (
          <div className="lg:col-span-2 flex flex-col gap-4">
            {secondary.slice(0, 3).map((article) => {
              const img = getImage(article);
              return (
              <Link
                key={article.id}
                href={`/article/${article.slug}`}
                className="group flex gap-4 items-start rounded-2xl border border-neutral-100 dark:border-neutral-800 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
              >
                {img && (
                  <div className="shrink-0 w-24 h-16 rounded-xl overflow-hidden">
                    <Image
                      src={img.url}
                      alt={img.alt}
                      width={96}
                      height={64}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: article.category.color ?? "#6366f1" }}
                  >
                    {article.category.name}
                  </span>
                  <h3 className="mt-0.5 text-sm font-semibold leading-snug line-clamp-2 text-neutral-900 dark:text-neutral-100 group-hover:text-accent transition-colors">
                    {article.title}
                  </h3>
                  <p className="mt-1 text-xs text-neutral-400">{article.readTimeMinutes} min read</p>
                </div>
              </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
