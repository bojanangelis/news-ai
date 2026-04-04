import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ─── Macedonian stop words ─────────────────────────────────────────────────────
// These are filtered out before title fingerprinting so they don't pollute similarity scores.

const MK_STOP_WORDS = new Set([
  'и', 'на', 'во', 'за', 'со', 'од', 'до', 'при', 'по', 'дека', 'но', 'или', 'а',
  'се', 'не', 'ги', 'го', 'ја', 'им', 'ни', 'да', 'ке', 'би', 'ми', 'му', 'нас',
  'вас', 'нив', 'тоа', 'тој', 'таа', 'тие', 'кои', 'кое', 'кога', 'каде', 'зошто',
  'овој', 'оваа', 'овие', 'еден', 'една', 'едно', 'е', 'има', 'нема', 'ова', 'исто',
  'така', 'каков', 'the', 'is', 'in', 'of', 'to', 'a', 'an', 'and', 'or', 'for',
  'with', 'on', 'at', 'from', 'by', 'this', 'that', 'are', 'was', 'were', 'be',
]);

// ─── Macedonian entity dictionary ─────────────────────────────────────────────
// These are high-salience named entities that anchor story clustering.
// When two articles share 2+ entities, they are very likely about the same event.

const MK_ENTITIES: Array<{
  patterns: string[];
  name: string;
  type: 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'EVENT';
}> = [
  // Politicians
  { patterns: ['ковачевски', 'kovachevski'], name: 'Dimitar Kovachevski', type: 'PERSON' },
  { patterns: ['мицкоски', 'mickoski'], name: 'Hristijan Mickoski', type: 'PERSON' },
  { patterns: ['пендаровски', 'pendarovski'], name: 'Stevo Pendarovski', type: 'PERSON' },
  { patterns: ['аљити', 'aljiti', 'алити', 'ahmeti', 'ахмети'], name: 'Ali Ahmeti', type: 'PERSON' },
  { patterns: ['заев', 'zaev'], name: 'Zoran Zaev', type: 'PERSON' },
  { patterns: ['груевски', 'gruevski'], name: 'Nikola Gruevski', type: 'PERSON' },
  { patterns: ['бесими', 'besimi'], name: 'Fatmir Besimi', type: 'PERSON' },
  { patterns: ['маричиќ', 'maricik', 'маричик'], name: 'Bojan Maricic', type: 'PERSON' },
  { patterns: ['спасовски', 'spasovski'], name: 'Oliver Spasovski', type: 'PERSON' },
  { patterns: ['николоски', 'nikoloski'], name: 'Aleksandar Nikoloski', type: 'PERSON' },
  // Organizations
  { patterns: ['вмро-дпмне', 'vmro-dpmne'], name: 'VMRO-DPMNE', type: 'ORGANIZATION' },
  { patterns: ['сдсм', 'sdsm'], name: 'SDSM', type: 'ORGANIZATION' },
  { patterns: ['дуи', 'dui'], name: 'DUI', type: 'ORGANIZATION' },
  { patterns: ['беса', 'besa'], name: 'BESA', type: 'ORGANIZATION' },
  { patterns: ['левица', 'levica'], name: 'Levica', type: 'ORGANIZATION' },
  { patterns: ['собрание', 'sobranie', 'парламент'], name: 'Sobranie', type: 'ORGANIZATION' },
  { patterns: ['влада', 'vladata'], name: 'Government', type: 'ORGANIZATION' },
  { patterns: ['нато', 'nato'], name: 'NATO', type: 'ORGANIZATION' },
  { patterns: ['европска унија', 'евроунија', 'eu ', 'european union'], name: 'EU', type: 'ORGANIZATION' },
  { patterns: ['мвр', 'mvr', 'полиција'], name: 'MIA', type: 'ORGANIZATION' },
  { patterns: ['мвр', 'министерство за внатрешни работи'], name: 'MoI', type: 'ORGANIZATION' },
  { patterns: ['јавно обвинителство', 'обвинителство', 'sppo', 'спо'], name: 'Prosecution', type: 'ORGANIZATION' },
  { patterns: ['уставен суд', 'врховен суд'], name: 'Court', type: 'ORGANIZATION' },
  // Locations
  { patterns: ['скопје', 'skopje', 'скопски'], name: 'Skopje', type: 'LOCATION' },
  { patterns: ['охрид', 'ohrid'], name: 'Ohrid', type: 'LOCATION' },
  { patterns: ['битола', 'bitola'], name: 'Bitola', type: 'LOCATION' },
  { patterns: ['тетово', 'tetovo'], name: 'Tetovo', type: 'LOCATION' },
  { patterns: ['куманово', 'kumanovo'], name: 'Kumanovo', type: 'LOCATION' },
  { patterns: ['штип', 'shtip'], name: 'Shtip', type: 'LOCATION' },
  { patterns: ['прилеп', 'prilep'], name: 'Prilep', type: 'LOCATION' },
  { patterns: ['гостивар', 'gostivar'], name: 'Gostivar', type: 'LOCATION' },
  { patterns: ['велес', 'veles'], name: 'Veles', type: 'LOCATION' },
  { patterns: ['струга', 'struga'], name: 'Struga', type: 'LOCATION' },
  { patterns: ['кичево', 'kicevo', 'кичевски'], name: 'Kicevo', type: 'LOCATION' },
  { patterns: ['македонија', 'makedonija', 'north macedonia', 'македонски'], name: 'North Macedonia', type: 'LOCATION' },
  { patterns: ['русија', 'russia', 'руски'], name: 'Russia', type: 'LOCATION' },
  { patterns: ['украина', 'ukraine', 'украински'], name: 'Ukraine', type: 'LOCATION' },
  { patterns: ['srbija', 'србија', 'serbian'], name: 'Serbia', type: 'LOCATION' },
  { patterns: ['косово', 'kosovo'], name: 'Kosovo', type: 'LOCATION' },
  { patterns: ['бугарија', 'bulgaria', 'бугарски'], name: 'Bulgaria', type: 'LOCATION' },
  { patterns: ['грција', 'greece', 'грчки'], name: 'Greece', type: 'LOCATION' },
  // Events
  { patterns: ['избори', 'изборни', 'гласање', 'гласачи', 'election', 'elections'], name: 'Elections', type: 'EVENT' },
  { patterns: ['земјотрес', 'потрес', 'earthquake'], name: 'Earthquake', type: 'EVENT' },
  { patterns: ['протест', 'демонстрации', 'protest'], name: 'Protest', type: 'EVENT' },
  { patterns: ['пожар', 'пожари', 'fire'], name: 'Fire', type: 'EVENT' },
  { patterns: ['несреќа', 'сообраќајка', 'судир', 'accident'], name: 'Accident', type: 'EVENT' },
  { patterns: ['пресуда', 'осуден', 'притвор', 'апсење', 'arrest', 'verdict'], name: 'Trial/Arrest', type: 'EVENT' },
  { patterns: ['попис', 'census', 'попис на население'], name: 'Census', type: 'EVENT' },
  { patterns: ['бегалци', 'мигранти', 'migrants', 'refugees'], name: 'Migration', type: 'EVENT' },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const CLUSTER_THRESHOLD = 0.42;  // min combined score to join an existing story
const TIME_WINDOW_HOURS = 72;    // look back this many hours for candidate stories
const MAX_CANDIDATES = 60;       // max stories to score per article

@Injectable()
export class StoryManagerService {
  private readonly logger = new Logger(StoryManagerService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Public API ───────────────────────────────────────────────────────────────

  /**
   * Called after each article is saved. Assigns the article to an existing
   * story or creates a new one. Runs async — never throws.
   */
  async assignArticleToStory(articleId: string): Promise<void> {
    try {
      const article = await this.prisma.article.findUnique({
        where: { id: articleId },
        select: {
          id: true,
          title: true,
          categoryId: true,
          publishedAt: true,
          ogImageUrl: true,
          excerpt: true,
          sourceUrl: true,
          readTimeMinutes: true,
        },
      });

      if (!article) return;

      const fingerprint = this.computeFingerprint(article.title);
      const entities = this.extractEntities(`${article.title} ${article.excerpt ?? ''}`);
      const publishedAt = article.publishedAt ?? new Date();

      // Persist fingerprint on the article
      await this.prisma.article.update({
        where: { id: articleId },
        data: { titleFingerprint: fingerprint },
      });

      // Find candidate stories from the last TIME_WINDOW_HOURS hours
      const windowStart = new Date(Date.now() - TIME_WINDOW_HOURS * 3_600_000);

      const candidates = await this.prisma.story.findMany({
        where: {
          status: 'ACTIVE',
          lastPublishedAt: { gte: windowStart },
        },
        include: {
          storyArticles: {
            where: { role: 'CANONICAL' },
            include: {
              article: {
                select: {
                  id: true,
                  title: true,
                  titleFingerprint: true,
                  excerpt: true,
                  publishedAt: true,
                },
              },
            },
            take: 1,
          },
        },
        orderBy: { lastPublishedAt: 'desc' },
        take: MAX_CANDIDATES,
      });

      if (candidates.length === 0) {
        await this.createNewStory(article, articleId, fingerprint);
        return;
      }

      // Score each candidate against the incoming article
      let bestStoryId: string | null = null;
      let bestScore = 0;
      let bestMethod: 'TITLE_FINGERPRINT' | 'ENTITY_OVERLAP' = 'TITLE_FINGERPRINT';

      for (const story of candidates) {
        const canonical = story.storyArticles[0]?.article;
        if (!canonical) continue;

        // Skip if they're clearly in different categories (both known, and different)
        if (article.categoryId && story.categoryId && article.categoryId !== story.categoryId) {
          continue;
        }

        const canonFp = canonical.titleFingerprint ?? this.computeFingerprint(canonical.title);
        const titleScore = this.jaccardSimilarity(fingerprint, canonFp);

        const canonEntities = this.extractEntities(`${canonical.title} ${canonical.excerpt ?? ''}`);
        const entityScore = this.entityOverlap(entities, canonEntities);

        const timeScore = this.timeProximityScore(publishedAt, story.firstPublishedAt);

        // Weighted combination — entity overlap matters most for same-story detection
        const combined = titleScore * 0.35 + entityScore * 0.50 + timeScore * 0.15;

        if (combined > bestScore) {
          bestScore = combined;
          bestStoryId = story.id;
          bestMethod = entityScore >= titleScore ? 'ENTITY_OVERLAP' : 'TITLE_FINGERPRINT';
        }
      }

      if (bestStoryId && bestScore >= CLUSTER_THRESHOLD) {
        await this.joinStory(articleId, bestStoryId, bestScore, bestMethod, article);
      } else {
        await this.createNewStory(article, articleId, fingerprint);
      }
    } catch (err) {
      this.logger.error({
        event: 'story_assignment_failed',
        articleId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ─── Private: story operations ────────────────────────────────────────────────

  private async joinStory(
    articleId: string,
    storyId: string,
    matchScore: number,
    matchMethod: 'TITLE_FINGERPRINT' | 'ENTITY_OVERLAP',
    article: { publishedAt: Date | null },
  ): Promise<void> {
    const publishedAt = article.publishedAt ?? new Date();

    await this.prisma.$transaction([
      this.prisma.storyArticle.upsert({
        where: { storyId_articleId: { storyId, articleId } },
        create: {
          storyId,
          articleId,
          role: 'SUPPORTING',
          rankScore: 0.5,
          matchMethod,
          matchScore,
        },
        update: { matchScore, matchMethod },
      }),
      this.prisma.story.update({
        where: { id: storyId },
        data: { lastPublishedAt: publishedAt },
      }),
      this.prisma.dedupeDecision.create({
        data: {
          articleId,
          storyId,
          decision: 'JOINED_EXISTING',
          method: matchMethod,
          score: matchScore,
        },
      }),
    ]);

    // Update counts and re-elect canonical — outside transaction for safety
    await this.updateStoryCounts(storyId);
    await this.electCanonical(storyId);

    this.logger.log({
      event: 'article_joined_story',
      articleId,
      storyId,
      matchScore: matchScore.toFixed(3),
      matchMethod,
    });
  }

  private async createNewStory(
    article: {
      title: string;
      categoryId: string | null;
      publishedAt: Date | null;
      ogImageUrl?: string | null;
      excerpt?: string | null;
    },
    articleId: string,
    fingerprint: string,
  ): Promise<void> {
    const publishedAt = article.publishedAt ?? new Date();

    const story = await this.prisma.story.create({
      data: {
        title: article.title,
        summary: article.excerpt ?? null,
        imageUrl: article.ogImageUrl ?? null,
        categoryId: article.categoryId,
        firstPublishedAt: publishedAt,
        lastPublishedAt: publishedAt,
        sourceCount: 1,
        articleCount: 1,
        storyArticles: {
          create: {
            articleId,
            role: 'CANONICAL',
            rankScore: 1.0,
            matchMethod: 'TITLE_FINGERPRINT',
            matchScore: 1.0,
          },
        },
      },
    });

    await this.prisma.dedupeDecision.create({
      data: {
        articleId,
        storyId: story.id,
        decision: 'CREATED_NEW',
        method: 'TITLE_FINGERPRINT',
        score: 1.0,
        metadata: { fingerprint },
      },
    });

    this.logger.log({ event: 'new_story_created', articleId, storyId: story.id });
  }

  private async updateStoryCounts(storyId: string): Promise<void> {
    const storyArticles = await this.prisma.storyArticle.findMany({
      where: { storyId },
      include: { article: { select: { sourceUrl: true } } },
    });

    const domains = new Set(
      storyArticles
        .map((sa) => {
          try {
            return new URL(sa.article.sourceUrl ?? '').hostname;
          } catch {
            return null;
          }
        })
        .filter((d): d is string => d !== null),
    );

    await this.prisma.story.update({
      where: { id: storyId },
      data: {
        articleCount: storyArticles.length,
        sourceCount: Math.max(1, domains.size),
      },
    });
  }

  private async electCanonical(storyId: string): Promise<void> {
    const storyArticles = await this.prisma.storyArticle.findMany({
      where: { storyId },
      include: {
        article: {
          select: {
            id: true,
            readTimeMinutes: true,
            ogImageUrl: true,
            publishedAt: true,
            excerpt: true,
          },
        },
      },
    });

    if (storyArticles.length === 0) return;

    const now = Date.now();

    const scored = storyArticles.map((sa) => {
      const a = sa.article;
      // Completeness: longer articles with images are better canonical sources
      const readMinutes = a.readTimeMinutes ?? 0;
      const completeness =
        Math.min(1, readMinutes / 5) * 0.5 +   // up to 5-min read = full score
        (a.ogImageUrl ? 0.3 : 0) +
        (a.excerpt ? 0.2 : 0);

      // Freshness decays over 72h — earlier articles in a story tend to be the original source
      const ageHours = (now - (a.publishedAt?.getTime() ?? now)) / 3_600_000;
      const freshness = Math.max(0, 1 - ageHours / 72);

      return {
        storyArticleId: sa.id,
        score: completeness * 0.65 + freshness * 0.35,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const bestId = scored[0]!.storyArticleId;

    await this.prisma.$transaction([
      this.prisma.storyArticle.updateMany({
        where: { storyId },
        data: { role: 'SUPPORTING' },
      }),
      this.prisma.storyArticle.update({
        where: { id: bestId },
        data: { role: 'CANONICAL', rankScore: 1.0 },
      }),
    ]);
  }

  // ─── Fingerprinting ───────────────────────────────────────────────────────────

  /**
   * Produces a normalized, sorted word-bag fingerprint from a title.
   * Two titles with high word overlap → similar fingerprints → high Jaccard score.
   *
   * Strips Macedonian suffixes (-от, -та, -те, -ти) so "владата" and "влада"
   * are treated as the same token.
   */
  computeFingerprint(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\wа-яёА-ЯЁ\u0400-\u04FF\s-]/g, ' ')
      .split(/\s+/)
      .map((w) => w.replace(/(от|та|те|ти|ски|ска|ско|ите|ата|ото)$/, ''))
      .filter((w) => w.length > 2 && !MK_STOP_WORDS.has(w))
      .sort()
      .join('|');
  }

  private jaccardSimilarity(fpA: string, fpB: string): number {
    if (!fpA || !fpB) return 0;
    const setA = new Set(fpA.split('|').filter(Boolean));
    const setB = new Set(fpB.split('|').filter(Boolean));
    if (setA.size === 0 && setB.size === 0) return 1;
    if (setA.size === 0 || setB.size === 0) return 0;
    const intersection = [...setA].filter((x) => setB.has(x)).length;
    const union = new Set([...setA, ...setB]).size;
    return intersection / union;
  }

  // ─── Entity extraction ────────────────────────────────────────────────────────

  extractEntities(text: string): string[] {
    const lower = text.toLowerCase();
    const found = new Set<string>();
    for (const entity of MK_ENTITIES) {
      if (entity.patterns.some((p) => lower.includes(p))) {
        found.add(entity.name);
      }
    }
    return [...found];
  }

  private entityOverlap(entitiesA: string[], entitiesB: string[]): number {
    if (entitiesA.length === 0 || entitiesB.length === 0) return 0;
    const setA = new Set(entitiesA);
    const setB = new Set(entitiesB);
    const intersection = [...setA].filter((x) => setB.has(x)).length;
    const union = new Set([...setA, ...setB]).size;
    return intersection / union;
  }

  private timeProximityScore(dateA: Date, dateB: Date): number {
    const diffHours = Math.abs(dateA.getTime() - dateB.getTime()) / 3_600_000;
    if (diffHours <= 4) return 1.0;
    if (diffHours <= 12) return 0.85;
    if (diffHours <= 24) return 0.65;
    if (diffHours <= 48) return 0.40;
    if (diffHours <= 72) return 0.20;
    return 0;
  }
}
