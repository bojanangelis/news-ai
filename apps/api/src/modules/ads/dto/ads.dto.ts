import {
  IsString, IsOptional, IsEnum, IsBoolean, IsInt, IsArray,
  IsUrl, Min, Max, MinLength, IsDateString, IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum AdTypeEnum {
  POPUP = 'POPUP',
  TOP_BANNER = 'TOP_BANNER',
  INLINE_FEED = 'INLINE_FEED',
  SIDEBAR = 'SIDEBAR',
  STICKY_BOTTOM = 'STICKY_BOTTOM',
  SPONSORED_CARD = 'SPONSORED_CARD',
  FULL_SCREEN_TAKEOVER = 'FULL_SCREEN_TAKEOVER',
}

export enum AdPlacementEnum {
  POPUP = 'POPUP',
  TOP_BANNER = 'TOP_BANNER',
  SIDEBAR_RIGHT = 'SIDEBAR_RIGHT',
  FEED_INLINE = 'FEED_INLINE',
  STICKY_BOTTOM = 'STICKY_BOTTOM',
  ARTICLE_INLINE = 'ARTICLE_INLINE',
  SPONSORED_CARD = 'SPONSORED_CARD',
  FULL_SCREEN_TAKEOVER = 'FULL_SCREEN_TAKEOVER',
}

export enum AdStatusEnum {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAUSED = 'PAUSED',
  EXPIRED = 'EXPIRED',
}

export enum AdDeviceTargetEnum {
  ALL = 'ALL',
  DESKTOP = 'DESKTOP',
  MOBILE = 'MOBILE',
}

// ─── Advertiser DTOs ──────────────────────────────────────────────────────────

export class CreateAdvertiserDto {
  @ApiProperty() @IsString() @MinLength(2)
  name!: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  contactName?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  email?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  phone?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  website?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string;
}

export class UpdateAdvertiserDto extends PartialType(CreateAdvertiserDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isActive?: boolean;
}

// ─── Campaign DTOs ────────────────────────────────────────────────────────────

export class CreateCampaignDto {
  @ApiProperty() @IsString() @MinLength(2)
  name!: string;

  @ApiProperty() @IsString()
  advertiserId!: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber()
  budget?: number;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  startDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  endDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  notes?: string;
}

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isActive?: boolean;
}

// ─── Ad DTOs ──────────────────────────────────────────────────────────────────

export class CreateAdDto {
  @ApiProperty() @IsString() @MinLength(2)
  title!: string;

  @ApiProperty() @IsString()
  advertiserId!: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  campaignId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  imageUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  videoUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  altText?: string;

  @ApiProperty({ enum: AdTypeEnum })
  @IsEnum(AdTypeEnum)
  type!: AdTypeEnum;

  @ApiProperty({ enum: AdPlacementEnum })
  @IsEnum(AdPlacementEnum)
  placement!: AdPlacementEnum;

  @ApiPropertyOptional({ enum: AdDeviceTargetEnum })
  @IsOptional() @IsEnum(AdDeviceTargetEnum)
  deviceTarget?: AdDeviceTargetEnum;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  categoryTargets?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  pageTargets?: string[];

  @ApiProperty() @IsString()
  destinationUrl!: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  trackingUrl?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  utmSource?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  utmMedium?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  utmCampaign?: string;

  @ApiProperty() @IsDateString()
  startDate!: string;

  @ApiProperty() @IsDateString()
  endDate!: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1)
  totalDays?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0)
  popupDelaySec?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  popupHomepageOnly?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(10)
  priority?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1)
  weight?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1)
  maxImpressionsPerDay?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1)
  maxTotalImpressions?: number;

  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1)
  maxClicks?: number;

  @ApiPropertyOptional({ description: 'Mark as a house ad (shown as fallback when no paid ads exist)' })
  @IsOptional() @IsBoolean()
  isHouseAd?: boolean;
}

export class UpdateAdDto extends PartialType(CreateAdDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean()
  isEnabled?: boolean;
}

export class ApproveAdDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED', 'PAUSED'] })
  @IsEnum(['APPROVED', 'REJECTED', 'PAUSED'])
  status!: 'APPROVED' | 'REJECTED' | 'PAUSED';

  @ApiPropertyOptional() @IsOptional() @IsString()
  rejectionReason?: string;
}

// ─── Event DTOs ───────────────────────────────────────────────────────────────

export class RecordAdEventDto {
  @ApiProperty({ enum: ['IMPRESSION', 'CLICK'] })
  @IsEnum(['IMPRESSION', 'CLICK'])
  type!: 'IMPRESSION' | 'CLICK';

  @ApiPropertyOptional() @IsOptional() @IsString()
  sessionId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  deviceType?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  referer?: string;
}

// ─── Query DTOs ───────────────────────────────────────────────────────────────

export class AdsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number = 25;

  @IsOptional() @IsEnum(AdStatusEnum)
  status?: AdStatusEnum;

  @IsOptional() @IsString()
  advertiserId?: string;

  @IsOptional() @IsEnum(AdPlacementEnum)
  placement?: AdPlacementEnum;

  @IsOptional() @IsString()
  q?: string;
}

export class ActiveAdsQueryDto {
  @ApiProperty({ enum: AdPlacementEnum })
  @IsEnum(AdPlacementEnum)
  placement!: AdPlacementEnum;

  @ApiPropertyOptional({ enum: AdDeviceTargetEnum })
  @IsOptional() @IsEnum(AdDeviceTargetEnum)
  device?: AdDeviceTargetEnum;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  page?: string;
}

export class AdStatsQueryDto {
  @IsOptional() @IsDateString()
  from?: string;

  @IsOptional() @IsDateString()
  to?: string;
}
