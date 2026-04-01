import Link from "next/link";

const links = [
  { label: "About", href: "/about" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Contact", href: "/contact" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-100 dark:border-neutral-800 mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold">
            <span className="text-accent">News</span>Plus
          </Link>
          <nav className="flex gap-6">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="text-sm text-neutral-400">
            © {new Date().getFullYear()} NewsPlus
          </p>
        </div>
      </div>
    </footer>
  );
}
