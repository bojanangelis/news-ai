import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService, private redis: RedisService) {}

  findAll() {
    return this.redis.getOrSet(
      'categories:all',
      () =>
        this.prisma.category.findMany({
          where: { isActive: true },
          orderBy: { order: 'asc' },
          include: { _count: { select: { articles: { where: { status: 'PUBLISHED' } } } } },
        }),
      300,
    );
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({ where: { slug } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(data: { name: string; slug: string; description?: string; color?: string; order?: number }) {
    const category = await this.prisma.category.create({ data });
    await this.redis.del('categories:all');
    return category;
  }

  async update(id: string, data: Partial<{ name: string; description: string; color: string; order: number; isActive: boolean }>) {
    const updated = await this.prisma.category.update({ where: { id }, data });
    await this.redis.del('categories:all');
    return updated;
  }
}
