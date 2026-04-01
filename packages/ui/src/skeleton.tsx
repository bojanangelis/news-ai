import * as React from "react";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={[
        "animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800",
        className,
      ].join(" ")}
      aria-hidden="true"
    />
  );
}

export function ArticleCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-100 dark:border-neutral-800 p-4">
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-3/4" />
      <div className="flex gap-2 mt-1">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

export function ArticleHeroSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-[480px] w-full rounded-3xl" />
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-4 w-40" />
    </div>
  );
}
