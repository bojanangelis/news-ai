import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsString, IsUrl, IsInt, IsOptional, IsBoolean, Min, Max, IsIn } from 'class-validator';
import { AdminService } from './admin.service';
import { ScrapingService } from './scraping.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

class CreateScrapingSourceDto {
  @IsString()
  name!: string;

  @IsUrl({ require_protocol: true })
  url!: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  scrapeIntervalMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxPagesPerRun?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxArticlesPerRun?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  defaultCategoryId?: string;
}

class UpdateScrapingSourceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  url?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  scrapeIntervalMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxPagesPerRun?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxArticlesPerRun?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(['PENDING', 'ACTIVE', 'ERROR', 'PAUSED'])
  status?: string;

  @IsOptional()
  @IsString()
  errorMessage?: string;

  @IsOptional()
  @IsString()
  defaultCategoryId?: string;
}

@ApiTags('admin')
@Controller({ path: 'admin/scraping-sources', version: '1' })
export class AdminScrapingController {
  constructor(
    private adminService: AdminService,
    private scrapingService: ScrapingService,
  ) {}

  @Roles('SUPER_ADMIN', 'EDITOR')
  @Get()
  findAll() {
    return this.adminService.findAllScrapingSources();
  }

  @Roles('SUPER_ADMIN', 'EDITOR')
  @Get('health')
  getHealth() {
    return this.scrapingService.getHealth();
  }

  @Roles('SUPER_ADMIN', 'EDITOR')
  @Post()
  create(@Body() dto: CreateScrapingSourceDto, @CurrentUser() admin: JwtPayload) {
    return this.adminService.createScrapingSource(dto, admin.sub);
  }

  @Roles('SUPER_ADMIN', 'EDITOR')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateScrapingSourceDto, @CurrentUser() admin: JwtPayload) {
    return this.adminService.updateScrapingSource(id, dto, admin.sub);
  }

  @Roles('SUPER_ADMIN', 'EDITOR')
  @Post(':id/toggle')
  toggle(@Param('id') id: string, @CurrentUser() admin: JwtPayload) {
    return this.adminService.toggleScrapingSource(id, admin.sub);
  }

  @Roles('SUPER_ADMIN', 'EDITOR')
  @Post(':id/scrape')
  scrapeNow(@Param('id') id: string) {
    return this.scrapingService.scrapeNow(id);
  }

  @Roles('SUPER_ADMIN', 'EDITOR')
  @Post('scrape-all')
  async scrapeAll() {
    return this.adminService.scrapeAllActive(this.scrapingService);
  }

  @Roles('SUPER_ADMIN', 'EDITOR')
  @Post('recategorize')
  async recategorize() {
    return this.scrapingService.recategorizeAll();
  }

  @Roles('SUPER_ADMIN', 'EDITOR')
  @Post('backfill-images')
  async backfillImages(@Query('limit') limit = 100) {
    return this.scrapingService.backfillImages(+limit);
  }

  @Roles('SUPER_ADMIN', 'EDITOR')
  @Get(':id/logs')
  getLogs(@Param('id') id: string, @Query('limit') limit = 20) {
    return this.scrapingService.getLogs(id, +limit);
  }

  @Roles('SUPER_ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() admin: JwtPayload) {
    return this.adminService.deleteScrapingSource(id, admin.sub);
  }
}
