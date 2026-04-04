import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalArticles,
      publishedToday,
      viewsToday,
      totalUsers,
      newUsersToday,
      premiumSubscribers,
      topArticles,
    ] = await Promise.all([
      this.prisma.article.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.article.count({ where: { status: 'PUBLISHED', publishedAt: { gte: today } } }),
      this.prisma.articleView.count({ where: { viewedAt: { gte: today } } }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.premiumSubscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.article.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { viewCount: 'desc' },
        take: 10,
        select: { id: true, title: true, slug: true, viewCount: true, publishedAt: true },
      }),
    ]);

    return {
      totalArticles,
      publishedToday,
      viewsToday,
      totalUsers,
      newUsersToday,
      premiumSubscribers,
      topArticles,
    };
  }

  async getTopArticles(days = 7, limit = 20) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await this.prisma.articleView.groupBy({
      by: ['articleId'],
      where: { viewedAt: { gte: since } },
      _count: { articleId: true },
      orderBy: { _count: { articleId: 'desc' } },
      take: limit,
    });

    const articleIds = rows.map((r) => r.articleId);
    const articles = await this.prisma.article.findMany({
      where: { id: { in: articleIds } },
      select: { id: true, title: true, slug: true, category: { select: { name: true } } },
    });

    const articleMap = new Map(articles.map((a) => [a.id, a]));

    return rows.map((row) => ({
      articleId: row.articleId,
      views: row._count.articleId,
      article: articleMap.get(row.articleId) ?? null,
    }));
  }
}
