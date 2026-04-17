import Link from "next/link";

interface Props {
  articleId: string;
  children: React.ReactNode;
}

const PREMIUM_FEATURES = [
  { icon: "🧠", label: "Длабока AI анализа на секоја статија" },
  { icon: "💬", label: "AI разговор — прашај нешто, добиј одговор" },
  { icon: "🇲🇰", label: "Македонски контекст и позадина" },
  { icon: "🔍", label: "Проверка на извори и пристрасност" },
];

export function PremiumGate({ children }: Props) {
  return (
    <div className="relative">
      <div className="[mask-image:linear-gradient(to_bottom,black_30%,transparent_100%)]">
        {children}
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-center pb-0 pt-32 bg-gradient-to-t from-white dark:from-neutral-950 to-transparent rounded-b-2xl">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-2xl shadow-xl p-7 max-w-md w-full">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Premium статија</p>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Претплати се за целосен пристап</h3>
            </div>
          </div>

          {/* Feature list */}
          <ul className="mb-5 space-y-2">
            {PREMIUM_FEATURES.map(({ icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <span className="text-base">{icon}</span>
                {label}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Link
            href="/premium"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-8 text-sm font-bold text-white hover:bg-indigo-700 transition-colors"
          >
            Претплати се — од 199 МКД/месец
          </Link>
          <p className="mt-3 text-center text-xs text-neutral-400">
            Веќе претплатник?{" "}
            <Link href="/login" className="underline hover:text-neutral-600 dark:hover:text-neutral-200">
              Најави се
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
