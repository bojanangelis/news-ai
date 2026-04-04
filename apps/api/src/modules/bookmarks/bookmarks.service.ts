import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookmarksService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const bookmarks = await this.prisma.bookmark.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        article: {
          include: { author: true, category: true, coverImage: true },
        },
      },
    });
    return bookmarks.map((b) => ({
      ...b,
      article: b.article
        ? { ...b.article, author: { ...b.article.author, name: b.article.author.displayName } }
        : b.article,
    }));
  }

  async create(userId: string, articleId: string) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId } });
    if (!article) throw new NotFoundException('Article not found');

    try {
      const bookmark = await this.prisma.bookmark.create({ data: { userId, articleId } });
      await this.prisma.article.update({
        where: { id: articleId },
        data: { bookmarkCount: { increment: 1 } },
      });
      return bookmark;
    } catch {
      throw new ConflictException('Article already bookmarked');
    }
  }

  async remove(userId: string, articleId: string) {
    await this.prisma.bookmark.delete({
      where: { userId_articleId: { userId, articleId } },
    });
    await this.prisma.article.update({
      where: { id: articleId },
      data: { bookmarkCount: { decrement: 1 } },
    });
  }
}
