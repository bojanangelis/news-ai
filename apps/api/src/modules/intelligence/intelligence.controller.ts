import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  Res,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { IntelligenceService, ChatMessage } from './intelligence.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Intelligence')
@Controller()
export class IntelligenceController {
  constructor(private readonly svc: IntelligenceService) {}

  // GET /v1/articles/:id/intelligence — public with optional JWT for premium check
  @Public()
  @Get('articles/:id/intelligence')
  @ApiOperation({ summary: 'Get AI intelligence analysis for an article (free: preview, premium: full)' })
  async getIntelligence(@Param('id') articleId: string, @Req() req: Request) {
    const user = (req as any).user as JwtPayload | undefined;
    const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'EDITOR'];
    const isPremium = user?.isPremium || (user?.role ? adminRoles.includes(user.role) : false);
    return this.svc.getIntelligence(articleId, isPremium);
  }

  // POST /v1/articles/:id/chat — premium only, streaming SSE
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('articles/:id/chat')
  @ApiOperation({ summary: 'Chat with AI about an article (premium only, streaming)' })
  async chat(
    @Param('id') articleId: string,
    @Body() body: { message: string; history?: ChatMessage[] },
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    if (!user.isPremium) {
      throw new ForbiddenException({
        code: 'PREMIUM_REQUIRED',
        message: 'AI Chat is a premium feature.',
        upgradeUrl: '/premium',
      });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
    res.flushHeaders();

    const message = (body.message ?? '').slice(0, 500);
    const history = (body.history ?? []).slice(-10) as ChatMessage[]; // keep last 10 messages for context

    await this.svc.streamChat(articleId, message, history, user.sub, res);
  }

  // POST /v1/articles/:id/intelligence/generate — admin trigger
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'EDITOR')
  @Post('articles/:id/intelligence/generate')
  @ApiOperation({ summary: 'Admin: manually trigger intelligence generation for an article' })
  async generate(@Param('id') articleId: string) {
    const record = await this.svc.generateAndStore(articleId);
    return { data: record };
  }
}
