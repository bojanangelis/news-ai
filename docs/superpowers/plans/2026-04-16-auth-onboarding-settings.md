# Auth, Onboarding & Settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable public registration, build a 3-step onboarding wizard, and expand the `/account` page into a full settings hub with profile edit, language, notification toggles, payment cards, and logout.

**Architecture:** Approach B — `page.tsx` server shells pass props to `*-client.tsx` client components. Onboarding lives at `app/onboarding/` (root level, outside any route group) to avoid inheriting the auth card layout. Settings expand the existing `account-client.tsx` with clearly separated sections.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, `lib/client-api.ts` (fetch with cookies), `lib/auth.ts` (JWT decode), `lib/api.ts` (server-side fetch)

> **Note on testing:** No test infrastructure exists in this project. Each task verifies with `pnpm check-types` and `pnpm lint` instead of unit tests.

---

## File Map

### Created
```
apps/web/app/onboarding/layout.tsx           — full-screen layout (no nav/footer)
apps/web/app/onboarding/page.tsx             — server shell: auth guard + fetch categories
apps/web/app/onboarding/onboarding-client.tsx — step state machine (client)
apps/web/components/onboarding/step-language.tsx
apps/web/components/onboarding/step-categories.tsx
apps/web/components/onboarding/step-done.tsx
```

### Modified
```
apps/web/app/(auth)/register/page.tsx         — remove redirect(), render RegisterForm
apps/web/components/auth/register-form.tsx    — add confirmPassword, strength bar, inline validation
apps/web/app/(reader)/account/page.tsx        — pass initialCards prop (empty array, TODO)
apps/web/app/(reader)/account/account-client.tsx — full rewrite: 5 sections
```

---

## Task 1: Enable the register page

**Files:**
- Modify: `apps/web/app/(auth)/register/page.tsx`

- [ ] **Step 1: Replace the redirect with the real page**

Replace the entire file content:

```tsx
import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create Account",
  robots: { index: false },
};

export default function RegisterPage() {
  return (
    <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-sm p-8">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Create your account</h1>
      <p className="text-sm text-neutral-500 mb-8">
        Join NewsPlus — free forever, premium when you're ready.
      </p>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-neutral-500">
        Already have an account?{" "}
        <a href="/login" className="font-medium text-accent hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify types**

```bash
pnpm --filter web check-types
```

Expected: no errors related to register.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(auth\)/register/page.tsx
git commit -m "feat: enable public registration page"
```

---

## Task 2: Enhance RegisterForm with confirm-password, strength bar, and inline validation

**Files:**
- Modify: `apps/web/components/auth/register-form.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
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
  const levels: Strength[] = [
    { score: 0, label: "Weak",   textColor: "text-red-500",   barColor: "bg-red-400",   barWidth: "w-1/3" },
    { score: 1, label: "Medium", textColor: "text-amber-500", barColor: "bg-amber-400", barWidth: "w-2/3" },
    { score: 2, label: "Strong", textColor: "text-green-500", barColor: "bg-green-500", barWidth: "w-full" },
  ];
  return levels[score] ?? levels[0];
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
```

- [ ] **Step 2: Verify types**

```bash
pnpm --filter web check-types
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/auth/register-form.tsx
git commit -m "feat: add confirm-password, strength bar, and inline validation to RegisterForm"
```

---

## Task 3: Create onboarding layout

**Files:**
- Create: `apps/web/app/onboarding/layout.tsx`

- [ ] **Step 1: Create the layout file**

```tsx
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col">
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Verify types**

```bash
pnpm --filter web check-types
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/onboarding/layout.tsx
git commit -m "feat: add onboarding full-screen layout"
```

---

## Task 4: Create onboarding step components

**Files:**
- Create: `apps/web/components/onboarding/step-language.tsx`
- Create: `apps/web/components/onboarding/step-categories.tsx`
- Create: `apps/web/components/onboarding/step-done.tsx`

- [ ] **Step 1: Create `step-language.tsx`**

```tsx
"use client";

interface Props {
  selected: string;
  onSelect: (lang: string) => void;
  onNext: () => void;
}

const LANGUAGES = [
  { code: "mk", flag: "🇲🇰", label: "Македонски", sublabel: "Macedonian" },
  { code: "en", flag: "🇬🇧", label: "English", sublabel: "English" },
  // TODO: add { code: "sq", flag: "🇦🇱", label: "Shqip", sublabel: "Albanian" } when ready
];

export function StepLanguage({ selected, onSelect, onNext }: Props) {
  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-2xl font-bold tracking-tight mb-2">Welcome! Pick your language.</h2>
      <p className="text-sm text-neutral-500 mb-8">You can change this anytime in settings.</p>

      <div className="flex flex-col gap-3 flex-1">
        {LANGUAGES.map((lang) => {
          const isSelected = selected === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => onSelect(lang.code)}
              className={`flex items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-all ${
                isSelected
                  ? "border-accent bg-accent/5"
                  : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
              }`}
            >
              <span className="text-3xl">{lang.flag}</span>
              <div className="flex-1">
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">{lang.label}</p>
                <p className="text-sm text-neutral-500">{lang.sublabel}</p>
              </div>
              {isSelected && (
                <div className="h-5 w-5 rounded-full bg-accent flex items-center justify-center shrink-0">
                  <svg
                    className="h-3 w-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onNext}
        className="mt-8 w-full h-11 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors"
      >
        Continue →
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `step-categories.tsx`**

```tsx
"use client";

const MIN_SELECTED = 3;

export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string | null;
}

interface Props {
  categories: Category[];
  selected: string[];
  onToggle: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepCategories({ categories, selected, onToggle, onNext, onBack }: Props) {
  const canContinue = selected.length >= MIN_SELECTED;
  const remaining = MIN_SELECTED - selected.length;

  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-2xl font-bold tracking-tight mb-2">What do you care about?</h2>
      <p className="text-sm text-neutral-500 mb-6">Pick at least 3. We'll personalise your feed.</p>

      <div className="flex flex-wrap gap-2.5 flex-1 content-start">
        {categories.map((cat) => {
          const isSelected = selected.includes(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onToggle(cat.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                isSelected
                  ? "bg-accent text-white"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-neutral-400">
        {selected.length} of {categories.length} selected
        {!canContinue && remaining > 0 && ` — pick ${remaining} more`}
      </p>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="h-11 px-5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canContinue}
          className="flex-1 h-11 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `step-done.tsx`**

```tsx
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
```

- [ ] **Step 4: Verify types**

```bash
pnpm --filter web check-types
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/onboarding/
git commit -m "feat: add onboarding step components (language, categories, done)"
```

---

## Task 5: Create the onboarding client (step state machine)

**Files:**
- Create: `apps/web/app/onboarding/onboarding-client.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useState, useEffect } from "react";
import { StepLanguage } from "@/components/onboarding/step-language";
import { StepCategories, type Category } from "@/components/onboarding/step-categories";
import { StepDone } from "@/components/onboarding/step-done";

interface Props {
  categories: Category[];
}

const TOTAL_STEPS = 3;

export function OnboardingClient({ categories }: Props) {
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState("mk");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Persist language to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("np_lang", language);
  }, [language]);

  // Persist selected categories when the user advances past step 2
  // (called explicitly in onNext so we only save on confirmed selection)
  function saveAndAdvanceToStep2() {
    localStorage.setItem("np_onboarding_categories", JSON.stringify(selectedCategories));
    setStep(2);
  }

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  const progressPct = ((step + 1) / TOTAL_STEPS) * 100;
  const isDone = step === 2;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Progress bar */}
      <div className="h-1 w-full bg-neutral-100 dark:bg-neutral-800 shrink-0">
        <div
          className={`h-full transition-all duration-500 ${isDone ? "bg-green-500" : "bg-accent"}`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="flex flex-col flex-1 px-4 py-8 w-full max-w-lg mx-auto">
        {/* Logo */}
        <a
          href="/"
          className="inline-flex items-center gap-1 text-lg font-bold tracking-tight mb-10 self-start"
        >
          <span className="text-accent">News</span>
          <span className="text-neutral-900 dark:text-neutral-100">Plus</span>
        </a>

        {step === 0 && (
          <StepLanguage
            selected={language}
            onSelect={setLanguage}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <StepCategories
            categories={categories}
            selected={selectedCategories}
            onToggle={toggleCategory}
            onNext={saveAndAdvanceToStep2}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && <StepDone />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types**

```bash
pnpm --filter web check-types
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/onboarding/onboarding-client.tsx
git commit -m "feat: add onboarding client step state machine"
```

---

## Task 6: Create the onboarding server page

**Files:**
- Create: `apps/web/app/onboarding/page.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionFromCookies } from "@/lib/auth";
import { getCategories } from "@/lib/api";
import { OnboardingClient } from "./onboarding-client";
import type { Category } from "@/components/onboarding/step-categories";

export const metadata: Metadata = {
  title: "Set up your feed",
  robots: { index: false },
};

export default async function OnboardingPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  // Fetch categories server-side so the page renders fully on first load
  const result = await getCategories().catch(() => ({ data: [] as unknown[] }));
  const categories = (result.data as Category[]) ?? [];

  return <OnboardingClient categories={categories} />;
}
```

- [ ] **Step 2: Verify types and lint**

```bash
pnpm --filter web check-types && pnpm --filter web lint
```

Expected: no errors.

- [ ] **Step 3: Smoke test manually**

Run the dev server:
```bash
pnpm --filter web dev
```

1. Go to `http://localhost:3000/onboarding` while logged out → should redirect to `/login`
2. Log in, then go to `/onboarding` → should show Step 1 (language picker, no nav/footer visible)
3. Select English → click Continue → Step 2 (categories)
4. Select 3+ categories → Continue → Step 3 (done screen, progress bar turns green)
5. Click "Start reading →" → lands on `/`

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/onboarding/
git commit -m "feat: complete onboarding wizard (language + categories + done)"
```

---

## Task 7: Expand account page server shell to pass `initialCards`

**Files:**
- Modify: `apps/web/app/(reader)/account/page.tsx`

- [ ] **Step 1: Add `initialCards` fetch (graceful no-op until Stripe)**

Replace the entire file:

```tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionFromCookies } from "@/lib/auth";
import { AccountClient } from "./account-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface PaymentCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isActive: boolean;
}

export default async function AccountPage() {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value ?? "";
  const authHeader = { Authorization: `Bearer ${token}` };

  const [meRes, subRes] = await Promise.allSettled([
    fetch(`${API_URL}/v1/auth/me`, { headers: authHeader, cache: "no-store" }),
    fetch(`${API_URL}/v1/subscription/status`, { headers: authHeader, cache: "no-store" }),
    // TODO: fetch(`${API_URL}/v1/payment/cards`, { headers: authHeader, cache: "no-store" })
    // when Stripe integration is ready (Phase 2)
  ]);

  const me = meRes.status === "fulfilled" ? await meRes.value.json().catch(() => ({})) : {};
  const sub = subRes.status === "fulfilled" ? await subRes.value.json().catch(() => ({})) : {};

  const user = me.data ?? null;
  const subscription = sub.data ?? null;

  if (!user) redirect("/login");

  // Payment cards: empty until Stripe Phase 2
  const initialCards: PaymentCard[] = [];

  return (
    <AccountClient
      initialUser={user}
      initialSub={subscription}
      initialCards={initialCards}
    />
  );
}
```

- [ ] **Step 2: Verify types**

```bash
pnpm --filter web check-types
```

Expected: error because `AccountClient` doesn't yet accept `initialCards` — this is intentional, Task 8 fixes it.

- [ ] **Step 3: Do not commit yet** — commit after Task 8 when types resolve.

---

## Task 8: Rewrite account-client with 5 settings sections

**Files:**
- Modify: `apps/web/app/(reader)/account/account-client.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/client-api";
import type { PaymentCard } from "./page";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubscriptionStatus {
  isPremium: boolean;
  status: string | null;
  plan: string | null;
  expiresAt: string | null;
  trialEndsAt: string | null;
  daysLeft: number | null;
  trialDaysLeft: number | null;
  cancelledAt: string | null;
}

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  isPremium: boolean;
}

interface NotificationPrefs {
  briefing: boolean;
  breaking: boolean;
  topicFollows: boolean;
}

interface Props {
  initialUser: User;
  initialSub: SubscriptionStatus | null;
  initialCards: PaymentCard[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Активна",
  TRIALING: "Пробен период",
  CANCELLED: "Откажана",
  EXPIRED: "Истечена",
  PAST_DUE: "Задоцнета уплата",
};

const SECTION_LABEL = "text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4";
const CARD_CLASS =
  "rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6";
const INPUT_CLASS =
  "w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors";
const BTN_PRIMARY =
  "inline-flex h-10 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50";
const BTN_GHOST =
  "inline-flex h-10 items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 px-5 text-sm text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 transition-colors";

// ─── Toggle component ─────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 ${
        on ? "bg-accent" : "bg-neutral-200 dark:bg-neutral-700"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 mt-0.5 ${
          on ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ─── Card brand display ───────────────────────────────────────────────────────

function CardBrand({ brand }: { brand: string }) {
  const b = brand.toLowerCase();
  if (b === "visa") {
    return (
      <div className="w-10 h-7 rounded bg-gradient-to-br from-[#1a1f71] to-[#0070ba] flex items-center justify-center shrink-0">
        <span className="text-white text-[9px] font-bold">VISA</span>
      </div>
    );
  }
  if (b === "mastercard") {
    return (
      <div className="w-10 h-7 rounded bg-gradient-to-br from-[#eb001b] to-[#f79e1b] flex items-center justify-center shrink-0">
        <span className="text-white text-[8px] font-bold">MC</span>
      </div>
    );
  }
  return (
    <div className="w-10 h-7 rounded bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
      <span className="text-neutral-500 text-[9px] font-bold uppercase">{brand.slice(0, 4)}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AccountClient({ initialUser, initialSub, initialCards }: Props) {
  const router = useRouter();
  const user = initialUser;
  const [sub, setSub] = useState<SubscriptionStatus | null>(initialSub);
  const [cards] = useState<PaymentCard[]>(initialCards);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: user.name, email: user.email });
  const [savingProfile, setSavingProfile] = useState(false);

  // Language
  const [language, setLanguage] = useState<string>("mk");
  useEffect(() => {
    setLanguage(localStorage.getItem("np_lang") ?? "mk");
  }, []);

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    briefing: true,
    breaking: false,
    topicFollows: false,
  });
  useEffect(() => {
    const saved = localStorage.getItem("np_notification_prefs");
    if (saved) {
      try { setNotifPrefs(JSON.parse(saved) as NotificationPrefs); } catch { /* ignore */ }
    }
  }, []);

  function toggleNotif(key: keyof NotificationPrefs) {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("np_notification_prefs", JSON.stringify(next));
      return next;
    });
  }

  function handleLanguageChange(lang: string) {
    setLanguage(lang);
    localStorage.setItem("np_lang", lang);
  }

  // Subscription actions
  const [cancelling, setCancelling] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);

  async function handleStartTrial() {
    setStartingTrial(true);
    try {
      const res = await fetch("/api/subscription/trial", { method: "POST" });
      const json = await res.json() as { data?: { message?: string }; message?: string };
      if (!res.ok) throw new Error(json.message ?? "Грешка");
      setMessage({ type: "success", text: json.data?.message ?? "Пробниот период е активиран!" });
      setSub((prev) => ({ ...prev!, status: "TRIALING", isPremium: true }));
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Грешка при активирање" });
    } finally {
      setStartingTrial(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Дали си сигурен дека сакаш да ја откажеш претплатата?")) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/subscription/cancel", { method: "DELETE" });
      const json = await res.json() as { message?: string };
      if (!res.ok) throw new Error(json.message ?? "Грешка");
      setMessage({ type: "success", text: "Претплатата е откажана." });
      setSub((prev) => ({ ...prev!, status: "CANCELLED", cancelledAt: new Date().toISOString() }));
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Грешка при откажување" });
    } finally {
      setCancelling(false);
    }
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      // TODO: implement PATCH /v1/auth/me on the API side (Phase 2)
      // await clientFetch("/auth/me", { method: "PATCH", body: JSON.stringify(profileForm) });
      await new Promise((r) => setTimeout(r, 500)); // placeholder
      setMessage({ type: "success", text: "Profile saved (API integration pending)." });
      setEditingProfile(false);
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Save failed." });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleLogout() {
    await authApi.logout().catch(() => {});
    window.location.href = "/";
  }

  const isPremium = user.isPremium || sub?.isPremium;
  const planLabel = sub?.plan === "yearly" ? "Годишна" : sub?.plan === "monthly" ? "Месечна" : "—";

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12 space-y-4">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Мој профил</h1>

      {/* Message banner */}
      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-between ${
            message.type === "success"
              ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          }`}
        >
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-3 opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {/* ── 1. Profile ────────────────────────────────────────────────────── */}
      <div className={CARD_CLASS}>
        <h2 className={SECTION_LABEL}>Профил</h2>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center text-2xl font-bold text-accent shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">{user.name}</p>
            <p className="text-sm text-neutral-500 truncate">{user.email}</p>
          </div>
          {isPremium && (
            <span className="rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-400 shrink-0">
              Premium
            </span>
          )}
          <button
            type="button"
            onClick={() => setEditingProfile((v) => !v)}
            className="shrink-0 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
          >
            {editingProfile ? "Откажи" : "Уреди"}
          </button>
        </div>

        {editingProfile && (
          <div className="mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">Полно ime</label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1.5">Email</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                className={INPUT_CLASS}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className={BTN_PRIMARY}
              >
                {savingProfile ? "Зачувување…" : "Зачувај"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Language & Reading ─────────────────────────────────────────── */}
      <div className={CARD_CLASS}>
        <h2 className={SECTION_LABEL}>Читање и јазик</h2>
        <div className="space-y-0 divide-y divide-neutral-100 dark:divide-neutral-800">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Јазик на интерфејс</p>
            </div>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="mk">🇲🇰 Македонски</option>
              <option value="en">🇬🇧 English</option>
              {/* TODO: add sq (Albanian) */}
            </select>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">Омилени категории</p>
              <p className="text-xs text-neutral-400 mt-0.5">Одбери ги темите кои те интересираат</p>
            </div>
            <Link
              href="/onboarding"
              className="text-sm font-medium text-accent hover:text-accent/80 transition-colors"
            >
              Уреди
            </Link>
          </div>
        </div>
      </div>

      {/* ── 3. Notifications ─────────────────────────────────────────────── */}
      <div className={CARD_CLASS}>
        <h2 className={SECTION_LABEL}>Известувања</h2>
        {/* TODO: wire to push notification API when available */}
        <div className="space-y-0 divide-y divide-neutral-100 dark:divide-neutral-800">
          {(
            [
              {
                key: "briefing" as const,
                label: "Дневен брифинг",
                desc: "Утринска сумаризација во 07:00",
              },
              {
                key: "breaking" as const,
                label: "Скршени вести",
                desc: "Итни вести во реално време",
              },
              {
                key: "topicFollows" as const,
                label: "Нови написи од следени теми",
                desc: "Кога ќе се објави нов напис",
              },
            ] satisfies { key: keyof NotificationPrefs; label: string; desc: string }[]
          ).map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-3.5">
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{label}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{desc}</p>
              </div>
              <Toggle on={notifPrefs[key]} onToggle={() => toggleNotif(key)} />
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. Subscription + Cards ───────────────────────────────────────── */}
      <div className={CARD_CLASS}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`${SECTION_LABEL} mb-0`}>Претплата</h2>
          <div className="flex items-center gap-2">
            {isPremium ? (
              <>
                <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-bold text-green-700 dark:text-green-400">
                  ● Premium
                </span>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="text-xs text-neutral-500 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-1.5 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  {cancelling ? "Откажување…" : "Деактивирај"}
                </button>
              </>
            ) : (
              <>
                <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1 text-xs font-bold text-neutral-500">
                  ● Бесплатно
                </span>
                <Link
                  href="/premium"
                  className="text-xs font-semibold text-white bg-indigo-600 rounded-lg px-3 py-1.5 hover:bg-indigo-700 transition-colors"
                >
                  Надгради →
                </Link>
              </>
            )}
          </div>
        </div>

        {isPremium && sub?.status ? (
          <div className="space-y-0 divide-y divide-neutral-100 dark:divide-neutral-800">
            <div className="flex justify-between text-sm py-2.5">
              <span className="text-neutral-500">Статус</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {STATUS_LABEL[sub.status] ?? sub.status}
              </span>
            </div>
            {sub.plan && (
              <div className="flex justify-between text-sm py-2.5">
                <span className="text-neutral-500">План</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{planLabel}</span>
              </div>
            )}
            {sub.daysLeft !== null && sub.status === "ACTIVE" && (
              <div className="flex justify-between text-sm py-2.5">
                <span className="text-neutral-500">Следна наплата за</span>
                <span className="font-medium text-neutral-800 dark:text-neutral-200">{sub.daysLeft} дена</span>
              </div>
            )}
            {sub.trialDaysLeft !== null && sub.status === "TRIALING" && (
              <div className="flex justify-between text-sm py-2.5">
                <span className="text-neutral-500">Пробен период истекува за</span>
                <span className="font-medium text-amber-600">{sub.trialDaysLeft} дена</span>
              </div>
            )}

            {/* Payment cards */}
            <div className="pt-4 pb-1">
              <p className="text-xs font-semibold text-neutral-500 mb-3">Платежни картички</p>
              {cards.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {cards.map((card) => {
                    const isExpired =
                      new Date(card.expYear, card.expMonth - 1) < new Date();
                    return (
                      <div
                        key={card.id}
                        className={`flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-700 p-3 ${isExpired ? "opacity-60" : ""}`}
                      >
                        <CardBrand brand={card.brand} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            •••• •••• •••• {card.last4}
                          </p>
                          <p className="text-xs text-neutral-400">
                            Истекува {String(card.expMonth).padStart(2, "0")}/{card.expYear}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-semibold rounded-md px-2 py-0.5 shrink-0 ${
                            isExpired
                              ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                          }`}
                        >
                          {isExpired ? "Истечена" : "Активна"}
                        </span>
                        {/* TODO: wire to DELETE /v1/payment/cards/:id (Stripe Phase 2) */}
                        <button
                          type="button"
                          onClick={() => alert("Card removal coming in Phase 2")}
                          className="text-neutral-400 hover:text-red-500 transition-colors text-sm shrink-0"
                          aria-label="Remove card"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-neutral-400 mb-3">Нема зачувани картички.</p>
              )}
              {/* TODO: open Stripe Elements sheet (Phase 2) */}
              <button
                type="button"
                onClick={() => alert("Add card — Stripe integration coming in Phase 2")}
                className="w-full h-10 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 text-sm text-neutral-500 hover:border-neutral-300 hover:text-neutral-700 transition-colors flex items-center justify-center gap-2"
              >
                <span className="text-lg leading-none">+</span> Додај картичка
              </button>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <Link href="/premium" className={BTN_GHOST + " flex-1 justify-center"}>
                Погледни планови
              </Link>
              {sub.status !== "CANCELLED" && sub.status !== "EXPIRED" && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className={BTN_GHOST + " flex-1 hover:border-red-300 hover:text-red-600"}
                >
                  {cancelling ? "Откажување…" : "Откажи претплата"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              Немаш активна претплата.
            </p>
            <button
              type="button"
              onClick={handleStartTrial}
              disabled={startingTrial}
              className={BTN_PRIMARY}
            >
              {startingTrial ? "Активирање…" : "Почни 7-дневен пробен период"}
            </button>
            <p className="mt-2 text-xs text-neutral-400">
              Или{" "}
              <Link href="/premium" className="text-accent underline">
                погледни ги плановите
              </Link>
            </p>
          </div>
        )}
      </div>

      {/* ── 5. Logout ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-red-100 dark:border-red-900/30 bg-white dark:bg-neutral-900 p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-red-400 mb-4">Излез</h2>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full h-10 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          Одјави се
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types and lint**

```bash
pnpm --filter web check-types && pnpm --filter web lint
```

Expected: no errors.

- [ ] **Step 3: Smoke test manually**

Run dev server:
```bash
pnpm --filter web dev
```

1. Go to `/account` while logged out → redirects to `/login` ✓
2. Log in → go to `/account` → see all 5 sections ✓
3. Click "Уреди" on profile → name/email inputs appear → click "Зачувај" → success banner ✓
4. Change language dropdown → inspect `localStorage.getItem("np_lang")` in devtools ✓
5. Toggle "Дневен брифинг" OFF → inspect `localStorage.getItem("np_notification_prefs")` ✓
6. Premium section: badge shows correctly for your account's subscription state ✓
7. "Одјави се" → calls logout, redirects to `/` ✓

- [ ] **Step 4: Commit both account files together**

```bash
git add apps/web/app/\(reader\)/account/
git commit -m "feat: expand account page into full settings hub (profile, language, notifications, subscription+cards, logout)"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Register page enabled — Task 1
- ✅ Confirm-password + strength bar + validation — Task 2
- ✅ Onboarding full-screen layout — Task 3
- ✅ Onboarding steps (language, categories, done) — Task 4
- ✅ Onboarding state machine + localStorage persistence — Task 5
- ✅ Onboarding server page (auth guard + categories fetch) — Task 6
- ✅ Account page passes `initialCards` — Task 7
- ✅ Profile edit section — Task 8
- ✅ Language dropdown (mk/en) + category edit shortcut — Task 8
- ✅ 3 notification toggles + localStorage — Task 8
- ✅ Subscription with Premium badge + toggle button — Task 8
- ✅ Payment cards list + add/remove (Phase 2 placeholders) — Task 8
- ✅ Logout button — Task 8

**Placeholder scan:**
- All Phase 2 integration points are `// TODO:` comments with `alert()` placeholder actions — not silent no-ops
- `handleSaveProfile` is a visible placeholder with a 500ms delay and a "pending" message to the user

**Type consistency:**
- `Category` type exported from `step-categories.tsx`, imported in `onboarding-client.tsx` and `page.tsx` ✓
- `PaymentCard` type exported from `account/page.tsx`, imported in `account-client.tsx` ✓
- `NotificationPrefs` interface defined and used consistently ✓
- `SubscriptionStatus` and `User` interfaces unchanged from original ✓
