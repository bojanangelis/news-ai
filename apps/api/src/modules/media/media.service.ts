import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from './s3.service';

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService, private s3: S3Service) {}

  async upload(file: Express.Multer.File, altText?: string, uploadedById?: string) {
    const { key, url } = await this.s3.upload(file);

    const asset = await this.prisma.mediaAsset.create({
      data: {
        url,
        s3Key: key,
        altText,
        mimeType: file.mimetype,
        size: file.size,
        type: 'IMAGE',
        uploadedById,
      },
    });

    return asset;
  }

  findAll(page = 1, limit = 40) {
    const skip = (page - 1) * limit;
    return this.prisma.mediaAsset.findMany({
      where: { type: 'IMAGE' },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(id: string) {
    const asset = await this.prisma.mediaAsset.findUniqueOrThrow({ where: { id } });
    await this.s3.delete(asset.s3Key);
    await this.prisma.mediaAsset.delete({ where: { id } });
  }
}
