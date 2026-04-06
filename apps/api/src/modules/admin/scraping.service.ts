import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StoryManagerService } from '../stories/story-manager.service';

interface RssItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  imageUrl?: string;
}

interface RunStructuredData {
  feedUrl: string;
  pagesVisited: number;
  itemsPerPage: number[];
  savedTitles: string[];
  skippedUrls: string[];
  failedTitles: string[];
  categoryUsed: { id: string; name: string } | null;
  authorUsed: { id: string; name: string } | null;
  imageExtractionRate: number;
  warnings: string[];
}

// Realistic browser UA so sites don't block the scraper
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Macedonian keyword → category slug routing table
// IMPORTANT: slugs must match the Latin transliterated slugs stored in the DB
const CATEGORY_KEYWORD_RULES: [string[], string][] = [
  [['фудбал', 'кошарка', 'ракомет', 'натпревар', 'голман', 'атлет', 'олимпи', 'шампион', 'мундијал', 'голови', 'лигата'], 'sport'],
  [['русија', 'украина', 'нато', 'израел', 'кина', 'трамп', 'путин', 'меѓународн', 'дипломат', 'бегалц', 'странств'], 'svet'],
  [['влада', 'опозиц', 'парламент', 'министер', 'пратеник', 'избор', 'коалиц', 'собрание', 'претседател', 'политич'], 'politika'],
  [['економ', 'берза', 'инфлац', 'буџет', 'ддв', 'извоз', 'увоз', 'царина', 'финанс', 'евро', 'денар', 'бдп'], 'ekonomija'],
  [['бизнис', 'компани', 'банка', 'инвестиц', 'акционер', 'профит', 'приход', 'претпријат', 'маркет'], 'biznis'],
  [['технолог', 'апликац', 'интернет', 'дигитал', 'стартап', 'софтвер', 'хардвер', 'сајбер', 'вештачка'], 'tehnologija'],
  [['болница', 'лекар', 'вакцина', 'ковид', 'болест', 'медицин', 'пациент', 'здравствен', 'вирус', 'терапи'], 'zdravje'],
  [['наука', 'истражувањ', 'откритие', 'вселена', 'биолог', 'физика', 'климатск', 'еколог', 'животна средина'], 'nauka'],
  [['прилеп', 'битола', 'куманово', 'тетово', 'охрид', 'штип', 'велес', 'струга', 'гостивар', 'кичево', 'скопје'], 'skopje'],
  [['филм', 'музика', 'концерт', 'актер', 'певач', 'шоу', 'хумор', 'риалити', 'сериј', 'забав'], 'zabava'],
  [['животен стил', 'исхран', 'рецепт', 'убавин', 'мода', 'фитнес', 'диет', 'свадб', 'врск', 'хороскоп'], 'zhivoten-stil'],
  [['театар', 'изложба', 'книга', 'уметност', 'наследство', 'фестивал', 'литература', 'сликар', 'скулптур'], 'kultura'],
  [['балкан', 'србија', 'хрватска', 'косово', 'бугарија', 'грција', 'словенија', 'турција', 'регионал'], 'region'],
];

@Injectable()
export class ScrapingService {
  private readonly logger = new Logger(ScrapingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storyManager: StoryManagerService,
  ) {}

  // ─── Public API ───────────────────────────────────────────────────────────────

  async scrapeNow(sourceId: string) {
    const source = await this.prisma.scrapingSource.findUnique({
      where: { id: sourceId },
      include: { defaultCategory: true },
    });
    if (!source) throw new NotFoundException('Scraping source not found');

    const start = Date.now();
    const warnings: string[] = [];
    const structuredData: RunStructuredData = {
      feedUrl: source.url,
      pagesVisited: 0,
      itemsPerPage: [],
      savedTitles: [],
      skippedUrls: [],
      failedTitles: [],
      categoryUsed: null,
      authorUsed: null,
      imageExtractionRate: 0,
      warnings: [],
    };

    let logStatus: 'SUCCESS' | 'PARTIAL' | 'ERROR' = 'ERROR';
    let articlesFound = 0;
    let articlesSaved = 0;
    let articlesSkipped = 0;
    let articlesFailed = 0;
    let pagesVisited = 0;
    let usedFeedUrl = source.url;
    let errorMessage: string | undefined;

    this.logger.log({
      event: 'scrape_start',
      sourceId,
      sourceName: source.name,
      url: source.url,
    });

    try {
      // ── Fetch & detect content type ──────────────────────────────────────────
      const firstBody = await this.fetchRaw(source.url, 15_000);
      const isHtml = this.looksLikeHtml(firstBody);

      if (isHtml) {
        this.logger.log({ event: 'html_detected', sourceId, url: source.url });
        const discovered = await this.discoverFeedUrlFromHtml(firstBody, source.url);
        if (!discovered) {
          const msg =
            `URL returned an HTML page — no RSS/Atom feed found.\n` +
            `Fix: find the direct feed URL (e.g. /feed or /rss) and update the source in admin.`;
          this.logger.warn({ event: 'feed_discovery_failed', sourceId, sourceName: source.name });
          warnings.push('NO_FEED_FOUND');
          await this.finalise(sourceId, 'PARTIAL', 0, 0, 0, 0, 1, source.url, Date.now() - start, msg, undefined, warnings, structuredData);
          return { status: 'PARTIAL', articlesFound: 0, articlesSaved: 0, durationMs: Date.now() - start, details: msg };
        }
        usedFeedUrl = discovered;
        structuredData.feedUrl = discovered;
        this.logger.log({ event: 'feed_discovered', sourceId, feedUrl: discovered });
      }

      // ── Paginated RSS fetch ──────────────────────────────────────────────────
      const maxPages = source.maxPagesPerRun ?? 1;
      const maxArticles = source.maxArticlesPerRun ?? 50;
      const allItems: RssItem[] = [];
      const pageLog: string[] = [];
      const seenUrls = new Set<string>();

      let currentUrl: string | null = usedFeedUrl;
      let page = 0;

      while (currentUrl && page < maxPages) {
        if (seenUrls.has(currentUrl)) break;
        seenUrls.add(currentUrl);
        page++;

        let body: string;
        try {
          body = page === 1 && !isHtml
            ? firstBody
            : await this.fetchRaw(currentUrl, 12_000);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          const isRateLimit = errMsg.includes('HTTP 403') || errMsg.includes('HTTP 429') || errMsg.includes('HTTP 503');
          pageLog.push(`Page ${page}: FAILED${isRateLimit ? ' [RATE-LIMITED]' : ''} — ${errMsg}`);
          this.logger.warn({ event: 'page_fetch_failed', sourceId, page, url: currentUrl, error: errMsg, rateLimited: isRateLimit });
          if (isRateLimit) warnings.push(`RATE_LIMITED: ${errMsg}`);
          break;
        }

        // Detect Cloudflare / bot protection on the response body
        if (this.looksLikeChallengePage(body)) {
          pageLog.push(`Page ${page}: BLOCKED — Cloudflare/bot-protection challenge page detected`);
          warnings.push(`BOT_BLOCKED: Anti-bot page returned for ${currentUrl}`);
          this.logger.warn({ event: 'bot_blocked', sourceId, page, url: currentUrl });
          break;
        }

        const items = this.parseRss(body).filter(i => i.title && i.link);
        structuredData.itemsPerPage.push(items.length);
        pageLog.push(`Page ${page} (${currentUrl}): ${items.length} items`);
        allItems.push(...items);

        this.logger.log({ event: 'page_fetched', sourceId, page, url: currentUrl, itemCount: items.length });

        if (page >= maxPages) break;

        // 1. Follow Atom/RSS <link rel="next">
        const atomNext = this.extractNextLink(body);
        if (atomNext && !seenUrls.has(atomNext)) {
          currentUrl = atomNext;
          continue;
        }

        // 2. WordPress ?paged=N fallback (most Macedonian sites are WordPress)
        const wpNext = this.buildWordPressPagedUrl(currentUrl, page + 1);
        if (wpNext) {
          const hasItems = await this.probeFeedHasItems(wpNext);
          if (hasItems) {
            currentUrl = wpNext;
            continue;
          }
        }

        // No more pages
        currentUrl = null;
      }

      pagesVisited = page;
      structuredData.pagesVisited = pagesVisited;
      articlesFound = allItems.length;

      if (articlesFound === 0) {
        const volWarnings = await this.checkVolumeAnomaly(sourceId, 0);
        warnings.push(...volWarnings);
        structuredData.warnings = warnings;
        const details = [
          usedFeedUrl !== source.url ? `Feed URL (auto-discovered): ${usedFeedUrl}` : '',
          `Feed parsed but 0 valid items found across ${pagesVisited} page(s).`,
          pageLog.join('\n'),
          volWarnings.length ? `\n⚠️ ${volWarnings.join('\n⚠️ ')}` : '',
        ].filter(Boolean).join('\n');
        this.logger.warn({ event: 'zero_items', sourceId, sourceName: source.name, pagesVisited, warnings: volWarnings });
        await this.finalise(sourceId, 'PARTIAL', 0, 0, 0, 0, pagesVisited, usedFeedUrl, Date.now() - start, details, undefined, warnings, structuredData);
        return { status: 'PARTIAL', articlesFound: 0, articlesSaved: 0, durationMs: Date.now() - start, details };
      }

      // ── Resolve author + all categories ─────────────────────────────────────
      // Ensure the system "Редакција" user+author exist (created on-demand if deleted)
      const systemUser = await this.prisma.user.upsert({
        where: { email: 'redakcija@system.internal' },
        update: {},
        create: {
          email: 'redakcija@system.internal',
          name: 'Редакција',
          passwordHash: '',
          role: 'WRITER',
          isActive: false,
        },
      });
      const author = await this.prisma.author.upsert({
        where: { slug: 'redakcija' },
        update: {},
        create: {
          userId: systemUser.id,
          slug: 'redakcija',
          displayName: 'Редакција',
          bio: 'Редакциски тим на NewsPlus.',
          isVerified: true,
        },
      });

      const allCategories = await this.prisma.category.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      });
      if (!allCategories.length) throw new Error('No active categories — run db:seed first.');

      structuredData.authorUsed = { id: author.id, name: author.displayName };

      // ── Save articles ────────────────────────────────────────────────────────
      const capped = allItems.slice(0, maxArticles);
      let imagesFound = 0;

      for (const item of capped) {
        const slug = this.toSlug(item.title);
        const excerpt = this.stripHtml(item.description ?? '').slice(0, 300) || item.title;

        // Deduplication check
        const existing = await this.prisma.article.findFirst({
          where: { OR: [{ slug }, { sourceUrl: item.link }] },
          select: { id: true, readTimeMinutes: true },
        });
        if (existing) {
          // If read time was never properly estimated, fix it now
          if (existing.readTimeMinutes === 0 && item.link) {
            const rt = await this.estimateReadTime(item.link, excerpt.split(' ').length);
            await this.prisma.article.update({ where: { id: existing.id }, data: { readTimeMinutes: rt } });
          }
          structuredData.skippedUrls.push(item.link);
          articlesSkipped++;
          continue;
        }

        // If the feed didn't supply an image, try fetching og:image from the article page
        if (!item.imageUrl) {
          item.imageUrl = await this.fetchOgImage(item.link);
        }

        const category = this.routeCategory(item, source as any, allCategories);
        if (!structuredData.categoryUsed) {
          structuredData.categoryUsed = { id: category.id, name: category.name };
        }
        if (item.imageUrl) imagesFound++;

        try {
          const readTimeMinutes = item.link
            ? await this.estimateReadTime(item.link, excerpt.split(' ').length)
            : Math.max(2, Math.ceil((excerpt.split(' ').length * 8) / 200));

          const saved = await this.prisma.article.create({
            data: {
              title: item.title,
              slug,
              excerpt,
              sourceUrl: item.link,
              ogImageUrl: item.imageUrl ?? null,
              status: 'PUBLISHED',
              publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
              authorId: author.id,
              categoryId: category.id,
              readTimeMinutes,
              sections: {
                create: [
                  { type: 'PARAGRAPH', order: 0, content: excerpt },
                  ...(item.link
                    ? [{ type: 'EMBED' as const, order: 1, url: item.link, caption: `Оригинален напис: ${item.link}` }]
                    : []),
                ],
              },
            },
          });
          structuredData.savedTitles.push(item.title);
          articlesSaved++;
          // Assign to a story cluster — fire-and-forget, never blocks scraping
          this.storyManager.assignArticleToStory(saved.id).catch((err) => {
            this.logger.warn({
              event: 'story_assignment_failed',
              articleId: saved.id,
              error: err instanceof Error ? err.message : String(err),
            });
          });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          structuredData.failedTitles.push(item.title);
          articlesFailed++;
          this.logger.error({ event: 'article_save_failed', sourceId, title: item.title, error: errMsg });
        }
      }

      // Image extraction rate
      structuredData.imageExtractionRate = capped.length > 0
        ? Math.round((imagesFound / capped.length) * 100)
        : 0;

      // ── Volume anomaly check ─────────────────────────────────────────────────
      const volWarnings = await this.checkVolumeAnomaly(sourceId, articlesFound);
      warnings.push(...volWarnings);
      structuredData.warnings = warnings;

      logStatus = articlesSaved > 0 ? 'SUCCESS' : 'PARTIAL';
      const healthScore = this.computeHealthScore(logStatus, articlesFound, source.consecutiveErrors ?? 0);

      const details = [
        usedFeedUrl !== source.url ? `Feed URL (auto-discovered): ${usedFeedUrl}` : '',
        `Pages visited: ${pagesVisited} / ${maxPages}`,
        pageLog.join('\n'),
        '',
        `Found: ${articlesFound} · Saved: ${articlesSaved} · Skipped (dup): ${articlesSkipped} · Failed: ${articlesFailed}`,
        `Category: ${structuredData.categoryUsed?.name ?? 'none'} · Author: ${author.displayName}`,
        `Images in feed: ${structuredData.imageExtractionRate}%`,
        warnings.length ? `\n⚠️ WARNINGS:\n${warnings.map(w => `  • ${w}`).join('\n')}` : '',
        structuredData.savedTitles.length
          ? `\nSaved:\n${structuredData.savedTitles.slice(0, 20).map((t, i) => `${i + 1}. ${t}`).join('\n')}`
          : '',
        structuredData.skippedUrls.length
          ? `\nSkipped as duplicates: ${structuredData.skippedUrls.length} items`
          : '',
        structuredData.failedTitles.length
          ? `\nFailed to save:\n${structuredData.failedTitles.map(t => `  ✗ ${t}`).join('\n')}`
          : '',
      ].filter(Boolean).join('\n');

      await this.finalise(
        sourceId, logStatus,
        articlesFound, articlesSaved, articlesSkipped, articlesFailed,
        pagesVisited, usedFeedUrl,
        Date.now() - start,
        details, undefined, warnings, structuredData, healthScore,
      );

      this.logger.log({
        event: 'scrape_complete',
        sourceId,
        sourceName: source.name,
        status: logStatus,
        articlesFound,
        articlesSaved,
        articlesSkipped,
        articlesFailed,
        pagesVisited,
        durationMs: Date.now() - start,
        healthScore,
        warnings,
      });

      return { status: logStatus, articlesFound, articlesSaved, articlesSkipped, durationMs: Date.now() - start, details };

    } catch (err: unknown) {
      const durationMs = Date.now() - start;
      errorMessage = err instanceof Error ? err.message : String(err);
      structuredData.warnings = [`EXCEPTION: ${errorMessage}`];
      this.logger.error({
        event: 'scrape_error',
        sourceId,
        sourceName: source.name,
        error: errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
      });
      await this.finalise(
        sourceId, 'ERROR',
        0, 0, 0, 0,
        pagesVisited, usedFeedUrl,
        durationMs,
        `Scrape failed: ${errorMessage}`,
        errorMessage,
        [`EXCEPTION: ${errorMessage}`],
        structuredData,
        0,
      );
      return { status: 'ERROR', articlesFound: 0, articlesSaved: 0, articlesSkipped: 0, durationMs, details: errorMessage, errorMessage };
    }
  }

  async getLogs(sourceId: string, limit = 20) {
    return this.prisma.scrapingLog.findMany({
      where: { sourceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Re-run keyword routing against all existing PUBLISHED articles.
   * Safe to run multiple times — skips articles already in the correct category.
   */
  async recategorizeAll(): Promise<{ updated: number; unmatched: number; breakdown: Record<string, number> }> {
    const categories = await this.prisma.category.findMany({ where: { isActive: true } });
    const slugMap = new Map(categories.map(c => [c.slug, c.id]));

    const PAGE = 200;
    let skip = 0;
    let updated = 0;
    let unmatched = 0;
    const breakdown: Record<string, number> = {};

    this.logger.log({ event: 'recategorize_start', totalCategories: categories.length });

    while (true) {
      const articles = await this.prisma.article.findMany({
        where: { status: 'PUBLISHED' },
        select: { id: true, title: true, excerpt: true, categoryId: true },
        orderBy: { createdAt: 'asc' },
        skip,
        take: PAGE,
      });
      if (articles.length === 0) break;
      skip += PAGE;

      for (const article of articles) {
        const matchedId = this.matchCategoryId(article.title, article.excerpt, slugMap);
        if (!matchedId) { unmatched++; continue; }
        if (article.categoryId === matchedId) continue;

        await this.prisma.article.update({ where: { id: article.id }, data: { categoryId: matchedId } });
        const catName = categories.find(c => c.id === matchedId)?.name ?? matchedId;
        breakdown[catName] = (breakdown[catName] ?? 0) + 1;
        updated++;
      }
    }

    this.logger.log({ event: 'recategorize_complete', updated, unmatched });
    return { updated, unmatched, breakdown };
  }

  private matchCategoryId(title: string, excerpt: string, slugMap: Map<string, string>): string | null {
    const text = `${title} ${excerpt}`.toLowerCase();
    for (const [keywords, slug] of CATEGORY_KEYWORD_RULES) {
      if (keywords.some(kw => text.includes(kw))) {
        const id = slugMap.get(slug);
        if (id) return id;
      }
    }
    return null;
  }

  async getHealth() {
    const sources = await this.prisma.scrapingSource.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { defaultCategory: { select: { name: true } } },
    });

    const results = await Promise.all(
      sources.map(async (src) => {
        const recentLogs = await this.prisma.scrapingLog.findMany({
          where: { sourceId: src.id },
          orderBy: { createdAt: 'desc' },
          take: 7,
          select: { articlesFound: true, articlesSaved: true, status: true, createdAt: true },
        });

        const avgFound = recentLogs.length
          ? recentLogs.reduce((s, l) => s + l.articlesFound, 0) / recentLogs.length
          : 0;

        const lastLog = recentLogs[0];
        const isOverdue = src.scrapeIntervalMinutes > 0 && src.lastScrapedAt
          ? Date.now() - src.lastScrapedAt.getTime() > src.scrapeIntervalMinutes * 60_000 * 2
          : false;

        const warnings: string[] = [];
        if (src.consecutiveErrors > 3) warnings.push(`${src.consecutiveErrors} consecutive errors`);
        if (isOverdue) warnings.push('Overdue — has not scraped in 2× its interval');
        if (lastLog?.articlesFound === 0 && avgFound > 2) warnings.push('Last run returned 0 items (below average)');

        return {
          sourceId: src.id,
          name: src.name,
          url: src.url,
          status: src.status,
          healthScore: src.healthScore,
          lastScrapedAt: src.lastScrapedAt,
          lastSuccessAt: src.lastSuccessAt,
          consecutiveErrors: src.consecutiveErrors,
          totalArticlesSaved: src.totalArticlesSaved,
          defaultCategory: src.defaultCategory?.name ?? null,
          avgArticlesLast7Runs: Math.round(avgFound),
          lastRunArticlesFound: lastLog?.articlesFound ?? 0,
          lastRunArticlesSaved: lastLog?.articlesSaved ?? 0,
          isOverdue,
          warnings,
        };
      }),
    );

    return results;
  }

  // ─── Category routing ─────────────────────────────────────────────────────────

  private routeCategory(
    item: RssItem,
    source: { defaultCategoryId?: string | null; defaultCategory?: { id: string; name: string; slug: string; isActive: boolean } | null },
    allCategories: { id: string; name: string; slug: string; isActive: boolean }[],
  ) {
    // 1. Source has an explicit default category → always use it
    if (source.defaultCategoryId && source.defaultCategory?.isActive) {
      return source.defaultCategory;
    }

    // 2. Keyword-based routing against Macedonian text
    const text = `${item.title} ${item.description ?? ''}`.toLowerCase();
    for (const [keywords, slug] of CATEGORY_KEYWORD_RULES) {
      if (keywords.some(kw => text.includes(kw))) {
        const match = allCategories.find(c => c.slug === slug);
        if (match) return match;
      }
    }

    // 3. Fallback: first active category by order
    return allCategories[0]!;
  }

  // ─── Volume anomaly detection ─────────────────────────────────────────────────

  private async checkVolumeAnomaly(sourceId: string, currentCount: number): Promise<string[]> {
    const warnings: string[] = [];
    const history = await this.prisma.scrapingLog.findMany({
      where: { sourceId, status: { in: ['SUCCESS', 'PARTIAL'] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { articlesFound: true },
    });

    if (history.length < 5) return warnings;

    const avg = history.reduce((s, r) => s + r.articlesFound, 0) / history.length;

    if (currentCount === 0 && avg > 2) {
      warnings.push(`ZERO_ITEMS: normally ~${avg.toFixed(0)} items, got 0 — possible site change, block, or feed error`);
    } else if (currentCount > 0 && currentCount < avg * 0.3 && avg > 5) {
      warnings.push(`VOLUME_DROP: got ${currentCount} items, expected ~${avg.toFixed(0)} — possible rate-limit, selector change, or feed truncation`);
    }

    return warnings;
  }

  // ─── Health score computation ─────────────────────────────────────────────────

  private computeHealthScore(
    status: 'SUCCESS' | 'PARTIAL' | 'ERROR',
    articlesFound: number,
    consecutiveErrors: number,
  ): number {
    if (status === 'ERROR') return Math.max(0, 50 - consecutiveErrors * 10);
    if (status === 'PARTIAL' && articlesFound === 0) return 55;
    return Math.min(100, 75 + Math.min(articlesFound, 25));
  }

  // ─── Finalise: update source + write log ──────────────────────────────────────

  private async finalise(
    sourceId: string,
    status: 'SUCCESS' | 'PARTIAL' | 'ERROR',
    articlesFound: number,
    articlesSaved: number,
    articlesSkipped: number,
    articlesFailed: number,
    pagesVisited: number,
    feedUrl: string,
    durationMs: number,
    details: string,
    errorMessage?: string,
    warnings: string[] = [],
    structuredData?: RunStructuredData,
    healthScore?: number,
  ) {
    const isError = status === 'ERROR';
    const isSuccess = status === 'SUCCESS';

    await this.prisma.scrapingSource.update({
      where: { id: sourceId },
      data: {
        status: isError ? 'ERROR' : 'ACTIVE',
        lastScrapedAt: new Date(),
        ...(isSuccess ? { lastSuccessAt: new Date() } : {}),
        consecutiveErrors: isError
          ? { increment: 1 }
          : 0,
        errorMessage: errorMessage ?? null,
        ...(articlesSaved > 0 ? { totalArticlesSaved: { increment: articlesSaved } } : {}),
        ...(healthScore !== undefined ? { healthScore } : {}),
      },
    });

    await this.prisma.scrapingLog.create({
      data: {
        sourceId,
        status,
        articlesFound,
        articlesSaved,
        articlesSkipped,
        articlesFailed,
        pagesVisited,
        feedUrl,
        durationMs,
        details: details.slice(0, 10_000),
        errorMessage: errorMessage ?? null,
        structuredData: structuredData
          ? {
              ...structuredData,
              savedTitles: structuredData.savedTitles.slice(0, 20),
              skippedUrls: structuredData.skippedUrls.slice(0, 10),
            }
          : undefined,
      },
    });
  }

  // ─── Read-time estimator ─────────────────────────────────────────────────────

  private async estimateReadTime(articleUrl: string, fallbackWords: number): Promise<number> {
    try {
      const html = await this.fetchRaw(articleUrl, 5_000);
      // Strip all HTML tags, scripts, styles
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z#0-9]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const words = text.split(' ').filter((w) => w.length > 1).length;
      // Subtract boilerplate (nav, footer etc.) — keep a conservative 60% of words
      const articleWords = Math.floor(words * 0.6);
      return Math.max(1, Math.round(articleWords / 200));
    } catch {
      return Math.max(2, Math.ceil((fallbackWords * 8) / 200));
    }
  }

  // ─── HTTP helper ──────────────────────────────────────────────────────────────

  private async fetchRaw(url: string, timeoutMs = 12_000): Promise<string> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, */*;q=0.8',
        'Accept-Language': 'mk,en;q=0.5',
        'Cache-Control': 'no-cache',
      },
    }).finally(() => clearTimeout(t));

    if (!res.ok) {
      const hint = res.status === 429 ? ' [rate-limited]'
        : res.status === 403 ? ' [forbidden — possible bot block]'
        : res.status === 503 ? ' [service unavailable]'
        : '';
      throw new Error(`HTTP ${res.status} ${res.statusText}${hint} — ${url}`);
    }
    return res.text();
  }

  // ─── HTML detection ───────────────────────────────────────────────────────────

  private looksLikeHtml(body: string): boolean {
    const start = body.trimStart().slice(0, 300).toLowerCase();
    return start.startsWith('<!doctype html') || start.startsWith('<html') || /<html[\s>]/i.test(start);
  }

  // ─── Feed discovery from HTML page ───────────────────────────────────────────

  private async discoverFeedUrlFromHtml(html: string, pageUrl: string): Promise<string | null> {
    const base = pageUrl.replace(/\/$/, '');
    const candidates: string[] = [
      this.discoverFeedUrl(html, pageUrl),
      ...this.extractFeedLinksFromHtml(html, pageUrl),
      `${base}/feed/`,
      `${base}/feed`,
      `${base}/rss/`,
      `${base}/rss`,
      `${base}/?feed=rss2`,
      `${base}/atom.xml`,
      `${base}/feed.xml`,
      `${base}/rss.xml`,
      `${base}/feeds/posts/default`,
      `${base}/index.xml`,
      `${base}/news.rss`,
      `${base}/news/rss`,
      `${base}/news/feed`,
    ].filter(Boolean) as string[];

    const seen = new Set<string>();
    for (const candidate of candidates) {
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      try {
        const body = await this.fetchRaw(candidate, 10_000);
        if (/<(rss|feed|channel)\b/i.test(body.slice(0, 1000))) return candidate;
      } catch {
        continue;
      }
    }
    return null;
  }

  // ─── Follow RSS/Atom pagination ───────────────────────────────────────────────

  private extractNextLink(xml: string): string | null {
    const m =
      /<atom:link[^>]+rel=["']next["'][^>]+href=["']([^"']+)["']/i.exec(xml) ??
      /<link[^>]+rel=["']next["'][^>]+href=["']([^"']+)["']/i.exec(xml);
    return m?.[1]?.trim() ?? null;
  }

  /** Build a WordPress ?paged=N URL from the current feed URL. */
  private buildWordPressPagedUrl(feedUrl: string, pageNum: number): string | null {
    try {
      const url = new URL(feedUrl);
      // Already has paged param — increment it
      if (url.searchParams.has('paged')) {
        url.searchParams.set('paged', String(pageNum));
        return url.toString();
      }
      // Only attempt for URLs that look like RSS/feed endpoints
      const path = url.pathname.toLowerCase();
      if (!path.includes('feed') && !path.includes('rss') && !url.search.includes('feed')) {
        return null;
      }
      url.searchParams.set('paged', String(pageNum));
      return url.toString();
    } catch {
      return null;
    }
  }

  /** Lightweight probe: fetch URL and check if it contains any RSS items. */
  private async probeFeedHasItems(url: string): Promise<boolean> {
    try {
      const body = await this.fetchRaw(url, 8_000);
      return /<(item|entry)\b/i.test(body);
    } catch {
      return false;
    }
  }

  /** Detect Cloudflare challenge / bot-protection pages. */
  private looksLikeChallengePage(body: string): boolean {
    const lower = body.slice(0, 2000).toLowerCase();
    return (
      lower.includes('cf-browser-verification') ||
      lower.includes('challenge-form') ||
      lower.includes('cloudflare') && lower.includes('ray id') ||
      lower.includes('access denied') ||
      lower.includes('enable javascript and cookies')
    );
  }

  // ─── RSS/Atom parser ──────────────────────────────────────────────────────────

  private parseRss(xml: string): RssItem[] {
    const items: RssItem[] = [];
    const itemRe = /<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi;
    let match: RegExpExecArray | null;

    while ((match = itemRe.exec(xml)) !== null) {
      const block = match[1] ?? '';
      const title = this.extractTag(block, 'title');
      const link =
        this.extractTag(block, 'link') ??
        this.extractAttr(block, 'link', 'href') ?? '';
      if (!title) continue;

      items.push({
        title,
        link,
        pubDate:
          this.extractTag(block, 'pubDate') ??
          this.extractTag(block, 'published') ??
          this.extractTag(block, 'updated'),
        description:
          this.extractTag(block, 'description') ??
          this.extractTag(block, 'summary') ??
          this.extractTag(block, 'content:encoded'),
        imageUrl: this.extractImageFromItem(block),
      });
    }
    return items;
  }

  // ─── Image extraction ─────────────────────────────────────────────────────────

  private extractImageFromItem(block: string): string | undefined {
    // media:content url="..."
    let m = /<media:content[^>]+url=["']([^"']+)["']/i.exec(block);
    if (m?.[1]) return m[1];

    // media:thumbnail url="..."
    m = /<media:thumbnail[^>]+url=["']([^"']+)["']/i.exec(block);
    if (m?.[1]) return m[1];

    // <enclosure> tag
    const encAttrs = /<enclosure([^>]+)>/i.exec(block)?.[1] ?? '';
    if (encAttrs) {
      const encType = /type=["']([^"']+)["']/i.exec(encAttrs)?.[1] ?? '';
      const encUrl = /url=["']([^"']+)["']/i.exec(encAttrs)?.[1];
      if (encUrl && (encType.startsWith('image/') || /\.(jpe?g|png|gif|webp)(\?|$)/i.test(encUrl))) {
        return encUrl;
      }
    }

    // First <img src> inside description/content
    const desc =
      this.extractTag(block, 'content:encoded') ??
      this.extractTag(block, 'description') ??
      this.extractTag(block, 'summary') ?? '';
    if (desc) {
      m = /<img[^>]+src=["']([^"']+)["']/i.exec(desc);
      if (m?.[1]?.startsWith('http')) return m[1];
    }

    return undefined;
  }

  // ─── Image backfill ───────────────────────────────────────────────────────────

  async backfillImages(limit = 100): Promise<{ updated: number; failed: number; skipped: number }> {
    const articles = await this.prisma.article.findMany({
      where: { ogImageUrl: null, sourceUrl: { not: null } },
      select: { id: true, sourceUrl: true },
      take: limit,
    });

    let updated = 0;
    let failed = 0;
    const skipped = 0;

    for (const article of articles) {
      if (!article.sourceUrl) { continue; }
      const imageUrl = await this.fetchOgImage(article.sourceUrl);
      if (imageUrl) {
        await this.prisma.article.update({
          where: { id: article.id },
          data: { ogImageUrl: imageUrl },
        });
        updated++;
      } else {
        failed++;
      }
    }

    this.logger.log(`Image backfill complete: ${updated} updated, ${failed} no image found, ${skipped} skipped`);
    return { updated, failed, skipped };
  }

  // ─── OG image fallback ────────────────────────────────────────────────────────

  private async fetchOgImage(url: string): Promise<string | undefined> {
    try {
      const html = await this.fetchRaw(url, 8_000);

      // og:image (most reliable — every modern news site sets this)
      let m = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(html);
      if (m?.[1]?.startsWith('http')) return m[1];

      // Some sites put content before property
      m = /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i.exec(html);
      if (m?.[1]?.startsWith('http')) return m[1];

      // twitter:image fallback
      m = /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i.exec(html);
      if (m?.[1]?.startsWith('http')) return m[1];

      m = /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i.exec(html);
      if (m?.[1]?.startsWith('http')) return m[1];

      return undefined;
    } catch {
      return undefined;
    }
  }

  // ─── XML helpers ──────────────────────────────────────────────────────────────

  private extractTag(xml: string, tag: string): string | undefined {
    const re = new RegExp(
      `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
      'i',
    );
    return re.exec(xml)?.[1]?.trim() || undefined;
  }

  private extractAttr(xml: string, tag: string, attr: string): string | undefined {
    const re = new RegExp(`<${tag}[^>]+${attr}=["']([^"']+)["']`, 'i');
    return re.exec(xml)?.[1]?.trim() || undefined;
  }

  private toSlug(title: string): string {
    const base = title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-{2,}/g, '-')
      .slice(0, 80);
    return `${base}-${Date.now().toString(36)}`;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
  }

  // ─── Feed URL discovery helpers ───────────────────────────────────────────────

  private discoverFeedUrl(html: string, pageUrl: string): string | null {
    const re = /<link[^>]+rel=["']alternate["'][^>]*type=["']application\/(rss|atom)\+xml["'][^>]*href=["']([^"']+)["']/gi;
    const re2 = /<link[^>]+href=["']([^"']+)["'][^>]*type=["']application\/(rss|atom)\+xml["'][^>]*rel=["']alternate["']/gi;
    const match = re.exec(html) ?? re2.exec(html);
    if (!match) return null;
    const href = (match[2] ?? match[1] ?? '').trim();
    if (!href) return null;
    if (href.startsWith('http://') || href.startsWith('https://')) return href;
    try { return new URL(href, pageUrl).toString(); } catch { return null; }
  }

  private extractFeedLinksFromHtml(html: string, pageUrl: string): string[] {
    const links: string[] = [];
    const re = /<a[^>]+href=["']([^"']*(?:rss|feed|atom)[^"']*)["']/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const href = m[1];
      if (!href) continue;
      try {
        const full = href.startsWith('http') ? href : new URL(href, pageUrl).toString();
        if (!links.includes(full)) links.push(full);
      } catch { /* skip malformed */ }
    }
    return links.slice(0, 5);
  }
}
