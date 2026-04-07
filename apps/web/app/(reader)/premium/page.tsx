import type { Metadata } from "next";
import Link from "next/link";
import { getSubscriptionPricing } from "@/lib/api";

export const metadata: Metadata = {
  title: "Premium — NewsPlus",
  description: "Претплати се на NewsPlus Premium и добиј неограничен пристап до вести.",
};

export const revalidate = 3600;

export default async function PremiumPage() {
  const fallback = {
    monthly: { price: 199, currency: "MKD", label: "199 МКД / месец" },
    yearly: {
      price: 1490,
      currency: "MKD",
      label: "1.490 МКД / година",
      perDay: 4.1,
      savingsVsMonthly: 898,
      freeMonthsEquivalent: 4.5,
    },
    trialDays: 7,
  };

  let pricing = fallback;
  try {
    const res = await getSubscriptionPricing();
    if (res.data?.monthly) pricing = res.data;
  } catch {
    // use fallback
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
      {/* Header */}
      <div className="text-center mb-14">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 mb-4">
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          NewsPlus Premium
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50">
          Вести без граници
        </h1>
        <p className="mt-4 text-lg text-neutral-500 dark:text-neutral-400 max-w-xl mx-auto">
          Неограничен пристап до сите статии, AI резимиња, дневен брифинг и уште многу повеќе.
        </p>
      </div>

      {/* Plans */}
      <div className="grid sm:grid-cols-2 gap-6 mb-12">
        {/* Monthly */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8">
          <h2 className="text-lg font-bold mb-1">Месечна</h2>
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-4xl font-extrabold">{pricing.monthly.price}</span>
            <span className="text-lg text-neutral-500">МКД / месец</span>
          </div>
          <ul className="space-y-2.5 mb-8 text-sm text-neutral-600 dark:text-neutral-400">
            <FeatureItem>Неограничени AI резимиња</FeatureItem>
            <FeatureItem>Аудио читање на резимиња</FeatureItem>
            <FeatureItem>Дневен брифинг</FeatureItem>
            <FeatureItem>Зачувај статии (bookmark)</FeatureItem>
            <FeatureItem>Без реклами</FeatureItem>
          </ul>
          <Link
            href="/register?plan=monthly"
            className="flex h-11 items-center justify-center rounded-xl border-2 border-accent text-accent font-semibold text-sm hover:bg-accent hover:text-white transition-colors"
          >
            Почни пробен период ({pricing.trialDays} дена бесплатно)
          </Link>
        </div>

        {/* Yearly — highlighted */}
        <div className="relative rounded-2xl border-2 border-accent bg-white dark:bg-neutral-900 p-8 shadow-lg">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <span className="rounded-full bg-accent px-4 py-1 text-xs font-bold text-white whitespace-nowrap">
              ЗАШТЕДИ {pricing.yearly.savingsVsMonthly} МКД
            </span>
          </div>
          <h2 className="text-lg font-bold mb-1">Годишна</h2>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-4xl font-extrabold">{pricing.yearly.price.toLocaleString("mk")}</span>
            <span className="text-lg text-neutral-500">МКД / година</span>
          </div>
          <p className="text-xs text-neutral-400 mb-4">
            само {pricing.yearly.perDay} МКД / ден · {pricing.yearly.freeMonthsEquivalent} месеци бесплатно
          </p>
          <ul className="space-y-2.5 mb-8 text-sm text-neutral-600 dark:text-neutral-400">
            <FeatureItem>Сè од месечниот план</FeatureItem>
            <FeatureItem check="accent">Приоритетна поддршка</FeatureItem>
            <FeatureItem check="accent">Ран пристап до нови функции</FeatureItem>
          </ul>
          <Link
            href="/register?plan=yearly"
            className="flex h-11 items-center justify-center rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-colors"
          >
            Почни пробен период ({pricing.trialDays} дена бесплатно)
          </Link>
        </div>
      </div>

      {/* Feature comparison */}
      <div className="rounded-2xl border border-neutral-100 dark:border-neutral-800 overflow-hidden mb-12">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800">
              <th className="text-left px-6 py-3 font-semibold text-neutral-700 dark:text-neutral-300">Функција</th>
              <th className="px-4 py-3 text-center font-medium text-neutral-500">Бесплатно</th>
              <th className="px-4 py-3 text-center font-semibold text-accent">Premium</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            <CompareRow label="Читање статии" free="✓" premium="✓" />
            <CompareRow label="AI резимиња" free="2 / ден" premium="Неограничено" />
            <CompareRow label="Аудио резимиња" free="—" premium="✓" />
            <CompareRow label="Дневен брифинг" free="—" premium="✓" />
            <CompareRow label="Зачувај статии" free="—" premium="✓" />
            <CompareRow label="Без реклами" free="—" premium="✓" />
            <CompareRow label="Premium содржина" free="—" premium="✓" />
          </tbody>
        </table>
      </div>

      {/* FAQ */}
      <div className="text-center text-sm text-neutral-500 dark:text-neutral-400">
        <p>
          Веќе имаш профил?{" "}
          <Link href="/login" className="text-accent underline">
            Најави се
          </Link>
          {" "}и активирај ја претплатата од твојот профил.
        </p>
        <p className="mt-2">Нема автоматска наплата. Плаќањето е рачно со нашата поддршка.</p>
      </div>
    </div>
  );
}

function FeatureItem({ children, check }: { children: React.ReactNode; check?: string }) {
  return (
    <li className="flex items-center gap-2">
      <svg
        className={`h-4 w-4 shrink-0 ${check === "accent" ? "text-accent" : "text-green-500"}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {children}
    </li>
  );
}

function CompareRow({ label, free, premium }: { label: string; free: string; premium: string }) {
  return (
    <tr className="bg-white dark:bg-neutral-950">
      <td className="px-6 py-3 text-neutral-700 dark:text-neutral-300">{label}</td>
      <td className="px-4 py-3 text-center text-neutral-400">{free}</td>
      <td className="px-4 py-3 text-center font-medium text-neutral-800 dark:text-neutral-200">{premium}</td>
    </tr>
  );
}
