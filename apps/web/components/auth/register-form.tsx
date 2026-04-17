"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/client-api";

interface Strength {
  score: 0 | 1 | 2;
  label: string;
  textColor: string;
  barColor: string;
  barWidth: string;
}

function getPasswordStrength(password: string): Strength {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[0-9]/.test(password)) score++;
  if (score === 2) return { score: 2, label: "Strong", textColor: "text-green-500", barColor: "bg-green-500", barWidth: "w-full" };
  if (score === 1) return { score: 1, label: "Medium", textColor: "text-amber-500", barColor: "bg-amber-400", barWidth: "w-2/3" };
  return { score: 0, label: "Weak", textColor: "text-red-500", barColor: "bg-red-400", barWidth: "w-1/3" };
}

const INPUT_BASE =
  "w-full rounded-xl border bg-white dark:bg-neutral-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors";

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function touch(field: string) {
    return () => setTouched((t) => ({ ...t, [field]: true }));
  }

  const strength = getPasswordStrength(form.password);
  const passwordsMatch = form.password === form.confirmPassword;
  const nameValid = form.name.trim().length >= 2;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const passwordValid =
    form.password.length >= 8 && /[A-Z]/.test(form.password) && /[0-9]/.test(form.password);
  const canSubmit = nameValid && emailValid && passwordValid && passwordsMatch && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirmPassword: true });
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    try {
      await authApi.register({ name: form.name.trim(), email: form.email, password: form.password });
      router.push("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  const confirmBorderColor =
    touched.confirmPassword && form.confirmPassword
      ? passwordsMatch
        ? "border-green-400 dark:border-green-600"
        : "border-red-400 dark:border-red-600"
      : "border-neutral-200 dark:border-neutral-700";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Full name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1.5">
          Full name
        </label>
        <input
          id="name"
          type="text"
          required
          autoComplete="name"
          value={form.name}
          onChange={set("name")}
          onBlur={touch("name")}
          className={`${INPUT_BASE} border-neutral-200 dark:border-neutral-700`}
          placeholder="Jane Doe"
        />
        {touched.name && !nameValid && (
          <p className="mt-1 text-xs text-red-500">At least 2 characters required</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="reg-email" className="block text-sm font-medium mb-1.5">
          Email
        </label>
        <input
          id="reg-email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={set("email")}
          onBlur={touch("email")}
          className={`${INPUT_BASE} border-neutral-200 dark:border-neutral-700`}
          placeholder="you@example.com"
        />
        {touched.email && !emailValid && (
          <p className="mt-1 text-xs text-red-500">Enter a valid email address</p>
        )}
      </div>

      {/* Password + strength bar */}
      <div>
        <label htmlFor="reg-password" className="block text-sm font-medium mb-1.5">
          Password
        </label>
        <input
          id="reg-password"
          type="password"
          required
          autoComplete="new-password"
          value={form.password}
          onChange={set("password")}
          onBlur={touch("password")}
          className={`${INPUT_BASE} border-neutral-200 dark:border-neutral-700`}
          placeholder="Min. 8 chars, 1 uppercase, 1 number"
        />
        {form.password && (
          <div className="mt-2 space-y-1">
            <div className="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${strength.barWidth} ${strength.barColor}`}
              />
            </div>
            <p className={`text-xs ${strength.textColor}`}>{strength.label} password</p>
          </div>
        )}
        {touched.password && !passwordValid && (
          <p className="mt-1 text-xs text-red-500">Min. 8 characters, 1 uppercase, 1 number</p>
        )}
      </div>

      {/* Confirm password */}
      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium mb-1.5">
          Confirm password
        </label>
        <input
          id="confirm-password"
          type="password"
          required
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={set("confirmPassword")}
          onBlur={touch("confirmPassword")}
          className={`${INPUT_BASE} ${confirmBorderColor}`}
          placeholder="••••••••"
        />
        {touched.confirmPassword && form.confirmPassword && (
          <p className={`mt-1 text-xs ${passwordsMatch ? "text-green-500" : "text-red-500"}`}>
            {passwordsMatch ? "✓ Passwords match" : "Passwords do not match"}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full h-11 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {loading && (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {loading ? "Creating account..." : "Create account →"}
      </button>

      <p className="text-xs text-neutral-400 text-center">
        By creating an account you agree to our{" "}
        <a href="/terms" className="underline">Terms</a> and{" "}
        <a href="/privacy" className="underline">Privacy Policy</a>.
      </p>
    </form>
  );
}
