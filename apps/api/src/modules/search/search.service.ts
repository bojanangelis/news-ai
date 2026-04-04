import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { createHash } from 'crypto';

/**
 * Transliterate Macedonian Latin script → Cyrillic.
 * Digraphs must be replaced before single characters.
 */
function latinToCyrillic(text: string): string {
  // Digraphs first — uppercase first letter = uppercase Cyrillic result
  const DIGRAPHS: [RegExp, string, string][] = [
    [/[Ss][Hh]/g, 'Ш', 'ш'], [/[Cc][Hh]/g, 'Ч', 'ч'], [/[Zz][Hh]/g, 'Ж', 'ж'],
    [/[Ll][Jj]/g, 'Љ', 'љ'], [/[Nn][Jj]/g, 'Њ', 'њ'], [/[Gg][Jj]/g, 'Ѓ', 'ѓ'],
    [/[Kk][Jj]/g, 'Ќ', 'ќ'], [/[Dd][Zz]/g, 'Ѕ', 'ѕ'], [/[Dd][Jj]/g, 'Ѓ', 'ѓ'],
  ];
  const SINGLES: [RegExp, string][] = [
    [/A/g,'А'],[/B/g,'Б'],[/C/g,'Ц'],[/D/g,'Д'],[/E/g,'Е'],
    [/F/g,'Ф'],[/G/g,'Г'],[/H/g,'Х'],[/I/g,'И'],[/J/g,'Ј'],
    [/K/g,'К'],[/L/g,'Л'],[/M/g,'М'],[/N/g,'Н'],[/O/g,'О'],
    [/P/g,'П'],[/R/g,'Р'],[/S/g,'С'],[/T/g,'Т'],[/U/g,'У'],
    [/V/g,'В'],[/Z/g,'З'],
    [/a/g,'а'],[/b/g,'б'],[/c/g,'ц'],[/d/g,'д'],[/e/g,'е'],
    [/f/g,'ф'],[/g/g,'г'],[/h/g,'х'],[/i/g,'и'],[/j/g,'ј'],
    [/k/g,'к'],[/l/g,'л'],[/m/g,'м'],[/n/g,'н'],[/o/g,'о'],
    [/p/g,'п'],[/r/g,'р'],[/s/g,'с'],[/t/g,'т'],[/u/g,'у'],
    [/v/g,'в'],[/z/g,'з'],
  ];

  let result = text;
  for (const [pattern, upper, lower] of DIGRAPHS) {
    result = result.replace(pattern, (m) => m[0] === m[0]!.toUpperCase() ? upper : lower);
  }
  for (const [pattern, replacement] of SINGLES) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function normaliseQuery(query: string): string {
  const hasCyrillic = /[\u0400-\u04FF]/.test(query);
  return hasCyrillic ? query : latinToCyrillic(query);
}

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async search(query: string, options: { category?: string; page?: number; limit?: number }) {
    const { category, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    // Transparently convert Latin input to Cyrillic so "makedonija" finds "Македонија"
    const normalisedQuery = normaliseQuery(query);

    const cacheKey = `search:${createHash('md5').update(JSON.stringify({ query: normalisedQuery, category, page, limit })).digest('hex')}`;

    return this.redis.getOrSet(
      cacheKey,
      async () => {
        // Sanitise each token and build a prefix-match tsquery ("term1:* & term2:*")
        const tokens = normalisedQuery.trim().split(/\s+/).filter(Boolean);
        const tsQuery = tokens
          .map((w) => `${w.replace(/[^\p{L}\p{N}]/gu, '')}:*`)
          .filter(Boolean)
          .join(' & ');

        if (!tsQuery) return { query: normalisedQuery, total: 0, page, limit, totalPages: 0, results: [] };

        // Step 1: ranked IDs via PostgreSQL FTS ('simple' dict — no stemming, works for Cyrillic)
        // Title gets weight A, excerpt weight B → rank favours title matches
        type RawRow = { id: string; rank: number };
        let rawRows: RawRow[];

        if (category) {
          rawRows = await this.prisma.$queryRaw<RawRow[]>`
            SELECT
              a.id,
              ts_rank_cd(
                setweight(to_tsvector('simple', coalesce(a.title,   '')), 'A') ||
                setweight(to_tsvector('simple', coalesce(a.excerpt, '')), 'B'),
                to_tsquery('simple', ${tsQuery})
              ) AS rank
            FROM "Article" a
            JOIN "Category" c ON a."categoryId" = c.id
            WHERE a.status = 'PUBLISHED'
              AND c.slug = ${category}
              AND (
                setweight(to_tsvector('simple', coalesce(a.title,   '')), 'A') ||
                setweight(to_tsvector('simple', coalesce(a.excerpt, '')), 'B')
              ) @@ to_tsquery('simple', ${tsQuery})
            ORDER BY rank DESC, a."publishedAt" DESC
            LIMIT ${(skip + limit) * 2}
          `;
        } else {
          rawRows = await this.prisma.$queryRaw<RawRow[]>`
            SELECT
              a.id,
              ts_rank_cd(
                setweight(to_tsvector('simple', coalesce(a.title,   '')), 'A') ||
                setweight(to_tsvector('simple', coalesce(a.excerpt, '')), 'B'),
                to_tsquery('simple', ${tsQuery})
              ) AS rank
            FROM "Article" a
            WHERE a.status = 'PUBLISHED'
              AND (
                setweight(to_tsvector('simple', coalesce(a.title,   '')), 'A') ||
                setweight(to_tsvector('simple', coalesce(a.excerpt, '')), 'B')
              ) @@ to_tsquery('simple', ${tsQuery})
            ORDER BY rank DESC, a."publishedAt" DESC
            LIMIT ${(skip + limit) * 2}
          `;
        }

        const total = rawRows.length;
        const pageIds = rawRows.slice(skip, skip + limit).map((r) => r.id);
        const rankMap = new Map(rawRows.map((r) => [r.id, Number(r.rank)]));

        if (pageIds.length === 0) {
          return { query, total: 0, page, limit, totalPages: 0, results: [] };
        }

        // Step 2: fetch full Prisma records for the current page only
        const articles = await this.prisma.article.findMany({
          where: { id: { in: pageIds }, status: 'PUBLISHED' },
          include: {
            author: true,
            category: true,
            coverImage: true,
            articleTags: { include: { tag: true } },
          },
        });

        // Re-sort to match FTS rank order and map displayName → name
        const sorted = pageIds
          .map((id) => articles.find((a) => a.id === id))
          .filter((a): a is NonNullable<typeof a> => !!a)
          .map((a) => ({
            ...a,
            author: { ...a.author, name: a.author.displayName },
            _rank: rankMap.get(a.id) ?? 0,
          }));

        return {
          query,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          results: sorted,
        };
      },
      60,
    );
  }
}
