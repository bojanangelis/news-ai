import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  findAllUsers(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    return this.prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, name: true, role: true,
        isActive: true, createdAt: true,
        _count: { select: { bookmarks: true, articleViews: true } },
      },
    });
  }

  async updateUserRole(userId: string, role: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: role as Parameters<typeof this.prisma.user.update>[0]['data']['role'] },
    });
  }

  async banUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    await this.prisma.adminAuditLog.create({
      data: {
        userId: adminId,
        action: 'user.ban',
        entityType: 'User',
        entityId: userId,
        before: { isActive: true },
        after: { isActive: false },
      },
    });

    return updated;
  }

  getAuditLog(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    return this.prisma.adminAuditLog.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } },
    });
  }

  // ─── Scraping Sources ──────────────────────────────────────────────────────

  findAllScrapingSources() {
    return this.prisma.scrapingSource.findMany({
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { name: true, email: true } } },
    });
  }

  async createScrapingSource(
    dto: { name: string; url: string; scrapeIntervalMinutes?: number; notes?: string; defaultCategoryId?: string },
    adminId: string,
  ) {
    const existing = await this.prisma.scrapingSource.findUnique({ where: { url: dto.url } });
    if (existing) throw new ConflictException('A source with this URL already exists');

    return this.prisma.scrapingSource.create({
      data: {
        name: dto.name,
        url: dto.url,
        scrapeIntervalMinutes: dto.scrapeIntervalMinutes ?? 60,
        notes: dto.notes,
        defaultCategoryId: dto.defaultCategoryId ?? null,
        createdById: adminId,
      },
      include: { createdBy: { select: { name: true, email: true } } },
    });
  }

  async updateScrapingSource(
    id: string,
    dto: { name?: string; url?: string; isActive?: boolean; scrapeIntervalMinutes?: number; notes?: string; status?: string; errorMessage?: string; defaultCategoryId?: string },
  ) {
    const source = await this.prisma.scrapingSource.findUnique({ where: { id } });
    if (!source) throw new NotFoundException('Scraping source not found');

    return this.prisma.scrapingSource.update({
      where: { id },
      data: dto as Parameters<typeof this.prisma.scrapingSource.update>[0]['data'],
      include: { createdBy: { select: { name: true, email: true } } },
    });
  }

  async toggleScrapingSource(id: string) {
    const source = await this.prisma.scrapingSource.findUnique({ where: { id } });
    if (!source) throw new NotFoundException('Scraping source not found');

    return this.prisma.scrapingSource.update({
      where: { id },
      data: { isActive: !source.isActive },
    });
  }

  async deleteScrapingSource(id: string) {
    const source = await this.prisma.scrapingSource.findUnique({ where: { id } });
    if (!source) throw new NotFoundException('Scraping source not found');

    await this.prisma.scrapingSource.delete({ where: { id } });
    return { deleted: true };
  }

  async logAction(
    userId: string,
    action: string,
    entityType: string,
    entityId?: string,
    before?: unknown,
    after?: unknown,
  ) {
    return this.prisma.adminAuditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        before: before as Parameters<typeof this.prisma.adminAuditLog.create>[0]['data']['before'],
        after: after as Parameters<typeof this.prisma.adminAuditLog.create>[0]['data']['after'],
      },
    });
  }
}
