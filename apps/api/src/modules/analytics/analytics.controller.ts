import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('analytics')
@Controller({ path: 'analytics', version: '1' })
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Roles('EDITOR', 'ANALYST', 'SUPER_ADMIN')
  @Get('dashboard')
  getDashboard() {
    return this.analyticsService.getDashboardStats();
  }

  @Roles('EDITOR', 'ANALYST', 'SUPER_ADMIN')
  @Get('top-articles')
  getTopArticles(@Query('days') days = 7, @Query('limit') limit = 20) {
    return this.analyticsService.getTopArticles(+days, +limit);
  }
}
