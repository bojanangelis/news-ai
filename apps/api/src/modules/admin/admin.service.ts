import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ScrapingService } from './scraping.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async findAllUsers(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, name: true, role: true,
          isActive: true, createdAt: true,
          _count: { select: { bookmarks: true, articleViews: true } },
        },
      }),
      this.prisma.user.count(),
    ]);
    return { data: users, total, totalPages: Math.ceil(total / limit) };
  }

  async createUser(
    dto: { name: string; email: string; password: string; role: string },
    adminId: string,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role as Parameters<typeof this.prisma.user.create>[0]['data']['role'],
      },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });

    this.audit(adminId, 'user.create', 'User', user.id, null, { email: user.email, role: user.role });
    return user;
  }

  private audit(userId: string, action: string, entityType: string, entityId?: string, before?: unknown, after?: unknown) {
    this.prisma.adminAuditLog.create({
      data: { userId, action, entityType, entityId, before: before as any, after: after as any },
    }).catch(() => {});
  }

  async updateUserRole(userId: string, role: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: role as Parameters<typeof this.prisma.user.update>[0]['data']['role'] },
    });
    this.audit(adminId, 'user.role_change', 'User', userId, { role: user?.role }, { role });
    return updated;
  }

  async banUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.id === adminId) throw new ConflictException('Cannot ban yourself');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    // Immediately revoke all active sessions so the ban takes effect right away
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
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

  async deleteUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.id === adminId) throw new ConflictException('Cannot delete yourself');

    // Reassign scraping sources and audit logs to the deleting admin before removing
    await this.prisma.scrapingSource.updateMany({
      where: { createdById: userId },
      data: { createdById: adminId },
    });
    await this.prisma.adminAuditLog.updateMany({
      where: { userId },
      data: { userId: adminId },
    });

    await this.prisma.user.delete({ where: { id: userId } });
    this.audit(adminId, 'user.delete', 'User', userId, { email: user.email, role: user.role }, null);
    return { deleted: true };
  }

  async unbanUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });
  }

  async getAuditLog(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } },
      }),
      this.prisma.adminAuditLog.count(),
    ]);

    return {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      entries: rows.map((r) => ({
        id: r.id,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        before: r.before,
        after: r.after,
        ipAddress: r.ipAddress,
        createdAt: r.createdAt,
        userName: r.user.name,
        userEmail: r.user.email,
      })),
    };
  }

  // ─── Scraping Sources ──────────────────────────────────────────────────────

  findAllScrapingSources() {
    return this.prisma.scrapingSource.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { name: true, email: true } },
        defaultCategory: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async createScrapingSource(
    dto: {
      name: string;
      url: string;
      scrapeIntervalMinutes?: number;
      maxPagesPerRun?: number;
      maxArticlesPerRun?: number;
      notes?: string;
      defaultCategoryId?: string;
    },
    adminId: string,
  ) {
    const existing = await this.prisma.scrapingSource.findUnique({ where: { url: dto.url } });
    if (existing) throw new ConflictException('A source with this URL already exists');

    const source = await this.prisma.scrapingSource.create({
      data: {
        name: dto.name,
        url: dto.url,
        scrapeIntervalMinutes: dto.scrapeIntervalMinutes ?? 60,
        maxPagesPerRun: dto.maxPagesPerRun ?? 1,
        maxArticlesPerRun: dto.maxArticlesPerRun ?? 50,
        notes: dto.notes,
        defaultCategoryId: dto.defaultCategoryId ?? null,
        createdById: adminId,
      },
      include: {
        createdBy: { select: { name: true, email: true } },
        defaultCategory: { select: { id: true, name: true, slug: true } },
      },
    });
    this.audit(adminId, 'scraping.create', 'ScrapingSource', source.id, null, { name: source.name, url: source.url });
    return source;
  }

  async updateScrapingSource(
    id: string,
    dto: {
      name?: string;
      url?: string;
      isActive?: boolean;
      scrapeIntervalMinutes?: number;
      maxPagesPerRun?: number;
      maxArticlesPerRun?: number;
      notes?: string;
      status?: string;
      errorMessage?: string;
      defaultCategoryId?: string;
    },
    adminId?: string,
  ) {
    const source = await this.prisma.scrapingSource.findUnique({ where: { id } });
    if (!source) throw new NotFoundException('Scraping source not found');

    const updated = await this.prisma.scrapingSource.update({
      where: { id },
      data: dto as Parameters<typeof this.prisma.scrapingSource.update>[0]['data'],
      include: {
        createdBy: { select: { name: true, email: true } },
        defaultCategory: { select: { id: true, name: true, slug: true } },
      },
    });
    if (adminId) this.audit(adminId, 'scraping.update', 'ScrapingSource', id, { name: source.name }, { ...dto });
    return updated;
  }

  async toggleScrapingSource(id: string, adminId?: string) {
    const source = await this.prisma.scrapingSource.findUnique({ where: { id } });
    if (!source) throw new NotFoundException('Scraping source not found');

    const updated = await this.prisma.scrapingSource.update({
      where: { id },
      data: { isActive: !source.isActive },
    });
    if (adminId) this.audit(adminId, 'scraping.toggle', 'ScrapingSource', id, { isActive: source.isActive }, { isActive: !source.isActive });
    return updated;
  }

  async deleteScrapingSource(id: string, adminId?: string) {
    const source = await this.prisma.scrapingSource.findUnique({ where: { id } });
    if (!source) throw new NotFoundException('Scraping source not found');

    await this.prisma.scrapingSource.delete({ where: { id } });
    if (adminId) this.audit(adminId, 'scraping.delete', 'ScrapingSource', id, { name: source.name, url: source.url }, null);
    return { deleted: true };
  }

  /** Trigger scrape for every active, non-paused source. Returns a summary. */
  async scrapeAllActive(scrapingService: ScrapingService) {
    const sources = await this.prisma.scrapingSource.findMany({
      where: { isActive: true, status: { not: 'PAUSED' } },
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    });

    const results: { id: string; name: string; status: string; articlesSaved: number }[] = [];

    for (const src of sources) {
      try {
        const res = await scrapingService.scrapeNow(src.id);
        results.push({ id: src.id, name: src.name, status: res.status, articlesSaved: res.articlesSaved });
      } catch (err) {
        results.push({ id: src.id, name: src.name, status: 'ERROR', articlesSaved: 0 });
      }
    }

    return {
      total: results.length,
      succeeded: results.filter(r => r.status !== 'ERROR').length,
      failed: results.filter(r => r.status === 'ERROR').length,
      results,
    };
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
