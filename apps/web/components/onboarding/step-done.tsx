"use client";

import { useRouter } from "next/navigation";

export function StepDone() {
  const router = useRouter();

  return (
    <div className="flex flex-col flex-1 items-center justify-center text-center">
      <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
        <svg
          className="h-10 w-10 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h2 className="text-2xl font-bold tracking-tight mb-3">You're all set!</h2>
      <p className="text-sm text-neutral-500 max-w-xs leading-relaxed mb-8">
        Your feed is personalised and ready. New stories drop every morning.
      </p>

      <button
        type="button"
        onClick={() => router.push("/")}
        className="w-full max-w-xs h-11 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
      >
        Start reading →
      </button>

      <button
        type="button"
        onClick={() => router.push("/account")}
        className="mt-3 text-sm text-neutral-400 underline hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
      >
        Edit preferences
      </button>
    </div>
  );
}
