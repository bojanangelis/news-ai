import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { HomepageSectionType } from '@repo/database';

@Injectable()
export class HomepageService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  private fetchSections() {
    return this.prisma.homepageSection.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        category: true,
        items: {
          orderBy: { order: 'asc' },
          include: {
            article: {
              include: { author: true, category: true, coverImage: true },
            },
          },
        },
      },
    });
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
    articleIds: string[];
  }) {
    const { id, articleIds, categoryId, type, ...rest } = data;
    const itemsCreate = articleIds.map((articleId, idx) => ({ articleId, order: idx }));
    const categoryConnect = categoryId ? { category: { connect: { id: categoryId } } } : {};

    const section = await this.prisma.homepageSection.upsert({
      where: { id: id ?? '' },
      create: {
        type: type as HomepageSectionType,
        ...rest,
        ...categoryConnect,
        items: { create: itemsCreate },
      },
      update: {
        type: type as HomepageSectionType,
        ...rest,
        ...categoryConnect,
        items: { deleteMany: {}, create: itemsCreate },
      },
    });
    await this.redis.del('homepage:sections');
    return section;
  }
}
