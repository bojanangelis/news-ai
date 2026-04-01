import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-7xl font-black text-neutral-200 dark:text-neutral-800">404</p>
        <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-neutral-500">The page you're looking for doesn't exist.</p>
        <Link href="/" className="mt-6 inline-flex h-10 items-center rounded-xl bg-accent px-6 text-sm font-semibold text-white hover:bg-accent/90 transition-colors">
          Go home
        </Link>
      </div>
    </div>
  );
}
