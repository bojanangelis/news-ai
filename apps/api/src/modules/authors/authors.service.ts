import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthorsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const authors = await this.prisma.author.findMany({
      include: { _count: { select: { articles: { where: { status: 'PUBLISHED' } } } } },
      orderBy: { displayName: 'asc' },
    });
    return authors.map((a) => ({ ...a, name: a.displayName }));
  }

  async findBySlug(slug: string) {
    const author = await this.prisma.author.findUnique({
      where: { slug },
      include: { user: { select: { email: true } } },
    });
    if (!author) throw new NotFoundException('Author not found');
    return { ...author, name: author.displayName };
  }
}
