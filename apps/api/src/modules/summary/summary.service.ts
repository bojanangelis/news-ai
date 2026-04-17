import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import Groq from 'groq-sdk';

const FREE_DAILY_LIMIT = 2;

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);
  private groq: Groq | null = null;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private config: ConfigService,
  ) {
    const groqKey = this.config.get<string>('GROQ_API_KEY');
    if (groqKey) this.groq = new Groq({ apiKey: groqKey });
  }

  // ─── Public: get summary (with free/premium gating) ──────────────────────────

  async getSummary(articleId: string, userId: string | null, isPremium: boolean, sessionId?: string) {
    // Free tier: check daily limit via Redis
    if (!isPremium) {
      const remaining = await this.getFreeTierRemaining(userId, sessionId);
      if (remaining <= 0) {
        throw new ForbiddenException({
          code: 'SUMMARY_LIMIT_REACHED',
          message: 'You have used your 2 free summaries for today.',
          upgradeUrl: '/premium',
        });
      }
    }

    // Fetch or generate summary
    let summary = await this.prisma.articleSummary.findUnique({ where: { articleId } });

    if (!summary) {
      if (!this.groq) {
        throw new NotFoundException('AI summary not available yet for this article.');
      }
      summary = await this.generateAndStore(articleId);
    }

    // Decrement free tier counter after successful fetch
    if (!isPremium) {
      await this.decrementFreeTier(userId, sessionId);
    }

    return summary;
  }

  async getFreeTierRemaining(userId: string | null, sessionId?: string): Promise<number> {
    const key = this.freeTierKey(userId, sessionId);
    if (!key) return FREE_DAILY_LIMIT;
    const used = await this.redis.get(key).catch(() => null);
    return FREE_DAILY_LIMIT - Math.min(parseInt(used ?? '0', 10), FREE_DAILY_LIMIT);
  }

  // ─── Generation ───────────────────────────────────────────────────────────────

  async generateAndStore(articleId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      include: { sections: { orderBy: { order: 'asc' } } },
    });
    if (!article) throw new NotFoundException('Article not found');

    const articleText = article.sections
      .filter((s) => s.type === 'PARAGRAPH' || s.type === 'HEADING')
      .map((s) => s.content)
      .join('\n\n')
      .slice(0, 4000);

    if (!this.groq) throw new NotFoundException('AI not configured');

    this.logger.log(`Generating summary for article ${articleId}`);

    const response = await this.groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Ти си новинарски асистент. Прочитај ја следната статија и врати JSON ТОЧНО во овој формат, без никаков дополнителен текст:

{
  "bullets": ["клучна точка 1", "клучна точка 2", "клучна точка 3", "клучна точка 4", "клучна точка 5"],
  "sources": ["извор 1", "извор 2"]
}

Правила:
- Точно 5 клучни точки на македонски јазик
- Секоја точка максимум 20 збора
- Само факти, без мислења
- sources: имиња на медиуми споменати во текстот (ако нема, врати [])
- Врати САМО JSON, без markdown, без објаснување

Статија:
${article.title}

${articleText}`,
        },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? '{}';

    let bullets: string[] = [];
    let sources: string[] = [];

    try {
      const cleaned = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
      const parsed = JSON.parse(cleaned) as { bullets?: string[]; sources?: string[] };
      bullets = Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 5) : [];
      sources = Array.isArray(parsed.sources) ? parsed.sources.slice(0, 10) : [];
    } catch {
      this.logger.warn(`Failed to parse AI response for article ${articleId}: ${raw}`);
      bullets = ['Резимето не е достапно.'];
    }

    const summary = await this.prisma.articleSummary.upsert({
      where: { articleId },
      create: { articleId, bullets, sources, aiModel: 'llama-3.1-8b-instant' },
      update: { bullets, sources, aiModel: 'llama-3.1-8b-instant', generatedAt: new Date() },
    });

    return summary;
  }

  // ─── Admin: batch generate summaries ─────────────────────────────────────────

  async batchGenerate(limit = 20) {
    const articles = await this.prisma.article.findMany({
      where: {
        status: 'PUBLISHED',
        aiSummary: null,
        sections: { some: { type: 'PARAGRAPH' } },
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: { id: true },
    });

    let generated = 0;
    for (const article of articles) {
      try {
        await this.generateAndStore(article.id);
        generated++;
      } catch (e) {
        this.logger.warn(`Batch gen failed for ${article.id}: ${e}`);
      }
    }
    return { generated, total: articles.length };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private freeTierKey(userId: string | null, sessionId?: string): string | null {
    const date = new Date().toISOString().split('T')[0];
    if (userId) return `summary:free:user:${userId}:${date}`;
    if (sessionId) return `summary:free:session:${sessionId}:${date}`;
    return null;
  }

  private async decrementFreeTier(userId: string | null, sessionId?: string) {
    const key = this.freeTierKey(userId, sessionId);
    if (!key) return;
    const current = parseInt((await this.redis.get(key).catch(() => null)) ?? '0', 10);
    await this.redis.set(key, String(current + 1), 86400).catch(() => null);
  }
}
