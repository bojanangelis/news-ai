import Link from "next/link";

interface Props {
  articleId: string;
  children: React.ReactNode;
}

export function PremiumGate({ children }: Props) {
  return (
    <div className="relative">
      <div className="[mask-image:linear-gradient(to_bottom,black_30%,transparent_100%)]">
        {children}
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-center pb-0 pt-32 bg-gradient-to-t from-white dark:from-neutral-950 to-transparent rounded-b-2xl">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30 mb-4">
            <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold mb-2">Premium Article</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
            Subscribe to NewsPlus Premium to read this and all premium content.
          </p>
          <Link
            href="/premium"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-8 text-sm font-semibold text-white hover:bg-accent/90 transition-colors w-full"
          >
            Претплати се — од 199 МКД/месец
          </Link>
          <p className="mt-3 text-xs text-neutral-400">Already a subscriber? <Link href="/login" className="underline">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
