import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface RssItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  imageUrl?: string;
}

// Realistic browser UA so sites don't block the scraper
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

@Injectable()
export class ScrapingService {
  constructor(private prisma: PrismaService) {}

  async scrapeNow(sourceId: string) {
    const source = await this.prisma.scrapingSource.findUnique({
      where: { id: sourceId },
    });
    if (!source) throw new NotFoundException('Scraping source not found');

    const start = Date.now();
    let logStatus: 'SUCCESS' | 'PARTIAL' | 'ERROR' = 'ERROR';
    let articlesFound = 0;
    let articlesSaved = 0;
    let details = '';
    let errorMessage: string | undefined;

    try {
      // ── Fetch ─────────────────────────────────────────────────────────────
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      const res = await fetch(source.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': BROWSER_UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml,application/rss+xml,application/atom+xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

      const contentType = res.headers.get('content-type') ?? '';
      let body = await res.text();
      let fetchedUrl = source.url;
      const durationMs = Date.now() - start;

      // ── If HTML page, probe common feed URL patterns ──────────────────────
      const isHtml =
        contentType.includes('text/html') ||
        /^<!DOCTYPE\s+html/i.test(body.trimStart()) ||
        /^<html[\s>]/i.test(body.trimStart());

      if (isHtml) {
        const base = source.url.replace(/\/$/, '');
        const candidates = [
          this.discoverFeedUrl(body, source.url),   // <link rel="alternate">
          ...this.extractFeedLinksFromHtml(body, source.url), // <a href> with rss/feed
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

        // Deduplicate candidates
        const seen = new Set<string>();
        const uniqueCandidates = candidates.filter((c) => {
          if (seen.has(c)) return false;
          seen.add(c);
          return true;
        });

        let feedFound = false;
        for (const candidate of uniqueCandidates) {
          try {
            const ctrl2 = new AbortController();
            const t2 = setTimeout(() => ctrl2.abort(), 10_000);
            const res2 = await fetch(candidate, {
              signal: ctrl2.signal,
              headers: { 'User-Agent': BROWSER_UA, 'Accept': '*/*' },
            }).finally(() => clearTimeout(t2));

            if (!res2.ok) continue;
            const ct2 = res2.headers.get('content-type') ?? '';
            const b2 = await res2.text();
            const looksLikeFeed =
              ct2.includes('xml') || ct2.includes('rss') || ct2.includes('atom') ||
              /<(rss|feed|channel)\b/i.test(b2.slice(0, 500));

            if (looksLikeFeed) {
              body = b2;
              fetchedUrl = candidate;
              feedFound = true;
              break;
            }
          } catch {
            continue;
          }
        }

        if (!feedFound) {
          logStatus = 'PARTIAL';
          details =
            `The URL returned an HTML page. Tried these feed URLs — none worked:\n` +
            uniqueCandidates.map((c) => `  • ${c}`).join('\n') +
            `\n\nFix: find the RSS/Atom feed URL manually and update the source URL.`;
          await this.finalise(sourceId, logStatus, 0, 0, durationMs, details, 'HTML page returned, no feed found');
          return { status: logStatus, articlesFound: 0, articlesSaved: 0, durationMs, details };
        }
      }

      // ── Parse RSS/Atom ─────────────────────────────────────────────────────
      const items = this.parseRss(body).filter((i) => i.title && i.link);
      articlesFound = items.length;

      if (articlesFound === 0) {
        logStatus = 'PARTIAL';
        details =
          `Feed parsed but 0 valid items found.\n` +
          (fetchedUrl !== source.url ? `Feed URL (auto-discovered): ${fetchedUrl}\n` : '') +
          `First 500 chars:\n${body.slice(0, 500)}`;
        await this.finalise(sourceId, logStatus, 0, 0, durationMs, details, 'No items in feed');
        return { status: logStatus, articlesFound: 0, articlesSaved: 0, durationMs, details };
      }

      // ── Resolve author + category ──────────────────────────────────────────
      const author = await this.prisma.author.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      if (!author) throw new Error('No author found. Run the database seed first.');

      const category = source.defaultCategoryId
        ? await this.prisma.category.findUnique({ where: { id: source.defaultCategoryId } })
        : await this.prisma.category.findFirst({ where: { isActive: true }, orderBy: { order: 'asc' } });
      if (!category) throw new Error('No category found. Run the database seed first.');

      // ── Save articles ──────────────────────────────────────────────────────
      const saved: string[] = [];
      const skipped: string[] = [];

      for (const item of items) {
        const slug = this.toSlug(item.title);
        const excerpt = this.stripHtml(item.description ?? '').slice(0, 300) || item.title;

        // Dedup: skip if slug or sourceUrl already exists
        const existing = await this.prisma.article.findFirst({
          where: { OR: [{ slug }, { sourceUrl: item.link }] },
          select: { id: true },
        });
        if (existing) { skipped.push(item.title); continue; }

        await this.prisma.article.create({
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
            readTimeMinutes: Math.max(1, Math.ceil(excerpt.split(' ').length / 200)),
            sections: {
              create: [
                {
                  type: 'PARAGRAPH',
                  order: 0,
                  content: excerpt,
                },
                ...(item.link
                  ? [{
                      type: 'EMBED' as const,
                      order: 1,
                      url: item.link,
                      caption: `Original article: ${item.link}`,
                    }]
                  : []),
              ],
            },
          },
        });
        saved.push(item.title);
        articlesSaved++;
      }

      logStatus = articlesSaved > 0 ? 'SUCCESS' : 'PARTIAL';
      details =
        (fetchedUrl !== source.url ? `Feed URL (auto-discovered): ${fetchedUrl}\n` : '') +
        `Found ${articlesFound} items, saved ${articlesSaved} new articles` +
        (skipped.length ? `, skipped ${skipped.length} duplicates` : '') +
        `.\nCategory: ${category.name} · Author: ${author.displayName}\n\n` +
        (saved.length
          ? `Saved:\n${saved.slice(0, 10).map((t, i) => `${i + 1}. ${t}`).join('\n')}`
          : '') +
        (skipped.length
          ? `\n\nSkipped (already exist):\n${skipped.slice(0, 5).map((t, i) => `${i + 1}. ${t}`).join('\n')}`
          : '');

      await this.finalise(sourceId, logStatus, articlesFound, articlesSaved, durationMs, details);
      return { status: logStatus, articlesFound, articlesSaved, durationMs, details };

    } catch (err: unknown) {
      const durationMs = Date.now() - start;
      errorMessage = err instanceof Error ? err.message : String(err);
      details = `Scrape failed: ${errorMessage}`;
      await this.finalise(sourceId, 'ERROR', 0, 0, durationMs, details, errorMessage);
      return { status: 'ERROR', articlesFound: 0, articlesSaved: 0, durationMs, details, errorMessage };
    }
  }

  async getLogs(sourceId: string, limit = 20) {
    return this.prisma.scrapingLog.findMany({
      where: { sourceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async finalise(
    sourceId: string,
    status: 'SUCCESS' | 'PARTIAL' | 'ERROR',
    articlesFound: number,
    articlesSaved: number,
    durationMs: number,
    details: string,
    errorMessage?: string,
  ) {
    await this.prisma.scrapingSource.update({
      where: { id: sourceId },
      data: {
        status: status === 'ERROR' ? 'ERROR' : 'ACTIVE',
        lastScrapedAt: new Date(),
        errorMessage: errorMessage ?? null,
      },
    });

    await this.prisma.scrapingLog.create({
      data: {
        sourceId,
        status,
        articlesFound,
        articlesSaved,
        durationMs,
        details: details.slice(0, 2000),
        errorMessage: errorMessage ?? null,
      },
    });
  }

  // ─── RSS/Atom parser ────────────────────────────────────────────────────────

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
        pubDate: this.extractTag(block, 'pubDate') ?? this.extractTag(block, 'published') ?? this.extractTag(block, 'updated'),
        description: this.extractTag(block, 'description') ?? this.extractTag(block, 'summary') ?? this.extractTag(block, 'content:encoded'),
        imageUrl: this.extractImageFromItem(block),
      });
    }
    return items;
  }

  // ─── Image extraction from RSS item block ───────────────────────────────────

  private extractImageFromItem(block: string): string | undefined {
    // media:content url="..."
    let m = /<media:content[^>]+url=["']([^"']+)["']/i.exec(block);
    if (m?.[1]) return m[1];

    // media:thumbnail url="..."
    m = /<media:thumbnail[^>]+url=["']([^"']+)["']/i.exec(block);
    if (m?.[1]) return m[1];

    // enclosure — extract the whole tag's attributes first
    const encAttrs = /<enclosure([^>]+)>/i.exec(block)?.[1] ?? '';
    if (encAttrs) {
      const encType = /type=["']([^"']+)["']/i.exec(encAttrs)?.[1] ?? '';
      const encUrl = /url=["']([^"']+)["']/i.exec(encAttrs)?.[1];
      if (encUrl && (encType.startsWith('image/') || /\.(jpe?g|png|gif|webp)(\?|$)/i.test(encUrl))) {
        return encUrl;
      }
    }

    // First <img src> inside the description / content (HTML content)
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
      .replace(/[^\p{L}\p{N}\s-]/gu, '') // keep Unicode letters (Cyrillic, Latin, etc.)
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-{2,}/g, '-')
      .slice(0, 80);
    return `${base}-${Date.now().toString(36)}`;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
  }

  // ─── Auto-discover RSS/Atom feed URL from <link rel="alternate"> ───────────

  private discoverFeedUrl(html: string, pageUrl: string): string | null {
    const re = /<link[^>]+rel=["']alternate["'][^>]*type=["']application\/(rss|atom)\+xml["'][^>]*href=["']([^"']+)["']/gi;
    const re2 = /<link[^>]+href=["']([^"']+)["'][^>]*type=["']application\/(rss|atom)\+xml["'][^>]*rel=["']alternate["']/gi;

    const match = re.exec(html) ?? re2.exec(html);
    if (!match) return null;

    const href = (match[2] ?? match[1] ?? '').trim();
    if (!href) return null;

    if (href.startsWith('http://') || href.startsWith('https://')) return href;
    try {
      return new URL(href, pageUrl).toString();
    } catch {
      return null;
    }
  }

  // ─── Extract feed candidates from <a href> links in HTML ───────────────────

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
