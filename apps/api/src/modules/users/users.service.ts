import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true, email: true, name: true, avatarUrl: true,
        bio: true, role: true, createdAt: true,
        premiumSubscription: { select: { status: true, currentPeriodEnd: true } },
      },
    });
  }

  updateProfile(id: string, data: { name?: string; bio?: string; avatarUrl?: string }) {
    return this.prisma.user.update({ where: { id }, data });
  }
}
