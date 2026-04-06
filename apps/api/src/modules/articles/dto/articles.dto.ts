import {
  IsString, IsBoolean, IsOptional, IsEnum, IsArray, IsInt,
  IsUrl, Min, Max, MinLength, MaxLength, ValidateNested, IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class ArticleSectionDto {
  @IsEnum(['PARAGRAPH', 'HEADING', 'QUOTE', 'IMAGE', 'EMBED', 'CODE', 'DIVIDER', 'LIST'])
  type!: string;

  @IsInt() @Min(0)
  order!: number;

  @IsOptional() @IsString()
  content?: string;

  @IsOptional() @IsInt() @Min(1) @Max(6)
  level?: number;

  @IsOptional() @IsString()
  url?: string;

  @IsOptional() @IsString()
  caption?: string;

  @IsOptional() @IsString()
  attribution?: string;

  @IsOptional() @IsString()
  language?: string;

  @IsOptional() @IsString()
  mediaAssetId?: string;
}

export class CreateArticleDto {
  @ApiProperty()
  @IsString() @MinLength(5) @MaxLength(300)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  slug?: string;

  @ApiProperty()
  @IsString() @MinLength(10) @MaxLength(500)
  excerpt!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  coverImageId?: string;

  @ApiProperty()
  @IsString()
  categoryId!: string;

  @ApiProperty()
  @IsString()
  authorId!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  tagIds?: string[];

  @ApiProperty({ type: [ArticleSectionDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => ArticleSectionDto)
  sections!: ArticleSectionDto[];

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isPremium?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isBreaking?: boolean;

  @ApiPropertyOptional({ enum: ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'] })
  @IsOptional() @IsEnum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED'])
  status?: string;
}

export class UpdateArticleDto extends PartialType(CreateArticleDto) {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  ogImageUrl?: string;
}

export class ArticlesQueryDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(100)
  limit?: number = 20;

  @IsOptional() @IsString()
  category?: string;

  @IsOptional() @IsEnum(['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED', 'ALL'])
  status?: string = 'PUBLISHED';

  @IsOptional() @IsString()
  authorSlug?: string;

  @IsOptional() @IsString()
  q?: string;

  @IsOptional() @Type(() => Boolean) @IsBoolean()
  isBreaking?: boolean;

  @IsOptional() @IsEnum(['manual', 'scraped'])
  source?: string;
}
