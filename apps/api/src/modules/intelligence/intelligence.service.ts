import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import Groq from 'groq-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const AI_MODEL = 'llama-3.3-70b-versatile';
const INTELLIGENCE_CACHE_TTL = 86_400; // 24h
const CHAT_DAILY_LIMIT = 20;
const ARTICLE_TEXT_LIMIT = 6_000;
const FREE_ANALYSIS_PREVIEW_CHARS = 300;

interface KeyPlayer {
  name: string;
  role: string;
  context: string;
}

interface TimelineEvent {
  date: string;
  event: string;
}

interface BiasCheck {
  reliability: string;
  slant: string;
  missingContext: string[];
}

export interface IntelligencePayload {
  deepAnalysis: string;
  whyItMatters: string;
  keyPlayers: KeyPlayer[];
  timeline: TimelineEvent[];
  biasCheck: BiasCheck;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);
  private groq: Groq | null = null;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private config: ConfigService,
  ) {
    const key = this.config.get<string>('GROQ_API_KEY');
    if (key) this.groq = new Groq({ apiKey: key });
  }

  // ─── Get intelligence (with free/premium gating) ─────────────────────────────

  async getIntelligence(articleId: string, isPremium: boolean) {
    // Try Redis cache first
    const cacheKey = `intelligence:article:${articleId}`;
    const cached = await this.redis.get(cacheKey).catch(() => null);
    if (cached) {
      const data = JSON.parse(cached) as IntelligencePayload;
      return this.buildResponse(data, isPremium);
    }

    // Try database
    let record = await this.prisma.articleIntelligence.findUnique({ where: { articleId } });

    if (!record) {
      if (!this.groq) throw new NotFoundException('AI analysis is not available yet for this article.');
      record = await this.generateAndStore(articleId);
    }

    const data: IntelligencePayload = {
      deepAnalysis: record.deepAnalysis,
      whyItMatters: record.whyItMatters,
      keyPlayers: record.keyPlayers as unknown as KeyPlayer[],
      timeline: record.timeline as unknown as TimelineEvent[],
      biasCheck: record.biasCheck as unknown as BiasCheck,
    };

    // Cache the full payload
    await this.redis.set(cacheKey, JSON.stringify(data), INTELLIGENCE_CACHE_TTL).catch(() => null);

    return this.buildResponse(data, isPremium);
  }

  // ─── Streaming chat ───────────────────────────────────────────────────────────

  async streamChat(
    articleId: string,
    message: string,
    history: ChatMessage[],
    userId: string,
    res: Response,
  ) {
    if (!this.groq) {
      res.write(`data: ${JSON.stringify({ error: 'AI not configured' })}\n\n`);
      res.end();
      return;
    }

    // Rate limit: 20 messages per article per user per day
    const rateLimitKey = this.chatRateLimitKey(articleId, userId);
    const used = parseInt((await this.redis.get(rateLimitKey).catch(() => null)) ?? '0', 10);
    if (used >= CHAT_DAILY_LIMIT) {
      res.write(`data: ${JSON.stringify({ error: 'CHAT_LIMIT_REACHED', limit: CHAT_DAILY_LIMIT })}\n\n`);
      res.end();
      return;
    }

    // Get article content for context
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      include: { sections: { orderBy: { order: 'asc' } } },
    });
    if (!article) {
      res.write(`data: ${JSON.stringify({ error: 'Article not found' })}\n\n`);
      res.end();
      return;
    }

    const articleText = article.sections
      .filter((s) => s.type === 'PARAGRAPH' || s.type === 'HEADING')
      .map((s) => s.content)
      .join('\n\n')
      .slice(0, ARTICLE_TEXT_LIMIT);

    const systemPrompt = `You are an intelligent news assistant helping a reader understand this article from the Macedonian news platform NewsPlus.

ARTICLE TITLE: ${article.title}

ARTICLE CONTENT:
${articleText}

Rules:
- Always respond in Macedonian (mk)
- Be concise, factual, and helpful
- If the reader asks about something not in the article, say so clearly and provide general knowledge if relevant
- Do not make up facts not present in the article
- Keep answers focused and under 200 words unless the question truly requires more`;

    // Increment rate limit counter before streaming
    await this.redis.set(rateLimitKey, String(used + 1), 86_400).catch(() => null);

    try {
      const stream = await this.groq.chat.completions.create({
        model: AI_MODEL,
        max_tokens: 1024,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'user', content: message },
        ],
      });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) res.write(`data: ${JSON.stringify({ token: text })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (err) {
      this.logger.error(`Chat stream error for article ${articleId}: ${err}`);
      res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
    } finally {
      res.end();
    }
  }

  // ─── Generation ───────────────────────────────────────────────────────────────

  async generateAndStore(articleId: string) {
    if (!this.groq) throw new InternalServerErrorException('AI not configured');

    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      include: { sections: { orderBy: { order: 'asc' } } },
    });
    if (!article) throw new NotFoundException('Article not found');

    const articleText = article.sections
      .filter((s) => s.type === 'PARAGRAPH' || s.type === 'HEADING')
      .map((s) => s.content)
      .join('\n\n')
      .slice(0, ARTICLE_TEXT_LIMIT);

    this.logger.log(`Generating intelligence for article ${articleId}`);

    const response = await this.groq.chat.completions.create({
      model: AI_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `You are an expert news analyst for the Macedonian market. Analyze the following article and return ONLY a valid JSON object — no prose, no markdown fences, just the JSON.

Required JSON structure:
{
  "deepAnalysis": "First paragraph (summary of what happened)\\n\\nSecond paragraph (context and background)\\n\\nThird paragraph (implications and what to expect next)",
  "whyItMatters": "2-3 sentences explaining the specific relevance for Macedonia and Macedonian readers",
  "keyPlayers": [
    { "name": "Person or organization name", "role": "Their role in this story", "context": "One sentence of background" }
  ],
  "timeline": [
    { "date": "date or time period", "event": "What happened at this point" }
  ],
  "biasCheck": {
    "reliability": "висока or средна or ниска",
    "slant": "Political or ideological lean, or 'Неутрална' if balanced",
    "missingContext": ["Perspective or angle not covered", "Another missing element"]
  }
}

Guidelines:
- ALL values must be in Macedonian (mk)
- deepAnalysis: exactly 3 paragraphs separated by \\n\\n
- keyPlayers: 2–5 most important people or organizations
- timeline: 3–6 key events in chronological order
- biasCheck.reliability: one of exactly: висока, средна, ниска
- biasCheck.missingContext: 1–3 items (can be empty array if nothing significant is missing)
- Return ONLY the JSON, nothing before or after it

Article to analyze:

TITLE: ${article.title}

CONTENT:
${articleText}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? '{}';

    let parsed: IntelligencePayload;
    try {
      const cleaned = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
      parsed = JSON.parse(cleaned) as IntelligencePayload;
    } catch {
      this.logger.warn(`Failed to parse intelligence JSON for article ${articleId}: ${raw.slice(0, 200)}`);
      throw new InternalServerErrorException('AI returned invalid response. Please try again.');
    }

    const record = await this.prisma.articleIntelligence.upsert({
      where: { articleId },
      create: {
        articleId,
        deepAnalysis: parsed.deepAnalysis ?? '',
        whyItMatters: parsed.whyItMatters ?? '',
        keyPlayers: (parsed.keyPlayers ?? []) as object[],
        timeline: (parsed.timeline ?? []) as object[],
        biasCheck: (parsed.biasCheck ?? {}) as object,
        aiModel: AI_MODEL,
      },
      update: {
        deepAnalysis: parsed.deepAnalysis ?? '',
        whyItMatters: parsed.whyItMatters ?? '',
        keyPlayers: (parsed.keyPlayers ?? []) as object[],
        timeline: (parsed.timeline ?? []) as object[],
        biasCheck: (parsed.biasCheck ?? {}) as object,
        generatedAt: new Date(),
      },
    });

    return record;
  }

  async getChatRemainingToday(articleId: string, userId: string): Promise<number> {
    const key = this.chatRateLimitKey(articleId, userId);
    const used = parseInt((await this.redis.get(key).catch(() => null)) ?? '0', 10);
    return Math.max(0, CHAT_DAILY_LIMIT - used);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private buildResponse(data: IntelligencePayload, isPremium: boolean) {
    if (isPremium) {
      return { data, meta: { isPremium: true } };
    }

    // Free: truncate deepAnalysis, omit premium sections
    const preview = data.deepAnalysis.slice(0, FREE_ANALYSIS_PREVIEW_CHARS);
    return {
      data: {
        deepAnalysis: preview,
        whyItMatters: null,
        keyPlayers: null,
        timeline: null,
        biasCheck: null,
      },
      meta: { isPremium: false },
    };
  }

  private chatRateLimitKey(articleId: string, userId: string): string {
    const date = new Date().toISOString().split('T')[0];
    return `chat:article:${articleId}:user:${userId}:${date}`;
  }
}
