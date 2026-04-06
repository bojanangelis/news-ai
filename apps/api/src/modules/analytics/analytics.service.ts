import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build start-of-day boundaries for the last 7 days
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const [
      totalArticles,
      publishedToday,
      viewsToday,
      totalViews,
      totalUsers,
      newUsersToday,
      premiumSubscribers,
      articlesInReview,
      articlesDraft,
      viewCountsPerDay,
      categories,
      adImpressionsToday,
      adClicksToday,
      activeAdsCount,
    ] = await Promise.all([
      this.prisma.article.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.article.count({ where: { status: 'PUBLISHED', publishedAt: { gte: today } } }),
      this.prisma.articleView.count({ where: { viewedAt: { gte: today } } }),
      this.prisma.articleView.count(),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.premiumSubscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.article.count({ where: { status: 'REVIEW' } }),
      this.prisma.article.count({ where: { status: 'DRAFT' } }),
      // 7 day view counts (one count per day)
      Promise.all(
        days.map((dayStart) => {
          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayEnd.getDate() + 1);
          return this.prisma.articleView.count({
            where: { viewedAt: { gte: dayStart, lt: dayEnd } },
          });
        }),
      ),
      // top categories by published article count
      this.prisma.category.findMany({
        select: {
          name: true,
          _count: { select: { articles: { where: { status: 'PUBLISHED' } } } },
        },
        orderBy: { articles: { _count: 'desc' } },
        take: 6,
      }),
      this.prisma.adEvent.count({ where: { type: 'IMPRESSION', createdAt: { gte: today } } }).catch(() => 0),
      this.prisma.adEvent.count({ where: { type: 'CLICK', createdAt: { gte: today } } }).catch(() => 0),
      this.prisma.ad.count({ where: { status: 'APPROVED', isEnabled: true } }).catch(() => 0),
    ]);

    const viewsLast7Days = days.map((d, i) => ({
      date: d.toLocaleDateString('en-US', { weekday: 'short' }),
      views: viewCountsPerDay[i] ?? 0,
    }));

    const categoryBreakdown = categories.map((c) => ({
      name: c.name,
      articles: c._count.articles,
    }));

    return {
      totalArticles,
      publishedToday,
      viewsToday,
      totalViews,
      totalUsers,
      newUsersToday,
      premiumSubscribers,
      articlesInReview,
      articlesDraft,
      viewsLast7Days,
      categoryBreakdown,
      adImpressionsToday,
      adClicksToday,
      activeAdsCount,
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
