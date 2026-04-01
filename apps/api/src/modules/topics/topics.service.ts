import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TopicsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId?: string) {
    return this.prisma.topic.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { topicFollows: true } },
        ...(userId && { topicFollows: { where: { userId } } }),
      },
    });
  }

  async follow(topicId: string, userId: string) {
    const topic = await this.prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic) throw new NotFoundException('Topic not found');

    try {
      return await this.prisma.topicFollow.create({ data: { topicId, userId } });
    } catch {
      throw new ConflictException('Already following this topic');
    }
  }

  async unfollow(topicId: string, userId: string) {
    await this.prisma.topicFollow.delete({
      where: { userId_topicId: { userId, topicId } },
    });
  }

  findFollowedTopics(userId: string) {
    return this.prisma.topicFollow.findMany({
      where: { userId },
      include: { topic: true },
    });
  }
}
