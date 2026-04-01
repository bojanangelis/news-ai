import { Controller, Get, Post, Delete, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TopicsService } from './topics.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('topics')
@Controller({ path: 'topics', version: '1' })
export class TopicsController {
  constructor(private topicsService: TopicsService) {}

  @Public()
  @Get()
  findAll(@CurrentUser() user?: JwtPayload) {
    return this.topicsService.findAll(user?.sub);
  }

  @Get('following')
  following(@CurrentUser() user: JwtPayload) {
    return this.topicsService.findFollowedTopics(user.sub);
  }

  @Post(':id/follow')
  @HttpCode(HttpStatus.CREATED)
  follow(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.topicsService.follow(id, user.sub);
  }

  @Delete(':id/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  unfollow(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.topicsService.unfollow(id, user.sub);
  }
}
