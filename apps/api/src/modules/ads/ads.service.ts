import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AdStatus, AdEventType } from '@repo/database';
import {
  CreateAdDto,
  UpdateAdDto,
  ApproveAdDto,
  CreateAdvertiserDto,
  UpdateAdvertiserDto,
  CreateCampaignDto,
  UpdateCampaignDto,
  RecordAdEventDto,
  AdsQueryDto,
  ActiveAdsQueryDto,
  AdStatsQueryDto,
} from './dto/ads.dto';
import * as crypto from 'crypto';

@Injectable()
export class AdsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  // ─── Advertisers ────────────────────────────────────────────────────────────

  async listAdvertisers() {
    return this.prisma.advertiser.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { ads: true, campaigns: true } } },
    });
  }

  async createAdvertiser(dto: CreateAdvertiserDto) {
    return this.prisma.advertiser.create({ data: dto });
  }

  async updateAdvertiser(id: string, dto: UpdateAdvertiserDto) {
    await this.requireAdvertiser(id);
    return this.prisma.advertiser.update({ where: { id }, data: dto });
  }

  // ─── Campaigns ──────────────────────────────────────────────────────────────

  async listCampaigns(advertiserId?: string) {
    return this.prisma.adCampaign.findMany({
      where: advertiserId ? { advertiserId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        advertiser: { select: { id: true, name: true } },
        _count: { select: { ads: true } },
      },
    });
  }

  async createCampaign(dto: CreateCampaignDto) {
    await this.requireAdvertiser(dto.advertiserId);
    return this.prisma.adCampaign.create({
      data: {
        name: dto.name,
        advertiserId: dto.advertiserId,
        budget: dto.budget,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        notes: dto.notes,
      },
    });
  }

  async updateCampaign(id: string, dto: UpdateCampaignDto) {
    const campaign = await this.prisma.adCampaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return this.prisma.adCampaign.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  // ─── Ads CRUD ───────────────────────────────────────────────────────────────

  async listAds(query: AdsQueryDto) {
    const { page = 1, limit = 25, status, advertiserId, placement, q } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where['status'] = status;
    if (advertiserId) where['advertiserId'] = advertiserId;
    if (placement) where['placement'] = placement;
    if (q) {
      where['OR'] = [
        { title: { contains: q, mode: 'insensitive' } },
        { advertiser: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [ads, total] = await Promise.all([
      this.prisma.ad.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          advertiser: { select: { id: true, name: true } },
          campaign: { select: { id: true, name: true } },
        },
      }),
      this.prisma.ad.count({ where }),
    ]);

    return {
      data: ads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAd(id: string) {
    const ad = await this.prisma.ad.findUnique({
      where: { id },
      include: {
        advertiser: true,
        campaign: true,
        dailyStats: { orderBy: { date: 'desc' }, take: 30 },
      },
    });
    if (!ad) throw new NotFoundException('Ad not found');
    return ad;
  }

  async createAd(dto: CreateAdDto) {
    await this.requireAdvertiser(dto.advertiserId);

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end <= start)
      throw new BadRequestException('endDate must be after startDate');

    return this.prisma.ad.create({
      data: {
        title: dto.title,
        advertiserId: dto.advertiserId,
        campaignId: dto.campaignId,
        imageUrl: dto.imageUrl,
        videoUrl: dto.videoUrl,
        altText: dto.altText,
        type: dto.type as any,
        placement: dto.placement as any,
        deviceTarget: (dto.deviceTarget ?? 'ALL') as any,
        categoryTargets: dto.categoryTargets ?? [],
        pageTargets: dto.pageTargets ?? [],
        destinationUrl: dto.destinationUrl,
        trackingUrl: dto.trackingUrl,
        utmSource: dto.utmSource,
        utmMedium: dto.utmMedium,
        utmCampaign: dto.utmCampaign,
        startDate: start,
        endDate: end,
        totalDays: dto.totalDays,
        popupDelaySec: dto.popupDelaySec ?? 0,
        popupHomepageOnly: dto.popupHomepageOnly ?? false,
        priority: dto.priority ?? 5,
        weight: dto.weight ?? 100,
        maxImpressionsPerDay: dto.maxImpressionsPerDay,
        maxTotalImpressions: dto.maxTotalImpressions,
        maxClicks: dto.maxClicks,
        status: 'PENDING',
      },
      include: {
        advertiser: { select: { id: true, name: true } },
      },
    });
  }

  async updateAd(id: string, dto: UpdateAdDto) {
    await this.getAd(id); // ensures it exists
    await this.invalidateAdCache();

    return this.prisma.ad.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        type: dto.type as any,
        placement: dto.placement as any,
        deviceTarget: dto.deviceTarget as any,
      },
    });
  }

  async approveAd(id: string, dto: ApproveAdDto) {
    await this.getAd(id);
    await this.invalidateAdCache();

    return this.prisma.ad.update({
      where: { id },
      data: {
        status: dto.status as AdStatus,
        rejectionReason: dto.status === 'REJECTED' ? dto.rejectionReason : null,
      },
    });
  }

  async toggleAd(id: string) {
    const ad = await this.getAd(id);
    await this.invalidateAdCache();
    return this.prisma.ad.update({
      where: { id },
      data: { isEnabled: !ad.isEnabled },
    });
  }

  async deleteAd(id: string) {
    await this.getAd(id);
    await this.invalidateAdCache();
    return this.prisma.ad.delete({ where: { id } });
  }

  // ─── Public: fetch active ads by placement ───────────────────────────────────

  async getActiveAds(query: ActiveAdsQueryDto) {
    const { placement, device, category, page: pagePath } = query;
    const now = new Date();

    // Cache key covers placement + device only — stable per request type.
    // Category/page/limit filters are applied after cache since they vary per request.
    const cacheKey = `ads:active:${placement}:${device ?? 'ALL'}`;

    const candidates = await this.redis.getOrSet(
      cacheKey,
      async () => {
        const ads = await this.prisma.ad.findMany({
          where: {
            placement: placement as any,
            status: 'APPROVED',
            isEnabled: true,
            startDate: { lte: now },
            endDate: { gte: now },
          },
          orderBy: [{ priority: 'desc' }, { weight: 'desc' }],
          include: {
            advertiser: { select: { id: true, name: true } },
          },
        });

        // Device filter is stable per cache key — safe to cache
        return ads.filter((ad) => {
          if (ad.deviceTarget === 'ALL') return true;
          if (device && ad.deviceTarget === device) return true;
          return !device;
        });
      },
      30, // 30 second TTL
    );

    // Apply per-request filters outside the cache
    const filtered = (candidates as typeof candidates).filter((ad) => {
      // Category targeting: empty = show everywhere
      if (ad.categoryTargets.length && !(category && ad.categoryTargets.includes(category))) {
        return false;
      }
      // Page targeting: empty = show everywhere
      if (ad.pageTargets.length && !(pagePath && ad.pageTargets.some((p) => pagePath.startsWith(p)))) {
        return false;
      }
      // Global impression/click caps
      if (ad.maxTotalImpressions && ad.totalImpressions >= ad.maxTotalImpressions) return false;
      if (ad.maxClicks && ad.totalClicks >= ad.maxClicks) return false;
      return true;
    });

    return this.weightedSort(filtered);
  }

  // ─── Event tracking ──────────────────────────────────────────────────────────

  async recordEvent(adId: string, dto: RecordAdEventDto, ipAddress?: string) {
    const ad = await this.prisma.ad.findUnique({ where: { id: adId } });
    if (!ad || ad.status !== 'APPROVED' || !ad.isEnabled) return;

    const ipHash = ipAddress
      ? crypto.createHash('sha256').update(ipAddress).digest('hex')
      : undefined;

    const eventType = dto.type as AdEventType;
    const today = this.todayDate();

    await Promise.all([
      // Insert individual event
      this.prisma.adEvent.create({
        data: {
          adId,
          type: eventType,
          sessionId: dto.sessionId,
          ipHash,
          userAgent: undefined,
          deviceType: dto.deviceType,
          referer: dto.referer,
        },
      }),
      // Upsert daily stat row
      this.prisma.adDailyStat.upsert({
        where: { adId_date: { adId, date: today } },
        create: {
          adId,
          date: today,
          impressions: eventType === 'IMPRESSION' ? 1 : 0,
          clicks: eventType === 'CLICK' ? 1 : 0,
        },
        update: {
          impressions:
            eventType === 'IMPRESSION' ? { increment: 1 } : undefined,
          clicks: eventType === 'CLICK' ? { increment: 1 } : undefined,
        },
      }),
      // Update denormalized counters on Ad
      this.prisma.ad.update({
        where: { id: adId },
        data: {
          totalImpressions:
            eventType === 'IMPRESSION' ? { increment: 1 } : undefined,
          totalClicks: eventType === 'CLICK' ? { increment: 1 } : undefined,
        },
      }),
      // Fire tracking pixel URL if set (fire-and-forget)
      ad.trackingUrl && eventType === 'IMPRESSION'
        ? fetch(ad.trackingUrl, { method: 'GET' }).catch(() => null)
        : Promise.resolve(),
    ]);
  }

  // ─── Analytics ───────────────────────────────────────────────────────────────

  async getAdStats(adId: string, query: AdStatsQueryDto) {
    await this.getAd(adId);

    const where: Record<string, unknown> = { adId };
    if (query.from || query.to) {
      where['date'] = {
        ...(query.from && { gte: new Date(query.from) }),
        ...(query.to && { lte: new Date(query.to) }),
      };
    }

    const dailyStats = await this.prisma.adDailyStat.findMany({
      where,
      orderBy: { date: 'asc' },
    });

    const totals = dailyStats.reduce(
      (acc, s) => ({
        impressions: acc.impressions + s.impressions,
        clicks: acc.clicks + s.clicks,
      }),
      { impressions: 0, clicks: 0 },
    );

    return {
      daily: dailyStats,
      totals,
      ctr:
        totals.impressions > 0
          ? +((totals.clicks / totals.impressions) * 100).toFixed(2)
          : 0,
    };
  }

  async getDashboardStats() {
    const now = new Date();
    const today = this.todayDate();

    const [totalAds, activeAds, pendingAds, todayStats, topAds] =
      await Promise.all([
        this.prisma.ad.count(),
        this.prisma.ad.count({
          where: {
            status: 'APPROVED',
            isEnabled: true,
            startDate: { lte: now },
            endDate: { gte: now },
          },
        }),
        this.prisma.ad.count({ where: { status: 'PENDING' } }),
        this.prisma.adDailyStat.aggregate({
          where: { date: today },
          _sum: { impressions: true, clicks: true },
        }),
        this.prisma.ad.findMany({
          where: { status: 'APPROVED' },
          orderBy: { totalImpressions: 'desc' },
          take: 5,
          include: { advertiser: { select: { name: true } } },
        }),
      ]);

    const todayImpressions = todayStats._sum.impressions ?? 0;
    const todayClicks = todayStats._sum.clicks ?? 0;

    return {
      totalAds,
      activeAds,
      pendingAds,
      today: {
        impressions: todayImpressions,
        clicks: todayClicks,
        ctr:
          todayImpressions > 0
            ? +((todayClicks / todayImpressions) * 100).toFixed(2)
            : 0,
      },
      topAds: topAds?.map((ad) => ({
        id: ad.id,
        title: ad.title,
        advertiserName: ad.advertiser.name,
        totalImpressions: ad.totalImpressions,
        totalClicks: ad.totalClicks,
        ctr:
          ad.totalImpressions > 0
            ? +((ad.totalClicks / ad.totalImpressions) * 100).toFixed(2)
            : 0,
      })),
    };
  }

  async flushCache() {
    await this.redis.delPattern('ads:active:*');
  }

  // ─── Scheduled: expire ads ───────────────────────────────────────────────────

  async expireOverdueAds() {
    const now = new Date();
    const result = await this.prisma.ad.updateMany({
      where: {
        status: 'APPROVED',
        endDate: { lt: now },
      },
      data: { status: 'EXPIRED' },
    });
    if (result.count > 0) {
      await this.invalidateAdCache();
    }
    return result.count;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async requireAdvertiser(id: string) {
    const advertiser = await this.prisma.advertiser.findUnique({
      where: { id },
    });
    if (!advertiser) throw new NotFoundException('Advertiser not found');
    return advertiser;
  }

  private async invalidateAdCache() {
    await this.redis.delPattern('ads:active:*');
  }

  private todayDate(): Date {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  private weightedSort<T extends { weight: number; priority: number }>(
    ads: T[],
  ): T[] {
    if (ads.length <= 1) return ads;

    // Sort by priority desc, then shuffle within same-priority groups using weight
    return [...ads].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      // Within same priority, use weighted random
      return Math.random() * b.weight - Math.random() * a.weight;
    });
  }
}
