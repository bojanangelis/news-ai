"use client";

import * as React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, startIcon, endIcon, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {startIcon && (
            <span className="absolute left-3 text-neutral-400">{startIcon}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={[
              "w-full rounded-xl border bg-white dark:bg-neutral-900",
              "px-4 py-2.5 text-sm text-neutral-900 dark:text-neutral-100",
              "placeholder:text-neutral-400 dark:placeholder:text-neutral-600",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error
                ? "border-red-500 focus:ring-red-500"
                : "border-neutral-200 dark:border-neutral-700",
              startIcon ? "pl-10" : "",
              endIcon ? "pr-10" : "",
              className,
            ].join(" ")}
            {...props}
          />
          {endIcon && (
            <span className="absolute right-3 text-neutral-400">{endIcon}</span>
          )}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {hint && !error && <p className="text-xs text-neutral-500">{hint}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
