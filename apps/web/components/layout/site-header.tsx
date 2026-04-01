import Link from "next/link";
import { getCategories } from "@/lib/api";
import { NavSearch } from "./nav-search";
import { NavUser } from "./nav-user";
import { getSessionFromCookies } from "@/lib/auth";

export async function SiteHeader() {
  const [categoriesRes, session] = await Promise.allSettled([
    getCategories(),
    getSessionFromCookies(),
  ]);

  const categories =
    categoriesRes.status === "fulfilled"
      ? (categoriesRes.value as { data: { id: string; name: string; slug: string; color?: string | null }[] }).data.slice(0, 13)
      : [];

  const user = session.status === "fulfilled" ? session.value : null;

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-100 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top bar */}
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-1 text-xl font-bold tracking-tight shrink-0"
          >
            <span className="text-accent">News</span>
            <span>Plus</span>
          </Link>

          <div className="hidden lg:flex flex-1 justify-center">
            <NavSearch />
          </div>

          <NavUser user={user} />
        </div>

        {/* Category nav */}
        {categories.length > 0 && (
          <nav className="flex gap-6 overflow-x-auto pb-1 -mb-px scrollbar-none">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className="shrink-0 py-3 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 border-b-2 border-transparent hover:border-accent transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
