import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class BriefingService {
  private readonly logger = new Logger(BriefingService.name);
  private anthropic: Anthropic | null = null;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const key = this.config.get<string>('ANTHROPIC_API_KEY');
    if (key) this.anthropic = new Anthropic({ apiKey: key });
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
        coverImage: { select: { url: true } },
        category: { select: { name: true, slug: true } },
      },
    });

    // Preserve order from briefing.articleIds, flatten coverImage
    const articleMap = new Map(articles.map((a) => [a.id, a]));
    const ordered = briefing.articleIds
      .map((id) => articleMap.get(id))
      .filter(Boolean)
      .map((a) => ({ ...a!, coverImageUrl: a!.coverImage?.url ?? null, coverImage: undefined }));

    return { date: briefing.date, generatedAt: briefing.generatedAt, articles: ordered };
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
      orderBy: { viewCount: 'desc' },
      take: topN,
      select: { id: true, title: true },
    });

    if (!articles.length) {
      this.logger.warn('No articles found for daily briefing');
      return null;
    }

    const articleIds = articles.map((a) => a.id);

    const briefing = await this.prisma.dailyBriefing.upsert({
      where: { date: today },
      create: { date: today, articleIds, generatedAt: new Date() },
      update: { articleIds, generatedAt: new Date() },
    });

    this.logger.log(`Daily briefing generated with ${articleIds.length} articles`);
    return briefing;
  }
}
