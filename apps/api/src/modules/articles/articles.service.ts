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
    const { page = 1, limit = 20, category, status = 'PUBLISHED' } = query;
    const skip = (page - 1) * limit;

    const where = {
      status: status as ArticleStatus,
      ...(category && { category: { slug: category } }),
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
      data: articles,
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

        return { ...article, relatedArticles: related };
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

  async create(dto: CreateArticleDto, authorId: string) {
    const slug = dto.slug ?? this.generateSlug(dto.title);

    const article = await this.prisma.article.create({
      data: {
        title: dto.title,
        slug,
        excerpt: dto.excerpt,
        status: (dto.status ?? 'DRAFT') as ArticleStatus,
        isPremium: dto.isPremium ?? false,
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

    return article;
  }

  async update(id: string, dto: UpdateArticleDto) {
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
    return updated;
  }

  async publish(id: string) {
    const article = await this.findById(id);
    if (article.status === 'PUBLISHED') return article;

    const published = await this.prisma.article.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });

    await this.redis.del(`article:${article.slug}`);
    await this.redis.delPattern('homepage:*');
    await this.redis.delPattern(`category:${article.category?.slug}:*`);

    return published;
  }

  async archive(id: string) {
    const article = await this.findById(id);
    const archived = await this.prisma.article.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    await this.redis.del(`article:${article.slug}`);
    return archived;
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
