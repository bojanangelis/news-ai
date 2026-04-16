# Auth, Onboarding & Settings — Design Spec

**Date:** 2026-04-16
**Project:** NewsPlus (Macedonian Apple News-style reader)
**Scope:** Register page, onboarding wizard, expanded account/settings page

---

## 1. Context

The app is a Next.js 16 App Router monorepo targeting the Macedonian market. Auth uses JWT stored in `access_token` cookie, validated server-side via `getSessionFromCookies()`. The API is NestJS at `http://localhost:4000`. Client API calls go through `lib/client-api.ts` using `credentials: "include"`.

**Existing state before this work:**
- `/register` page exists but redirects to `/login` (public registration disabled)
- `RegisterForm` component exists but lacks confirm-password and client-side validation
- No `/onboarding` route exists
- `/account` page exists with profile + subscription cards only

---

## 2. Register Page

### Route
`(auth)/register/page.tsx` — inside the existing auth layout (centered card, max-w-md, no nav/footer).

### What changes
The page currently does `redirect("/login")`. Replace this with the proper page shell that renders `RegisterForm`.

### RegisterForm enhancements (`components/auth/register-form.tsx`)
- Add `confirmPassword` field with real-time match validation
- Add password strength bar (weak / medium / strong, computed client-side by length + character class rules)
- Inline validation messages below each field (not just on submit)
- Disable the submit button until: all fields filled, passwords match, password meets minimum strength
- On success: `authApi.register()` already redirects to `/onboarding` — no change needed
- Error handling: existing red alert box pattern, unchanged

### Fields
| Field | Type | Validation |
|---|---|---|
| Full name | text | required, min 2 chars |
| Email | email | required, valid email format |
| Password | password | required, min 8 chars, 1 uppercase, 1 number |
| Confirm password | password | must match password |

### Copy
- Heading: "Create your account"
- Subheading: "Join NewsPlus — free forever, premium when you're ready."
- Submit: "Create account →"
- Bottom link: "Already have an account? Sign in"
- Legal: existing Terms + Privacy Policy line, unchanged

### No social auth buttons — the project has no social auth pattern.

---

## 3. Onboarding Wizard

### Route
`app/onboarding/` — at the **app root, outside any route group**. This is critical: Next.js nests layouts, so placing it under `(auth)/` would wrap it in the max-w-md auth card layout. At the root level it gets its own isolated layout.

### Files
```
apps/web/app/onboarding/
  layout.tsx           ← full-screen layout (no SiteHeader/SiteFooter)
  page.tsx             ← server shell: auth guard + fetch categories
  onboarding-client.tsx ← drives step state (client component)

apps/web/components/onboarding/
  step-language.tsx    ← Step 1
  step-categories.tsx  ← Step 2
  step-done.tsx        ← Step 3
```

### Layout
Full-screen white/dark page. No nav, no footer. NewsPlus logo top-left. Thin progress bar (accent red) at very top of viewport, fills across steps.

### Steps

**Step 1 — Language**
- Heading: "Welcome! Pick your language."
- Subheading: "You can change this anytime in settings."
- Two large tappable cards: 🇲🇰 Македонски (default selected), 🇬🇧 English
- Albanian (`sq`) is planned but excluded for now — add as a third card when ready
- Selection saved to `localStorage` key `np_lang` (frontend only for now)
- **Integration point:** When a user preferences API endpoint exists (`PATCH /v1/users/me/preferences`), replace the localStorage write with an API call

**Step 2 — Categories**
- Heading: "What do you care about?"
- Subheading: "Pick at least 3. We'll personalise your feed."
- Pills fetched from `GET /v1/categories` (server-side in `page.tsx`, passed as props)
- Multi-select toggle pills. Selected = accent red fill. Unselected = neutral.
- Continue button disabled until ≥ 3 selected
- Counter label: "X of N selected"
- Back button returns to Step 1
- **Integration point:** Selections saved via `topicsApi` or a dedicated category-follow endpoint. For now, save to `localStorage` key `np_onboarding_categories` (array of category IDs)

**Step 3 — Done**
- Full progress bar turns green
- Large ✓ circle (green)
- Heading: "You're all set!"
- Body: "Your feed is personalised and ready. New stories drop every morning."
- CTA: "Start reading →" → navigates to `/`
- Secondary link: "Edit preferences" → navigates to `/account`

### Auth guard
`page.tsx` calls `getSessionFromCookies()`. If no session, redirect to `/login`. If session exists but onboarding already completed (future: check a `onboardingCompletedAt` field on the user), redirect to `/`.

---

## 4. Account / Settings Page

### Route
`(reader)/account/` — stays in the reader layout (SiteHeader + SiteFooter). Auth guard already in place.

### Architecture
- `page.tsx` (server): fetches `/v1/auth/me` + `/v1/subscription/status` + `/v1/payment/cards` (integration point — endpoint TBD)
- `account-client.tsx` (client): receives `initialUser`, `initialSub`, `initialCards` as props. Manages all interactive state.

### Sections

#### 1. Профил
- Avatar initials circle (existing pattern)
- Inline edit: name + email fields, hidden behind "Уреди" button
- Save calls `PATCH /v1/auth/me` (integration point — endpoint may not exist yet; mark with TODO comment)
- Success/error feedback via the existing message banner pattern

#### 2. Читање и јазик
- Language dropdown: `🇲🇰 Македонски` / `🇬🇧 English`
- Saves to `localStorage` key `np_lang` (same key as onboarding)
- "Омилени категории" row shows selected category names from `localStorage np_onboarding_categories`
- "Уреди" button → navigates back to `/onboarding` (re-do the flow)

#### 3. Известувања
Three toggle rows, each with label + description + ON/OFF toggle switch:
| Toggle | Default | Description |
|---|---|---|
| Дневен брифинг | ON | Morning summary at 07:00 |
| Скршени вести | OFF | Breaking news real-time |
| Нови написи од следени теми | OFF | New article from followed topic |

Saved to `localStorage` key `np_notification_prefs` (object).
**Integration point:** When push notification / user prefs API is ready, sync on change.

#### 4. Претплата
Two states:

**Premium active:**
- Green "● Premium" badge + "Деактивирај" button (confirms before calling cancel endpoint)
- Subscription status row (status, plan, next billing date)
- Saved payment cards list:
  - Each card: brand logo (VISA/MC rendered via CSS), masked number `•••• •••• •••• XXXX`, expiry, Active/Expired badge, ✕ remove button
  - ✕ calls `DELETE /v1/payment/cards/:id` (**integration point — Stripe not yet integrated**)
- "Додај картичка" dashed button → opens Stripe Elements sheet (**integration point**)
- "Погледни планови" + "Откажи претплата" buttons (existing behaviour)

**Free / no subscription:**
- Grey "● Бесплатно" badge + purple "Надгради →" button
- No card list shown
- Trial CTA button: "Почни 7-дневен пробен период" (existing)

#### 5. Одјави се
- Single "Одјави се" button
- Calls `authApi.logout()` then `window.location.href = "/"` (same as NavUser)

---

## 5. Integration Points Summary

| # | Feature | Current state | What's needed |
|---|---|---|---|
| 1 | Language preference | `localStorage np_lang` | `PATCH /v1/users/me/preferences { lang }` |
| 2 | Category onboarding save | `localStorage np_onboarding_categories` | `POST /v1/users/me/categories` or follow endpoints |
| 3 | Profile edit | Not implemented | `PATCH /v1/auth/me { name, email }` |
| 4 | Notification prefs | `localStorage np_notification_prefs` | User prefs API + push notification service |
| 5 | Payment cards list | Not implemented | `GET /v1/payment/cards` (Stripe Phase 2) |
| 6 | Add card | Not implemented | Stripe Elements integration (Phase 2) |
| 7 | Remove card | Not implemented | `DELETE /v1/payment/cards/:id` (Phase 2) |
| 8 | Onboarding completion flag | Not tracked | `onboardingCompletedAt` field on User model |

---

## 6. Files to Create / Modify

### New files
```
apps/web/app/onboarding/layout.tsx
apps/web/app/onboarding/page.tsx
apps/web/app/onboarding/onboarding-client.tsx
apps/web/components/onboarding/step-language.tsx
apps/web/components/onboarding/step-categories.tsx
apps/web/components/onboarding/step-done.tsx
```

### Modified files
```
apps/web/app/(auth)/register/page.tsx         ← remove redirect, render RegisterForm
apps/web/components/auth/register-form.tsx    ← add confirm-password, strength bar, validation
apps/web/app/(reader)/account/account-client.tsx  ← expand with 5 sections
apps/web/app/(reader)/account/page.tsx        ← pass initialCards prop
```

---

## 7. Design Tokens (match existing patterns)

- Card: `rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6`
- Section label: `text-xs font-bold uppercase tracking-widest text-neutral-400`
- Input: `rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent`
- Primary button: `rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90`
- Error banner: `rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700`
- Success banner: `rounded-xl bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400`
- Accent color: `accent` (defined in Tailwind config as the app red)
