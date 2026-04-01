import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { createHash } from 'crypto';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  async search(query: string, options: { category?: string; page?: number; limit?: number }) {
    const { category, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const cacheKey = `search:${createHash('md5').update(JSON.stringify({ query, category, page, limit })).digest('hex')}`;

    return this.redis.getOrSet(
      cacheKey,
      async () => {
        // Postgres full-text search via raw query for tsvector
        const searchQuery = query
          .trim()
          .split(/\s+/)
          .map((w) => `${w}:*`)
          .join(' & ');

        const where = {
          status: 'PUBLISHED' as const,
          ...(category && { category: { slug: category } }),
          // Full-text filter — will be replaced by generated column approach
          OR: [
            { title: { contains: query, mode: 'insensitive' as const } },
            { excerpt: { contains: query, mode: 'insensitive' as const } },
          ],
        };

        const [articles, total] = await Promise.all([
          this.prisma.article.findMany({
            where,
            skip,
            take: limit,
            orderBy: [{ publishedAt: 'desc' }],
            include: {
              author: true,
              category: true,
              coverImage: true,
            },
          }),
          this.prisma.article.count({ where }),
        ]);

        return {
          query,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          results: articles,
        };
      },
      60,
    );
  }
}
