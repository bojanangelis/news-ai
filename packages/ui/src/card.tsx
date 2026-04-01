import * as React from "react";

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className = "", children }: CardProps) {
  return (
    <div
      className={[
        "rounded-2xl bg-white dark:bg-neutral-900",
        "shadow-sm border border-neutral-100 dark:border-neutral-800",
        "transition-shadow duration-200 hover:shadow-md",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children }: CardProps) {
  return (
    <div className={["px-5 py-4 border-b border-neutral-100 dark:border-neutral-800", className].join(" ")}>
      {children}
    </div>
  );
}

export function CardContent({ className = "", children }: CardProps) {
  return <div className={["px-5 py-4", className].join(" ")}>{children}</div>;
}

export function CardFooter({ className = "", children }: CardProps) {
  return (
    <div
      className={[
        "px-5 py-4 border-t border-neutral-100 dark:border-neutral-800",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
