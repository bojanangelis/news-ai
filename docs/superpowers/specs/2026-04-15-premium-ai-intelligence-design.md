# Premium AI Intelligence Panel — Design Spec
**Date:** 2026-04-15
**Status:** Approved
**Scope:** Replace shallow 5-bullet AI summary with a full Article Intelligence Panel for premium users + AI Chat endpoint

---

## Problem

The current premium AI experience is too shallow to justify 199 MKD/month:
- Groq `llama-3.1-8b-instant` with 512 tokens → summaries cut off mid-sentence
- 5 bullet points provide no context, no "why it matters", no depth
- Free users get 2/day; premium gets unlimited — but unlimited shallow is still shallow
- `aiModel` DB field says `claude-haiku-4-5` but code uses Groq (a lie in the DB)
- Daily briefing picks top-10 by raw `viewCount` — not intelligent or personalized
- Bookmarks gated as premium — wrong, basic features shouldn't be locked
- Premium gate shows a blur overlay with no preview of actual premium value

---

## Solution: Article Intelligence Panel

A tabbed AI panel attached to every article for premium users, powered by Anthropic claude-haiku-4-5.

### Tabs

| Tab | Content | Free preview? |
|-----|---------|---------------|
| **Analysis** | 3-paragraph deep summary + key takeaways | First paragraph only |
| **Context** | Why it matters for Macedonia, key players (who is who), story timeline | Teaser text |
| **Chat** | Real-time AI conversation about the article | None |
| **Bias** | Source reliability, missing context, slant detection | None |

---

## Architecture

### Backend

**New endpoint:** `GET /articles/:id/intelligence`
- Auth: optional JWT (determines free vs premium response depth)
- Premium: full response (all 4 sections)
- Free: truncated analysis only (first paragraph)
- Cached in Redis (24h TTL) — generated once, served many times
- Uses Anthropic `claude-haiku-4-5-20251001` with 4096 max tokens
- Single prompt that returns structured JSON with all sections

**New endpoint:** `POST /articles/:id/chat`
- Auth: required JWT + premium check
- Body: `{ message: string, history: { role, content }[] }`
- Streaming response (SSE)
- Article content injected as system context
- Rate limit: 20 messages per article per user per day (Redis)

**Schema changes:**
- New `ArticleIntelligence` model (separate from `ArticleSummary` to avoid breaking existing free-tier flow)
- Fields: `deepAnalysis`, `whyItMatters`, `keyPlayers (Json)`, `timeline (Json)`, `biasCheck (Json)`, `aiModel`, `generatedAt`

**Fix existing issues:**
- Remove 512 token cap on summaries (set to 2048 minimum)
- Fix `aiModel` default in `ArticleSummary` schema (remove the `claude-haiku-4-5` lie)
- Update briefing service: personalize by user's category reading history (last 30 days), not just viewCount

### Frontend

**New component:** `ArticleIntelligencePanel`
- Replaces `ArticleSummary` on article page
- Tabs: Analysis / Context / Chat / Bias
- Free users: see Analysis tab with blur on paragraphs 2-3 + upgrade CTA
- Premium users: all tabs unlocked
- Chat: streaming message UI with typing indicator
- Skeleton loading states per tab

**Article page update:**
- Replace `<ArticleSummary>` with `<ArticleIntelligencePanel>`
- Panel position: between article header and body (same as current summary)

**Premium gate update:**
- Show a "taste" of the intelligence panel to free users (first paragraph visible)
- Replace generic blur with specific value props: "Unlock deep analysis, AI chat, bias detection..."

---

## Data Flow

```
Article page loads
  → Fetch article (existing)
  → Fetch intelligence (new, GET /articles/:id/intelligence)
      → Check cache (Redis 24h)
      → If miss: generate with Anthropic, store in ArticleIntelligence, cache
      → Return full (premium) or truncated (free)
  → Render ArticleIntelligencePanel with data

User opens Chat tab (premium only)
  → POST /articles/:id/chat with message + history
  → API streams Anthropic response with article as context
  → Frontend renders streaming text
```

---

## What is NOT in scope (Phase 2)

- Multi-outlet comparison (needs article clustering)
- Article-to-audio TTS (MinIO + TTS service needed)
- Translate/explain terms (can add as chat prompt shortcuts)
- Smart notifications
- Follow topic with AI updates

---

## Success Criteria

- Premium user opens an article → intelligence panel loads in < 3s (cached) or < 8s (first generation)
- AI chat responds within 2s first token
- Free users can see enough to understand what they're missing
- `aiModel` field accurately reflects the model used
- Zero regression on existing article page functionality
