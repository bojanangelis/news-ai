import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { AdsService } from './ads.service';
import { ActiveAdsQueryDto, RecordAdEventDto } from './dto/ads.dto';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Ads')
@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  // ─── Public: get active ads for a placement ──────────────────────────────────

  @Public()
  @Get('active')
  @ApiOperation({ summary: 'Get active ads for a given placement' })
  async getActiveAds(@Query() query: ActiveAdsQueryDto) {
    const ads = await this.adsService.getActiveAds(query);
    return { data: ads };
  }

  // ─── Event tracking ──────────────────────────────────────────────────────────

  @Public()
  @Post(':id/event')
  @Throttle({ short: { ttl: 1000, limit: 20 }, medium: { ttl: 10000, limit: 60 } })
  @ApiOperation({ summary: 'Record an ad impression or click' })
  async recordEvent(
    @Param('id') id: string,
    @Body() dto: RecordAdEventDto,
    @Req() req: Request,
  ) {
    const ip = req.ip ?? req.socket?.remoteAddress;
    await this.adsService.recordEvent(id, dto, ip);
    return { success: true };
  }
}
