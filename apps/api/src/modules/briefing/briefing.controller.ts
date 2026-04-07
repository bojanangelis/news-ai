import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BriefingService } from './briefing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Briefing')
@Controller('briefing')
export class BriefingController {
  constructor(private readonly svc: BriefingService) {}

  @Public()
  @Get('today')
  @ApiOperation({ summary: "Get today's daily briefing (top 10 articles)" })
  async getToday() {
    const briefing = await this.svc.getTodayBriefing();
    return { data: briefing };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post('generate')
  @ApiOperation({ summary: 'Admin: manually trigger daily briefing generation' })
  async generate() {
    const result = await this.svc.buildBriefing();
    return { data: result };
  }
}
