export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <a href="/" className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight">
            <span className="text-accent">News</span>
            <span>Plus</span>
          </a>
        </div>
        {children}
      </div>
    </div>
  );
}
