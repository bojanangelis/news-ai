import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { HomepageSectionType } from '@repo/database';

const ITEMS_BY_TYPE: Record<string, number> = {
  HERO: 4,
  FEATURED_GRID: 4,
  CATEGORY_ROW: 3,
  TRENDING: 8,
  EDITORS_PICK: 4,
};

const articleInclude = {
  author: true,
  category: true,
  coverImage: true,
  articleTags: { include: { tag: true } },
} as const;

@Injectable()
export class HomepageService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  private audit(userId: string, action: string, entityId?: string, before?: unknown, after?: unknown) {
    this.prisma.adminAuditLog.create({
      data: { userId, action, entityType: 'HomepageSection', entityId, before: before as any, after: after as any },
    }).catch(() => {});
  }

  private async fetchSections() {
    const sections = await this.prisma.homepageSection.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: { category: true },
    });

    return Promise.all(
      sections.map(async (section) => {
        const limit = ITEMS_BY_TYPE[section.type] ?? 4;
        const isTrending = section.type === 'TRENDING';

        const articles = await this.prisma.article.findMany({
          where: {
            status: 'PUBLISHED',
            ...(section.categoryId ? { categoryId: section.categoryId } : {}),
          },
          orderBy: isTrending ? { viewCount: 'desc' } : { publishedAt: 'desc' },
          take: limit,
          include: articleInclude,
        });

        return {
          ...section,
          categorySlug: section.category?.slug ?? null,
          items: articles.map((article, idx) => ({
            id: `${section.id}-${article.id}`,
            order: idx,
            article: {
              ...article,
              author: { ...article.author, name: article.author.displayName },
              tags: (article.articleTags ?? []).map((t) => t.tag.name),
            },
          })),
        };
      }),
    );
  }

  async getSections() {
    try {
      return await this.redis.getOrSet('homepage:sections', () => this.fetchSections(), 60);
    } catch {
      return this.fetchSections();
    }
  }

  async reorderSections(order: { id: string; order: number }[]) {
    await Promise.all(
      order.map(({ id, order }) =>
        this.prisma.homepageSection.update({ where: { id }, data: { order } }),
      ),
    );
    await this.redis.del('homepage:sections');
    return this.getSections();
  }

  async upsertSection(data: {
    id?: string;
    type: string;
    title?: string;
    order: number;
    isActive?: boolean;
    categoryId?: string;
    adminId?: string;
  }) {
    const { id, categoryId, type, adminId, ...rest } = data;
    const categoryConnect = categoryId ? { category: { connect: { id: categoryId } } } : {};

    const payload = { type: type as HomepageSectionType, ...rest, ...categoryConnect };

    const section = id
      ? await this.prisma.homepageSection.update({ where: { id }, data: payload })
      : await this.prisma.homepageSection.create({ data: payload });

    await this.redis.del('homepage:sections');
    if (adminId) this.audit(adminId, id ? 'homepage.update_section' : 'homepage.create_section', section.id, id ? rest : null, { title: section.title, type: section.type });
    return section;
  }

  async patchSection(id: string, data: { isActive?: boolean; title?: string }, adminId?: string) {
    const before = await this.prisma.homepageSection.findUnique({ where: { id }, select: { isActive: true, title: true } });
    const section = await this.prisma.homepageSection.update({ where: { id }, data });
    await this.redis.del('homepage:sections');
    if (adminId) this.audit(adminId, 'homepage.patch_section', id, before, data);
    return section;
  }

  async deleteSection(id: string, adminId?: string) {
    const before = await this.prisma.homepageSection.findUnique({ where: { id }, select: { title: true, type: true } });
    await this.prisma.homepageSection.delete({ where: { id } });
    await this.redis.del('homepage:sections');
    if (adminId) this.audit(adminId, 'homepage.delete_section', id, before, null);
    return { deleted: true };
  }

  async getSectionsAdmin() {
    const sections = await this.prisma.homepageSection.findMany({
      orderBy: { order: 'asc' },
      include: { category: true },
    });
    return sections.map((s) => ({
      id: s.id,
      type: s.type,
      title: s.title,
      order: s.order,
      isActive: s.isActive,
      categoryId: s.categoryId,
      categorySlug: s.category?.slug ?? null,
    }));
  }
}
