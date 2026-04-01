"use client";

export default function ReaderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="mt-3 text-neutral-500">{error.message || "An unexpected error occurred."}</p>
      <button
        onClick={reset}
        className="mt-6 inline-flex h-10 items-center rounded-xl bg-accent px-6 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
