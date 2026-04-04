import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ArticleStatus, ArticleSectionType } from '@repo/database';
import { CreateArticleDto, UpdateArticleDto, ArticlesQueryDto } from './dto/articles.dto';

@Injectable()
export class ArticlesService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async findAll(query: ArticlesQueryDto) {
    const { page = 1, limit = 20, category, status = 'PUBLISHED', authorSlug, isBreaking, q } = query;
    const skip = (page - 1) * limit;

    const where = {
      status: status as ArticleStatus,
      ...(category && { category: { slug: category } }),
      ...(authorSlug && { author: { slug: authorSlug } }),
      ...(isBreaking !== undefined && { isBreaking }),
      ...(q && {
        OR: [
          { title: { contains: q, mode: 'insensitive' as const } },
          { excerpt: { contains: q, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        include: this.articleSummaryInclude(),
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data: articles.map(this.normalizeArticle),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    };
  }

  async findBySlug(slug: string, userId?: string) {
    return this.redis.getOrSet(
      `article:${slug}`,
      async () => {
        const article = await this.prisma.article.findFirst({
          where: { slug, status: 'PUBLISHED' },
          include: {
            ...this.articleSummaryInclude(),
            sections: { orderBy: { order: 'asc' } },
            articleTopics: { include: { topic: true } },
            articleTags: { include: { tag: true } },
          },
        });
        if (!article) throw new NotFoundException('Article not found');

        const related = await this.prisma.article.findMany({
          where: {
            categoryId: article.categoryId,
            status: 'PUBLISHED',
            id: { not: article.id },
          },
          take: 4,
          orderBy: { publishedAt: 'desc' },
          include: this.articleSummaryInclude(),
        });

        return {
          ...this.normalizeArticle(article),
          relatedArticles: related.map(this.normalizeArticle),
        };
      },
      300, // 5 min TTL
    ).then(async (article) => {
      const isBookmarked = userId
        ? !!(await this.prisma.bookmark.findUnique({
            where: { userId_articleId: { userId, articleId: article.id } },
          }))
        : null;
      return { ...article, isBookmarked };
    });
  }

  private audit(userId: string, action: string, entityType: string, entityId?: string, before?: unknown, after?: unknown) {
    this.prisma.adminAuditLog.create({
      data: { userId, action, entityType, entityId, before: before as any, after: after as any },
    }).catch(() => {});
  }

  async create(dto: CreateArticleDto, authorId: string) {
    const slug = dto.slug ?? this.generateSlug(dto.title);

    const article = await this.prisma.article.create({
      data: {
        title: dto.title,
        slug,
        excerpt: dto.excerpt,
        status: (dto.status ?? 'DRAFT') as ArticleStatus,
        isPremium: dto.isPremium ?? false,
        isBreaking: dto.isBreaking ?? false,
        category: { connect: { id: dto.categoryId } },
        author: { connect: { id: authorId } },
        ...(dto.coverImageId && { coverImage: { connect: { id: dto.coverImageId } } }),
        readTimeMinutes: this.estimateReadTime(dto.sections),
        sections: {
          create: dto.sections.map((s) => ({
            type: s.type as ArticleSectionType,
            order: s.order,
            content: s.content,
            level: s.level,
            url: s.url,
            caption: s.caption,
            attribution: s.attribution,
            language: s.language,
            ...(s.mediaAssetId && { mediaAsset: { connect: { id: s.mediaAssetId } } }),
          })),
        },
        ...(dto.tagIds && {
          articleTags: { create: dto.tagIds.map((tagId) => ({ tagId })) },
        }),
      },
      include: this.articleSummaryInclude(),
    });

    this.audit(authorId, 'article.create', 'Article', article.id, null, { title: article.title, status: article.status });
    return article;
  }

  async update(id: string, dto: UpdateArticleDto, userId?: string) {
    const article = await this.findById(id);

    const updated = await this.prisma.article.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.excerpt && { excerpt: dto.excerpt }),
        ...(dto.coverImageId !== undefined && {
          coverImage: dto.coverImageId
            ? { connect: { id: dto.coverImageId } }
            : { disconnect: true },
        }),
        ...(dto.isPremium !== undefined && { isPremium: dto.isPremium }),
        ...(dto.isBreaking !== undefined && { isBreaking: dto.isBreaking }),
        ...(dto.categoryId && { category: { connect: { id: dto.categoryId } } }),
        ...(dto.sections && {
          sections: {
            deleteMany: {},
            create: dto.sections.map((s) => ({
              type: s.type as ArticleSectionType,
              order: s.order,
              content: s.content,
              level: s.level,
              url: s.url,
              caption: s.caption,
              attribution: s.attribution,
              language: s.language,
              ...(s.mediaAssetId && { mediaAsset: { connect: { id: s.mediaAssetId } } }),
            })),
          },
          readTimeMinutes: this.estimateReadTime(dto.sections),
        }),
      },
      include: this.articleSummaryInclude(),
    });

    await this.redis.del(`article:${article.slug}`);
    if (userId) this.audit(userId, 'article.update', 'Article', id, { title: article.title }, { title: dto.title ?? article.title });
    return updated;
  }

  async publish(id: string, userId?: string) {
    const article = await this.findById(id);
    if (article.status === 'PUBLISHED') return article;

    const published = await this.prisma.article.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });

    await this.redis.del(`article:${article.slug}`);
    await this.redis.delPattern('homepage:*');
    await this.redis.delPattern(`category:${article.category?.slug}:*`);

    if (userId) this.audit(userId, 'article.publish', 'Article', id, { status: 'DRAFT' }, { status: 'PUBLISHED' });
    return published;
  }

  async archive(id: string, userId?: string) {
    const article = await this.findById(id);
    const archived = await this.prisma.article.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    await this.redis.del(`article:${article.slug}`);
    if (userId) this.audit(userId, 'article.archive', 'Article', id, { status: article.status }, { status: 'ARCHIVED' });
    return archived;
  }

  async getRecommended(userId: string, limit = 20) {
    // Find the user's top 3 categories from recent views (last 30 days)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const viewedCategories = await this.prisma.articleView.findMany({
      where: { userId, viewedAt: { gte: since } },
      include: { article: { select: { categoryId: true } } },
      take: 100,
      orderBy: { viewedAt: 'desc' },
    });

    const categoryCounts = new Map<string, number>();
    for (const v of viewedCategories) {
      if (v.article?.categoryId) {
        categoryCounts.set(v.article.categoryId, (categoryCounts.get(v.article.categoryId) ?? 0) + 1);
      }
    }

    const topCategoryIds = [...categoryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);

    const where = {
      status: 'PUBLISHED' as const,
      ...(topCategoryIds.length > 0 && { categoryId: { in: topCategoryIds } }),
    };

    const articles = await this.prisma.article.findMany({
      where,
      take: limit,
      orderBy: { publishedAt: 'desc' },
      include: this.articleSummaryInclude(),
    });

    return articles.map(this.normalizeArticle);
  }

  async recordView(articleId: string, userId?: string, sessionId?: string) {
    await this.prisma.$transaction([
      this.prisma.articleView.create({
        data: { articleId, userId, sessionId },
      }),
      this.prisma.article.update({
        where: { id: articleId },
        data: { viewCount: { increment: 1 } },
      }),
    ]);
  }

  private async findById(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  // Maps Prisma Author.displayName → name so the client type (ArticleAuthor.name) works
  private normalizeArticle = <T extends { author: { displayName: string; [k: string]: unknown } }>(
    article: T,
  ): T & { author: { name: string } } => ({
    ...article,
    author: { ...article.author, name: article.author.displayName },
  });

  private articleSummaryInclude() {
    return {
      author: true,
      category: true,
      coverImage: true,
      articleTags: { include: { tag: true } },
    };
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 200)
      + '-' + Date.now().toString(36);
  }

  private estimateReadTime(sections: { content?: string; type: string }[]): number {
    const text = sections
      .filter((s) => ['PARAGRAPH', 'QUOTE', 'HEADING'].includes(s.type))
      .map((s) => s.content ?? '')
      .join(' ');
    const words = text.split(/\s+/).length;
    return Math.max(1, Math.round(words / 200));
  }
}
