import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthorsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.author.findMany({
      include: { _count: { select: { articles: { where: { status: 'PUBLISHED' } } } } },
      orderBy: { displayName: 'asc' },
    });
  }

  async findBySlug(slug: string) {
    const author = await this.prisma.author.findUnique({
      where: { slug },
      include: { user: { select: { email: true } } },
    });
    if (!author) throw new NotFoundException('Author not found');
    return author;
  }
}
