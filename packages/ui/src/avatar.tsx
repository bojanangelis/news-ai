import * as React from "react";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  src?: string | null;
  alt: string;
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-12 w-12 text-lg",
  xl: "h-16 w-16 text-xl",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function Avatar({ src, alt, size = "md", className = "" }: AvatarProps) {
  const sizeClass = sizeClasses[size];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={["rounded-full object-cover ring-2 ring-white dark:ring-neutral-900", sizeClass, className].join(" ")}
      />
    );
  }

  return (
    <div
      className={[
        "rounded-full bg-accent/20 text-accent font-semibold",
        "flex items-center justify-center shrink-0",
        sizeClass,
        className,
      ].join(" ")}
      aria-label={alt}
    >
      {getInitials(alt)}
    </div>
  );
}
