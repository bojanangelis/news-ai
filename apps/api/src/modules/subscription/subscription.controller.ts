import { Controller, Get, Post, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { IsString, IsIn, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class AdminActivateDto {
  @IsString() userId!: string;
  @IsIn(['monthly', 'yearly']) planType!: 'monthly' | 'yearly';
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) months?: number;
}

@ApiTags('Subscription')
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly svc: SubscriptionService) {}

  @Public()
  @Get('pricing')
  @ApiOperation({ summary: 'Get subscription pricing' })
  getPricing() {
    return { data: this.svc.getPricing() };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('status')
  @ApiOperation({ summary: 'Get current user subscription status' })
  getStatus(@CurrentUser() user: JwtPayload) {
    return this.svc.getStatus(user.sub).then((s) => ({ data: s }));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('trial')
  @ApiOperation({ summary: 'Start 7-day free trial' })
  startTrial(@CurrentUser() user: JwtPayload) {
    return this.svc.startTrial(user.sub).then((s) => ({ data: s }));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('cancel')
  @ApiOperation({ summary: 'Cancel subscription at period end' })
  cancel(@CurrentUser() user: JwtPayload) {
    return this.svc.cancelSubscription(user.sub).then((s) => ({ data: s }));
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post('admin/activate')
  adminActivate(@Body() dto: AdminActivateDto) {
    return this.svc.adminActivate(dto.userId, dto.planType, dto.months).then((s) => ({ data: s }));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'EDITOR')
  @Get('admin/list')
  adminList(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.svc.listSubscriptions(page, limit);
  }
}
