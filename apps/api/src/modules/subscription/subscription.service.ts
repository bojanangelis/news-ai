import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

const TRIAL_DAYS = 7;
const MONTHLY_PRICE_MKD = 199;
const YEARLY_PRICE_MKD = 1490;

@Injectable()
export class SubscriptionService {
  constructor(
    private prisma: PrismaService,
    private authService: AuthService,
  ) {}

  async getStatus(userId: string) {
    const sub = await this.prisma.premiumSubscription.findUnique({
      where: { userId },
    });

    if (!sub) return { isPremium: false, status: null, plan: null, expiresAt: null };

    const isPremium = this.authService.checkIsPremium(sub);
    const daysLeft = sub.currentPeriodEnd
      ? Math.max(0, Math.ceil((sub.currentPeriodEnd.getTime() - Date.now()) / 86_400_000))
      : null;

    const trialDaysLeft =
      sub.status === 'TRIALING' && sub.trialEndsAt
        ? Math.max(0, Math.ceil((sub.trialEndsAt.getTime() - Date.now()) / 86_400_000))
        : null;

    return {
      isPremium,
      status: sub.status,
      plan: sub.planType,
      expiresAt: sub.currentPeriodEnd,
      trialEndsAt: sub.trialEndsAt,
      daysLeft,
      trialDaysLeft,
      cancelledAt: sub.cancelledAt,
    };
  }

  async startTrial(userId: string) {
    const existing = await this.prisma.premiumSubscription.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('User already has a subscription');

    const now = new Date();
    const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 86_400_000);

    const sub = await this.prisma.premiumSubscription.create({
      data: {
        userId,
        status: 'TRIALING',
        planType: 'monthly',
        trialEndsAt: trialEnd,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
      },
    });

    return { message: `Your ${TRIAL_DAYS}-day free trial has started.`, trialEndsAt: sub.trialEndsAt };
  }

  async cancelSubscription(userId: string) {
    const sub = await this.prisma.premiumSubscription.findUnique({ where: { userId } });
    if (!sub) throw new NotFoundException('No active subscription');
    if (sub.cancelledAt) throw new ConflictException('Subscription already cancelled');

    return this.prisma.premiumSubscription.update({
      where: { userId },
      data: { cancelledAt: new Date(), status: 'CANCELLED' },
    });
  }

  // ─── Admin: manual subscription management ───────────────────────────────────

  async adminActivate(userId: string, planType: 'monthly' | 'yearly', months = 1) {
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + (planType === 'yearly' ? 12 : months));

    return this.prisma.premiumSubscription.upsert({
      where: { userId },
      create: {
        userId,
        status: 'ACTIVE',
        planType,
        currentPeriodStart: now,
        currentPeriodEnd: end,
      },
      update: {
        status: 'ACTIVE',
        planType,
        currentPeriodStart: now,
        currentPeriodEnd: end,
        cancelledAt: null,
      },
    });
  }

  async listSubscriptions(page = 1, limit = 25) {
    const skip = (page - 1) * limit;
    const [subs, total] = await Promise.all([
      this.prisma.premiumSubscription.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, email: true, name: true } } },
      }),
      this.prisma.premiumSubscription.count(),
    ]);
    return { data: subs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  getPricing() {
    return {
      monthly: { price: MONTHLY_PRICE_MKD, currency: 'MKD', label: '199 МКД / месец' },
      yearly: {
        price: YEARLY_PRICE_MKD,
        currency: 'MKD',
        label: '1.490 МКД / година',
        perDay: Math.round((YEARLY_PRICE_MKD / 365) * 10) / 10,
        savingsVsMonthly: MONTHLY_PRICE_MKD * 12 - YEARLY_PRICE_MKD,
        freeMonthsEquivalent: +((MONTHLY_PRICE_MKD * 12 - YEARLY_PRICE_MKD) / MONTHLY_PRICE_MKD).toFixed(1),
      },
      trialDays: TRIAL_DAYS,
    };
  }
}
