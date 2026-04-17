import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Groq from 'groq-sdk';

@Injectable()
export class BriefingService {
  private readonly logger = new Logger(BriefingService.name);
  private groq: Groq | null = null;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const key = this.config.get<string>('GROQ_API_KEY');
    if (key) this.groq = new Groq({ apiKey: key });
  }

  async getTodayBriefing() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const briefing = await this.prisma.dailyBriefing.findUnique({ where: { date: today } });
    if (!briefing) return null;

    // Fetch the actual articles
    const articles = await this.prisma.article.findMany({
      where: { id: { in: briefing.articleIds } },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        publishedAt: true,
        sourceUrl: true,
        coverImage: { select: { url: true } },
        category: { select: { name: true, slug: true } },
      },
    });

    // Preserve order from briefing.articleIds, flatten coverImage
    const articleMap = new Map(articles.map((a) => [a.id, a]));
    const ordered = briefing.articleIds
      .map((id) => articleMap.get(id))
      .filter(Boolean)
      .map((a) => ({ ...a!, coverImageUrl: a!.coverImage?.url ?? null, coverImage: undefined, isExternal: !!a!.sourceUrl }));

    return { date: briefing.date, generatedAt: briefing.generatedAt, narrative: briefing.narrative, articles: ordered };
  }

  // ─── Cron: runs at 6:00 AM every day ─────────────────────────────────────────

  @Cron('0 6 * * *')
  async generateDailyBriefing() {
    this.logger.log('Generating daily briefing...');
    try {
      await this.buildBriefing();
    } catch (e) {
      this.logger.error(`Daily briefing generation failed: ${e}`);
    }
  }

  async buildBriefing(topN = 10) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get top articles published in last 24h, ordered by views
    const since = new Date(Date.now() - 86_400_000);
    const articles = await this.prisma.article.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: { gte: since },
        sections: { some: { type: 'PARAGRAPH' } },
      },
      orderBy: [{ popularityScore: 'desc' }, { viewCount: 'desc' }],
      take: topN,
      select: { id: true, title: true, excerpt: true, category: { select: { name: true } } },
    });

    if (!articles.length) {
      this.logger.warn('No articles found for daily briefing');
      return null;
    }

    const articleIds = articles.map((a) => a.id);

    // Generate AI editorial narrative summarising the day
    let narrative: string | null = null;
    if (this.groq) {
      try {
        const articleLines = articles
          .map((a) => `- [${a.category.name}] ${a.title}`)
          .join('\n');

        const response = await this.groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          max_tokens: 400,
          messages: [
            {
              role: 'user',
              content: `Напиши кратка редакторска нарација за дневниот брифинг на Macedonia News Plus. Нарацијата треба да ги поврзе денешните главни теми во 2-3 реченици, напишана во флуентен новинарски стил.

Денешни главни наслови:
${articleLines}

Правила:
- Пиши на македонски јазик
- 2-3 реченици, новинарски тон
- Поврзи ги темите без да ги набројуваш насловите директно
- Врати САМО нарацијата, без ознаки`,
            },
          ],
        });

        narrative = response.choices[0]?.message?.content?.trim() ?? null;
      } catch (e) {
        this.logger.warn(`Narrative generation failed: ${e}`);
      }
    }

    const briefing = await this.prisma.dailyBriefing.upsert({
      where: { date: today },
      create: { date: today, articleIds, narrative, generatedAt: new Date() },
      update: { articleIds, narrative, generatedAt: new Date() },
    });

    this.logger.log(`Daily briefing generated with ${articleIds.length} articles`);
    return briefing;
  }
}
