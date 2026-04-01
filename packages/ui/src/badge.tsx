import * as React from "react";

type BadgeVariant = "default" | "secondary" | "premium" | "breaking" | "outline";

interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-accent/10 text-accent",
  secondary: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  premium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  breaking: "bg-red-600 text-white animate-pulse",
  outline: "border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300",
};

export function Badge({ variant = "default", className = "", children }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 px-2.5 py-0.5",
        "text-xs font-semibold rounded-full",
        variantClasses[variant],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
