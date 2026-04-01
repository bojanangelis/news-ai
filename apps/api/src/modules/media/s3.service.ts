import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as path from 'path';

@Injectable()
export class S3Service {
  private s3: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor(private config: ConfigService) {
    this.s3 = new S3Client({
      endpoint: config.get<string>('s3.endpoint'),
      region: config.get<string>('s3.region'),
      credentials: {
        accessKeyId: config.get<string>('s3.accessKeyId') ?? '',
        secretAccessKey: config.get<string>('s3.secretAccessKey') ?? '',
      },
      forcePathStyle: true, // required for MinIO
    });
    this.bucket = config.get<string>('s3.bucketName') ?? 'newsplus-media';
    this.publicUrl = config.get<string>('s3.publicUrl') ?? '';
  }

  async upload(file: Express.Multer.File, folder = 'media'): Promise<{ key: string; url: string }> {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const key = `${folder}/${randomUUID()}${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000',
      }),
    );

    return { key, url: `${this.publicUrl}/${key}` };
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
