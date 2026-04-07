import { Controller, Get, Post, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { SummaryService } from './summary.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Summary')
@Controller()
export class SummaryController {
  constructor(private readonly svc: SummaryService) {}

  // GET /v1/articles/:id/summary — public (free tier gated)
  @Public()
  @Get('articles/:id/summary')
  @ApiOperation({ summary: 'Get AI summary for an article (free: 2/day, premium: unlimited)' })
  async getSummary(
    @Param('id') articleId: string,
    @Query('sessionId') sessionId: string | undefined,
    @Req() req: Request,
  ) {
    // Attempt to extract JWT if present (optional auth)
    const user = (req as any).user as JwtPayload | undefined;
    const userId = user?.sub ?? null;
    const isPremium = user?.isPremium ?? false;

    const summary = await this.svc.getSummary(articleId, userId, isPremium, sessionId);
    const remaining = isPremium ? null : await this.svc.getFreeTierRemaining(userId, sessionId);

    return { data: summary, meta: { isPremium, remaining } };
  }

  // GET /v1/articles/:id/summary/remaining — how many free summaries left today
  @Public()
  @Get('articles/:id/summary/remaining')
  async getRemaining(
    @Query('sessionId') sessionId: string | undefined,
    @Req() req: Request,
  ) {
    const user = (req as any).user as JwtPayload | undefined;
    const userId = user?.sub ?? null;
    const isPremium = user?.isPremium ?? false;
    const remaining = isPremium ? null : await this.svc.getFreeTierRemaining(userId, sessionId);
    return { data: { remaining, isPremium } };
  }

  // POST /v1/articles/:id/summary/generate — admin trigger
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'EDITOR')
  @Post('articles/:id/summary/generate')
  @ApiOperation({ summary: 'Admin: manually trigger summary generation for an article' })
  async generate(@Param('id') articleId: string) {
    const summary = await this.svc.generateAndStore(articleId);
    return { data: summary };
  }

  // POST /v1/admin/summary/batch — batch generate
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post('admin/summary/batch')
  @ApiOperation({ summary: 'Admin: batch generate summaries for articles without one' })
  async batchGenerate(@Query('limit') limit?: number) {
    const result = await this.svc.batchGenerate(limit ? Number(limit) : 20);
    return { data: result };
  }
}
