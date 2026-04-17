# NewsPlus — Product Strategy & Launch Plan
**Date:** 2026-04-07
**Market:** North Macedonia
**Assumption:** Web-first, no native apps in MVP

---

## Executive Review

NewsPlus is a well-timed idea for the Macedonian market. Macedonian news consumption is dominated by Facebook shares and 10+ fragmented clickbait-heavy portals. Trust is low, ad density is high, and no one is doing aggregation + AI. The concept is differentiated.

The codebase is more mature than most pre-launch products: ad system, subscription gating, AI summaries, premium gate, and account management are all structurally in place. The core technical risk is already partially solved.

**The real launch blockers are:**
1. No payment processing (manual-only won't scale past ~50 subscribers)
2. Audio is browser TTS — this is not a premium experience
3. No email/notification system (zero retention lever after signup)

The app is 70% built. The remaining 30% is the hardest 30% for converting paying customers.

---

## What Is Strong

- **Ad system is excellent.** Impression tracking (IAB-compliant), rotation, popup, sticky banner, click redirect — production-grade for a market where banner ads and popups are the norm. This is your real MVP revenue engine.
- **Premium gate is clean.** The gradient fade + lock card is a proven pattern. Implementation is solid.
- **Pricing instinct is right.** 199 MKD/month (~$3.50) is the Macedonian "coffee price" — the psychologically safe threshold.
- **AI summaries in Macedonian.** Nobody else is doing this. Language-native AI is a real differentiator here.
- **Free tier limits are calibrated well.** 2 summaries/day is enough to demonstrate value, not enough to eliminate the upgrade need.
- **7-day trial is already implemented.** Correct friction-reducing mechanism for this market.
- **Groq (Llama 3.1 8B) for summaries.** Near-zero cost at your scale. Good call.

---

## What Is Weak

### 1. Browser TTS is not a premium product
`window.speechSynthesis` with Macedonian voice sounds robotic and inconsistent across devices. For a feature you're charging for, this is a trust-breaker. A user who tries audio once and hears a bad robot voice will not re-subscribe.

### 2. No payment processing
Manual payment via support creates two problems:
- Users drop off at "contact support to pay" — conversion rate will be <20% of trial completers
- You cannot automate renewals, cancellations, or dunning

### 3. No email layer
You have no retention mechanism outside the app. No:
- Welcome email
- Trial expiry warning
- "You're about to lose unlimited summaries" nudge
- Weekly digest to bring users back
This is the #1 churn amplifier.

### 4. Yearly pricing is too aggressive
1,490 MKD/year = 37% off monthly. Users will take this and you'll lose 37% revenue per customer vs monthly. Standard SaaS yearly discount is 15–20%. Recommend **1,790 MKD/year** (saving ~2 months = 25% off).

### 5. Daily briefing is weak as a premium signal
Current briefing = top 10 articles by view count at 6 AM. This is an RSS feed with extra steps. It needs editorial quality signals or it's not a reason to pay.

### 6. "Premium content" framing is awkward
All your content is scraped from free sources. Gating content as "premium" when the same article is free on the source site is a credibility problem. The value is **the experience** (no ads, AI layer) not the content itself. Stop calling it "Premium Article" — call it "Ad-free reading" or remove the content gate entirely.

---

## What Is Missing

| Missing Feature | Impact |
|---|---|
| Stripe payment integration | Critical — manual payment won't scale |
| Real TTS API (OpenAI/ElevenLabs) | Critical — audio is a key paid feature |
| Transactional email (welcome, trial warning, renewal) | High — retention |
| PWA manifest + installable | Medium — feels like an app, improves retention |
| Push notifications (breaking news, daily briefing) | Medium — re-engagement |
| Frequency capping on ads (per-user, not per-session) | Medium — ad quality |
| Social share for articles/summaries | Low |
| Referral/invite flow | Low |

---

## Best Pricing Recommendation

### Free Plan
- Full access to all scraped news
- Ads on all pages (banner, inline, popup — once/day)
- 2 AI summaries per day (teasered, not hidden)
- 7-day full Premium trial on signup

### Premium Plan — **219 MKD/month**
Increase from 199 → 219 MKD (+10%). Rationale:
- 199 MKD is suspiciously cheap — signals low quality in the Balkan market
- 219 MKD is still psychologically under "the cost of one coffee"
- Higher price supports a deeper yearly discount that still feels like a deal

**Premium includes:**
- Zero ads
- Unlimited AI summaries
- Audio summaries (real TTS, not browser)
- Personalized daily briefing (email + in-app)
- Bookmarks sync across devices
- Early access to new features

### Yearly Plan — **1,790 MKD/year**
- = 149 MKD/month effective
- Save 838 MKD vs monthly (32% off — use "Save 838 MKD" as the badge)
- Positioned as: "Pay once, read all year"

### Pricing Table

| | Free | Monthly | Yearly |
|---|---|---|---|
| Price | 0 | 219 MKD/mo | 1,790 MKD/yr |
| Effective per month | — | 219 MKD | 149 MKD |
| AI summaries/day | 2 | Unlimited | Unlimited |
| Audio summaries | No | Yes | Yes |
| Ads | Yes | No | No |
| Daily briefing (email) | No | Yes | Yes |
| Bookmarks | Local only | Synced | Synced |

### Free Trial
- 7 days full Premium on signup — **keep this, it works**
- Show a countdown banner: "6 days left in your Premium trial"
- Send email at day 5: "Your trial ends in 2 days"

### Should you offer limited free summaries on the pricing page as a hook?
Yes. The free tier's 2/day limit should be **visible and framed as a teaser**: "Premium users have unlimited — free users get 2 per day." This is already implemented correctly.

---

## Best MVP Scope

### Must-Have for Launch (blockers right now)

| Feature | Status | Gap |
|---|---|---|
| Stripe payment integration | Not built | Critical blocker |
| Real TTS audio (OpenAI TTS API) | Stubbed | Critical for paid audio feature |
| Transactional email (Resend or Postmark) | Not built | Required for trial conversion |
| Audio caching (save generated MP3 to S3) | Schema ready | Needs service implementation |
| PWA manifest + service worker | Not built | Mobile experience baseline |
| Trial expiry email (day 5 of 7) | Not built | Conversion |

### Good for V2 (post-launch, first 60 days)

| Feature | Rationale |
|---|---|
| Push notifications (Web Push API) | Retention lever — needs permission UX |
| Personalized daily briefing (by category preference) | Current briefing is generic |
| Email digest (weekly top stories) | Re-engagement for churn reduction |
| Referral program ("give a friend 1 free month") | Growth in low-CAC markets |
| Bookmark sync/export | Retention stickiness |
| Article reading history | Personalization input |

### Postpone (V3 or later)

| Feature | Why |
|---|---|
| Native iOS/Android apps | App Store 30% cut kills 219 MKD margin; build web to 1,000 subs first |
| Meilisearch full-text search | Current search is good enough for MVP |
| Stripe annual billing automation | Manual annual is fine at small scale |
| Multi-language support | Macedonian-only is a strength, not a weakness |
| Content recommendation ML | Expensive to build, YAGNI at <10K users |
| Journalist/author profiles | Nice, not conversion-moving |

---

## UX Suggestions

### Ads (free version — not feeling spammy)

**Rules:**
1. **Never** show more than 1 popup per session (you currently have daily limit — enforce session limit too)
2. Inline feed ads: max 1 per 5 articles (every 5th card)
3. Article inline: 1 ad per article, after the 3rd paragraph
4. No autoplay video ads in MVP
5. Sticky bottom banner: dismissable, don't re-show same session
6. House ads (self-promotion of Premium) count against the ad slot — don't add them on top

**The golden rule:** Free users should feel like the app is generous, not trapped. The premium pitch should come from the AI summary teaser, not from ad suffocation.

### Premium vs Free — the feel gap

The premium experience needs to feel immediately, viscerally different:

| Moment | Free | Premium |
|---|---|---|
| Homepage load | Banner ad loads | Clean, no banner |
| Scrolling feed | Inline ad every 5 cards | Pure article cards |
| Opening article | Popup fires (once/day) | No popup, ever |
| Reading article | Sticky bottom ad | No sticky |
| Hitting AI summary | "2/2 used today — upgrade" | Instant summary, no counter |
| Summary → Listen | Browser TTS robot voice | Real TTS, human voice, 1-tap |

The moment a free user upgrades, they should think "oh, this is what the app is supposed to feel like."

### AI Summary UX (article page)

**Keep the current design but add:**
- Show the summary **collapsed by default** with a "Разбери за 10 секунди" (Understand in 10 seconds) button — don't show bullets until clicked
- After expanding: animate bullets in one by one (100ms stagger) — makes it feel alive, not a wall of text
- Audio button should appear **inside** the expanded summary, not separate
- Show word count + estimated read time above the summary button: "5 min read → 10 sec summary"

### Audio Summary UX

**Current:** Browser TTS tacked onto the summary card.
**Recommended:** Persistent mini-player at bottom of screen (like Spotify mini-player):

```
[ ▶ ] AI Summary — Правда.мк: Владата одлучи...  [—]
```

- Appears when user taps Listen
- Persists while scrolling
- Can be dismissed
- Speed control (1x / 1.2x / 1.5x)
- Download button (saves MP3 for offline)

This makes audio feel like a **feature**, not a button.

---

## Technical Suggestions

### Payment: Stripe integration

The manual payment note on your pricing page ("Плаќањето е рачно преку поддршка") will kill conversion. Even if users are willing to pay, the friction of contacting support eliminates 60–80% of them.

**Minimum viable payment flow:**
1. Stripe Checkout (hosted page — least code, highest conversion)
2. Webhook handler: `checkout.session.completed` → set subscription ACTIVE
3. Webhook handler: `customer.subscription.deleted` → set CANCELLED
4. No need to build a full billing portal in MVP — Stripe's hosted portal handles it

**Payment methods for Macedonia:**
- Cards (Visa/Mastercard) via Stripe
- Do NOT require PayPal — adds friction
- Consider Stripe Payment Links as a zero-code interim (even before full Stripe integration)

### AI Summaries: pre-generate vs on-demand

**Current:** On-demand (generated when user first requests).
**Recommendation:** Hybrid —

1. **Pre-generate** for articles > 1 hour old + published status (background cron, off-peak hours)
2. **On-demand** for articles < 1 hour old (breaking news needs fresh summaries)

This eliminates the 3–5 second generation wait for 90% of requests and reduces perceived latency significantly.

**Cost control:** Groq Llama 3.1 8B is ~$0.05–0.08 per million tokens. At 500 articles/day × 4,000 chars each = 2M tokens/day = ~$0.10–0.16/day. Not a concern.

### Audio: cache aggressively

**Use OpenAI TTS API** (`tts-1` model, not `tts-1-hd` in MVP):
- Cost: $15/million characters
- Average summary = ~400–500 chars
- 10,000 premium users × 3 listens/day = 15M chars/day = **$0.225/day = ~$82/year**
- At 1,000 users: $8.20/year. This is noise.

**Implementation:**
1. Generate MP3 on first listen request
2. Upload to S3/MinIO, store URL in `ArticleSummary.audioUrl`
3. Subsequent requests return cached URL immediately
4. Never regenerate unless summary is regenerated

**Voice recommendation:** `alloy` (gender-neutral, clear Macedonian pronunciation) or `onyx` (authoritative for news).

### Premium analytics to track

These are the metrics that tell you if the business is working:

| Metric | Why it matters |
|---|---|
| Trial → paid conversion rate | Target: >25%. Below 15% = pricing or onboarding problem |
| Monthly → Yearly mix | Target: >40% yearly. Low yearly = users don't trust longevity |
| Churn rate (monthly) | Target: <8%/month. Above 15% = product isn't delivering |
| AI summary usage per premium user | If <1/day avg, summaries aren't habit-forming |
| Audio plays per summary | If <20%, audio is a checkbox feature, not a reason to pay |
| Ad CTR by placement | Validates ad revenue per 1,000 free users |
| Free users hitting summary limit | Measures upgrade pressure point |

### Rate limits and abuse prevention

| Abuse vector | Current protection | Recommendation |
|---|---|---|
| AI summary scraping | Redis daily counter per userId/sessionId | Add IP-based rate limit as secondary (max 10/day per IP for anonymous) |
| Audio generation farming | None | Gate audio to authenticated premium users only (never anonymous) |
| Trial abuse (multiple accounts) | None | Require email verification before trial starts |
| Ad impression fraud | sessionId only | Add IP hash deduplication (already in schema — use it) |

---

## Business Risks

### Risk Table

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Market too small to reach 500 paying users | High | Fatal | Validate with 50 users first; keep costs near-zero |
| Digital payment friction (cards not common) | High | High | Stripe + local bank transfer option; Payment Links as fallback |
| Scraping legality challenge | Medium | High | Don't store full article text; link back to source; display excerpts only |
| Churn from browser TTS disappointment | High | Medium | Replace TTS before launch; this is a broken promise |
| Facebook groups replace this for free | High | Medium | Position on curation + AI layer, not content itself |
| Groq API reliability | Low | Medium | Abstract provider; Groq → OpenAI fallback |
| Manual payment doesn't scale | Certain at >100 users | High | Stripe Checkout before launch |
| Users don't perceive enough value to pay | Medium | Fatal | Track trial conversion; if <15%, iterate before scaling |

### Things you may be overbuilding
- The ad system is already excellent — don't add more ad types in MVP
- The briefing feature is not a conversion driver — don't invest in curation logic before you have paying users
- Premium content gating — remove it, it's awkward when source content is free

### Things you may be underestimating
- Email infrastructure: Resend/Postmark setup, templates, trial emails — this is 2–3 days of work, not 2 hours
- Stripe Checkout + webhooks: 3–5 days minimum for a robust implementation
- The gap between "browser plays audio" and "audio feels premium" — it's a product-defining difference

### What to validate before building more
1. **Can you get 20 free users to use it daily for 1 week?** If no → UX problem
2. **Of trial users, do >25% start a subscription conversation?** If no → value prop problem
3. **Does anyone cite audio as a reason to pay?** If no → rethink audio priority
4. **What's your actual monthly ad revenue per 1,000 free users?** This determines if free tier is sustainable

---

## Final Recommended Product Structure

**Positioning:** "Сите вести на едно место — без шум, без реклами, со AI."
(All news in one place — no noise, no ads, with AI.)

Don't position as "AI news assistant." Position as "the clean Macedonian news app." AI is the premium layer, not the headline. The headline is: one place for all Macedonian news.

**Two tiers only: Free and Premium.** No intermediate plan. Binary choice makes conversion cleaner.

**Free:** Great for reading. Functional. Slightly annoying (ads). Clearly inferior to Premium.
**Premium:** Noticeably better from first load. Immediate ad removal. AI that works. Audio that doesn't embarrass you.

---

## Final Recommended Pricing Structure

| Plan | Price | Key selling point |
|---|---|---|
| Free | 0 | All news, 2 AI summaries/day |
| Premium Monthly | 219 MKD/mo | Unlimited AI + audio + no ads |
| Premium Yearly | 1,790 MKD/yr | Same as monthly + 32% off (save 838 MKD) |
| 7-day trial | Free | Full Premium, auto-expires |

---

## Final MVP Feature List

### Ship with launch (non-negotiable)
1. Stripe Checkout for monthly + yearly subscription
2. Stripe webhook: activate/cancel subscription automatically
3. OpenAI TTS audio with S3 caching (replace browser TTS)
4. Transactional email: welcome, trial day-5 warning, subscription confirmed
5. Pre-generation cron for AI summaries (backfill on publish)
6. PWA manifest (installable on mobile)
7. Remove "Premium Article" content gate — replace with "Ad-free experience" framing
8. Yearly price corrected to 1,790 MKD

### Already built (validate and polish)
- News aggregation + browsing
- Ad system (banner, inline, popup, sticky)
- Premium gate (gradient fade)
- AI summaries (Groq, free tier gated)
- Subscription management UI
- Account page
- 7-day trial

---

## Do This Now / Do Later Checklist

### Do This Now (before any marketing or launch)
- [ ] Integrate Stripe Checkout (hosted page, not custom form)
- [ ] Handle Stripe webhooks: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`
- [ ] Replace browser TTS with OpenAI TTS API + S3 audio caching
- [ ] Set up Resend (or Postmark) for transactional email
- [ ] Write 3 email templates: welcome, trial-day-5 warning, payment confirmed
- [ ] Add email verification before trial starts (anti-abuse)
- [ ] Add pre-generation cron for summaries (run hourly on unpublished articles)
- [ ] Change yearly price from 1,490 → 1,790 MKD in DB seed + pricing API
- [ ] Change monthly price from 199 → 219 MKD
- [ ] Add PWA manifest + icons
- [ ] Remove "Premium Article" label from premium gate; use "Ad-free reading" instead

### Do Later (V2, post first 100 paying users)
- [ ] Push notifications (Web Push API) for breaking news
- [ ] Personalized briefing by category preference
- [ ] Weekly email digest for free users (re-engagement)
- [ ] Referral program ("get 1 free month for each referral")
- [ ] Stripe billing portal for self-service plan changes
- [ ] Audio mini-player UI (persistent, Spotify-style)
- [ ] Article read time + summary time estimate ("5 min → 10 sec")
- [ ] Admin analytics dashboard: trial conversion rate, churn, audio plays
- [ ] Frequency capping per IP for ads (use existing AdEvent table)

### Do Much Later (V3)
- [ ] Native iOS app (only after 1,000 paying web subscribers)
- [ ] Meilisearch full-text search
- [ ] ML-based content recommendations
- [ ] Advertiser self-serve portal
- [ ] Annual Stripe billing automation
