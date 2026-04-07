import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdsService } from './ads.service';
import {
  CreateAdDto, UpdateAdDto, ApproveAdDto, AdsQueryDto, AdStatsQueryDto,
  CreateAdvertiserDto, UpdateAdvertiserDto,
  CreateCampaignDto, UpdateCampaignDto,
} from './dto/ads.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin - Ads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'EDITOR')
@Controller('admin/ads')
export class AdminAdsController {
  constructor(private readonly adsService: AdsService) {}

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Ad system dashboard stats' })
  async getDashboard() {
    return { data: await this.adsService.getDashboardStats() };
  }

  // ─── Advertisers ─────────────────────────────────────────────────────────────

  @Get('advertisers')
  async listAdvertisers() {
    return { data: await this.adsService.listAdvertisers() };
  }

  @Post('advertisers')
  async createAdvertiser(@Body() dto: CreateAdvertiserDto) {
    return { data: await this.adsService.createAdvertiser(dto) };
  }

  @Patch('advertisers/:id')
  async updateAdvertiser(@Param('id') id: string, @Body() dto: UpdateAdvertiserDto) {
    return { data: await this.adsService.updateAdvertiser(id, dto) };
  }

  // ─── Campaigns ───────────────────────────────────────────────────────────────

  @Get('campaigns')
  async listCampaigns(@Query('advertiserId') advertiserId?: string) {
    return { data: await this.adsService.listCampaigns(advertiserId) };
  }

  @Post('campaigns')
  async createCampaign(@Body() dto: CreateCampaignDto) {
    return { data: await this.adsService.createCampaign(dto) };
  }

  @Patch('campaigns/:id')
  async updateCampaign(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return { data: await this.adsService.updateCampaign(id, dto) };
  }

  // ─── Ads ─────────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all ads with filters' })
  async listAds(@Query() query: AdsQueryDto) {
    return this.adsService.listAds(query);
  }

  @Get(':id')
  async getAd(@Param('id') id: string) {
    return { data: await this.adsService.getAd(id) };
  }

  @Post()
  async createAd(@Body() dto: CreateAdDto) {
    return { data: await this.adsService.createAd(dto) };
  }

  @Patch(':id')
  async updateAd(@Param('id') id: string, @Body() dto: UpdateAdDto) {
    return { data: await this.adsService.updateAd(id, dto) };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Approve, reject, or pause an ad' })
  async approveAd(@Param('id') id: string, @Body() dto: ApproveAdDto) {
    return { data: await this.adsService.approveAd(id, dto) };
  }

  @Post(':id/toggle')
  @ApiOperation({ summary: 'Enable or disable an ad' })
  async toggleAd(@Param('id') id: string) {
    return { data: await this.adsService.toggleAd(id) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAd(@Param('id') id: string) {
    await this.adsService.deleteAd(id);
  }

  // ─── Report token ─────────────────────────────────────────────────────────────

  @Post(':id/report-token')
  @ApiOperation({ summary: 'Generate (or regenerate) a shareable read-only report link token' })
  async generateReportToken(@Param('id') id: string) {
    return { data: await this.adsService.generateReportToken(id) };
  }

  // ─── Cache flush (dev/admin use) ─────────────────────────────────────────────

  @Post('flush-cache')
  @ApiOperation({ summary: 'Flush all active ad caches (use after bulk changes)' })
  async flushCache() {
    await this.adsService.flushCache();
    return { data: { flushed: true } };
  }

  // ─── Analytics ───────────────────────────────────────────────────────────────

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get daily stats for a specific ad' })
  async getAdStats(@Param('id') id: string, @Query() query: AdStatsQueryDto) {
    return { data: await this.adsService.getAdStats(id, query) };
  }
}
