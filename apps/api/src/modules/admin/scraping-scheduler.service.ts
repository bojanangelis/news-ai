import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ScrapingService } from './scraping.service';

@Injectable()
export class ScrapingSchedulerService {
  private readonly logger = new Logger(ScrapingSchedulerService.name);
  private ticking = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly scraping: ScrapingService,
  ) {}

  /** Runs every 5 minutes and fires any source whose interval is due. */
  @Cron('*/5 * * * *')
  async tick() {
    if (this.ticking) {
      this.logger.warn('[SCHEDULER] Previous tick still running — skipping');
      return;
    }
    this.ticking = true;
    try {
      await this.runDueSources();
    } finally {
      this.ticking = false;
    }
  }

  private async runDueSources() {
    const now = Date.now();

    const sources = await this.prisma.scrapingSource.findMany({
      where: { isActive: true, status: { not: 'PAUSED' } },
      select: {
        id: true,
        name: true,
        scrapeIntervalMinutes: true,
        lastScrapedAt: true,
      },
    });

    const due = sources.filter((src) => {
      const intervalMs = src.scrapeIntervalMinutes * 60_000;
      const lastRun = src.lastScrapedAt?.getTime() ?? 0;
      return now - lastRun >= intervalMs;
    });

    if (due.length === 0) return;

    this.logger.log(`[SCHEDULER] ${due.length} source(s) due for scraping`);

    for (const src of due) {
      this.logger.log(`[SCHEDULER] Scraping: ${src.name} (${src.id})`);
      try {
        const result = await this.scraping.scrapeNow(src.id);
        this.logger.log(
          `[SCHEDULER] Done: ${src.name} — status=${result.status} saved=${result.articlesSaved}`,
        );
      } catch (err) {
        this.logger.error(
          `[SCHEDULER] Failed: ${src.name}`,
          err instanceof Error ? err.stack : err,
        );
      }
    }
  }
}
