"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastVariant = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
}

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
}

interface ConfirmItem extends ConfirmOptions {
  id: string;
  resolve: (value: boolean) => void;
}

interface ToastContextValue {
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
  };
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

const VARIANT_CONFIG: Record<
  ToastVariant,
  { icon: React.ReactNode; bar: string; iconColor: string }
> = {
  success: {
    icon: <CheckIcon />,
    bar: "bg-emerald-500",
    iconColor: "text-emerald-500",
  },
  error: {
    icon: <XCircleIcon />,
    bar: "bg-red-500",
    iconColor: "text-red-500",
  },
  warning: {
    icon: <WarnIcon />,
    bar: "bg-amber-400",
    iconColor: "text-amber-500",
  },
  info: {
    icon: <InfoIcon />,
    bar: "bg-blue-500",
    iconColor: "text-blue-500",
  },
};

// ─── Toast Item ───────────────────────────────────────────────────────────────

function Toast({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  const cfg = VARIANT_CONFIG[item.variant];

  return (
    <div className="relative flex items-start gap-3 min-w-[300px] max-w-[400px] rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl overflow-hidden">
      {/* Left accent bar */}
      <span className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.bar}`} />

      {/* Icon */}
      <span className={`mt-3.5 ml-4 shrink-0 ${cfg.iconColor}`}>
        {cfg.icon}
      </span>

      {/* Content */}
      <div className="flex-1 py-3.5 min-w-0 pr-2">
        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 leading-snug">
          {item.title}
        </p>
        {item.message && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
            {item.message}
          </p>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="mt-3 mr-3 shrink-0 p-0.5 rounded text-neutral-300 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
        aria-label="Dismiss notification"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  item,
  onResolve,
}: {
  item: ConfirmItem;
  onResolve: (value: boolean) => void;
}) {
  const isDestructive = item.variant === "destructive";

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 sm:p-0">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={() => onResolve(false)}
      />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-sm mx-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl p-6">
        {/* Icon */}
        {isDestructive && (
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
            <TrashIcon />
          </div>
        )}

        {/* Text */}
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 leading-snug">
          {item.title}
        </h3>
        {item.description && (
          <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
            {item.description}
          </p>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={() => onResolve(false)}
            className="h-9 px-4 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            {item.cancelLabel ?? "Cancel"}
          </button>
          <button
            autoFocus
            onClick={() => onResolve(true)}
            className={`h-9 px-4 rounded-lg text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isDestructive
                ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                : "bg-accent hover:bg-accent/90 focus:ring-accent"
            }`}
          >
            {item.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirms, setConfirms] = useState<ConfirmItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
  }, []);

  const addToast = useCallback(
    (variant: ToastVariant, title: string, message?: string) => {
      const id = Math.random().toString(36).slice(2, 9);
      setToasts((prev) => [...prev.slice(-4), { id, variant, title, message }]);
      const t = setTimeout(() => dismiss(id), 5000);
      timers.current.set(id, t);
    },
    [dismiss],
  );

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = Math.random().toString(36).slice(2, 9);
      setConfirms((prev) => [...prev, { ...options, id, resolve }]);
    });
  }, []);

  const handleConfirmResolve = useCallback((id: string, value: boolean) => {
    setConfirms((prev) => {
      const item = prev.find((c) => c.id === id);
      if (item) item.resolve(value);
      return prev.filter((c) => c.id !== id);
    });
  }, []);

  const ctx: ToastContextValue = {
    toast: {
      success: (title, msg) => addToast("success", title, msg),
      error: (title, msg) => addToast("error", title, msg),
      info: (title, msg) => addToast("info", title, msg),
      warning: (title, msg) => addToast("warning", title, msg),
    },
    confirm,
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}

      {/* Confirm dialogs — one at a time */}
      {confirms[0] && (() => {
        const first = confirms[0]!;
        return (
          <ConfirmDialog
            key={first.id}
            item={first}
            onResolve={(v) => handleConfirmResolve(first.id, v)}
          />
        );
      })()}

      {/* Toast stack — bottom-right */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2 pointer-events-none"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast item={t} onDismiss={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
