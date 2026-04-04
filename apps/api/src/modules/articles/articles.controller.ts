import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { CreateArticleDto, UpdateArticleDto, ArticlesQueryDto } from './dto/articles.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('articles')
@Controller({ path: 'articles', version: '1' })
export class ArticlesController {
  constructor(private articlesService: ArticlesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published articles' })
  findAll(@Query() query: ArticlesQueryDto) {
    return this.articlesService.findAll(query);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get article by slug' })
  findOne(@Param('slug') slug: string, @CurrentUser() user?: JwtPayload) {
    return this.articlesService.findBySlug(slug, user?.sub);
  }

  @Roles('EDITOR', 'WRITER', 'SUPER_ADMIN')
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new article (Editor/Writer)' })
  create(@Body() dto: CreateArticleDto, @CurrentUser() user: JwtPayload) {
    return this.articlesService.create(dto, user.sub);
  }

  @Roles('EDITOR', 'WRITER', 'SUPER_ADMIN')
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update article' })
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto, @CurrentUser() user: JwtPayload) {
    return this.articlesService.update(id, dto, user.sub);
  }

  @Roles('EDITOR', 'SUPER_ADMIN')
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish article' })
  publish(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.articlesService.publish(id, user.sub);
  }

  @Roles('EDITOR', 'SUPER_ADMIN')
  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive article' })
  archive(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.articlesService.archive(id, user.sub);
  }

  @Post(':id/view')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Record article view' })
  recordView(
    @Param('id') id: string,
    @CurrentUser() user?: JwtPayload,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.articlesService.recordView(id, user?.sub, sessionId);
  }
}

// ─── Feed controller (separate path prefix) ───────────────────────────────────

@ApiTags('feed')
@Controller({ path: 'feed', version: '1' })
export class FeedController {
  constructor(private articlesService: ArticlesService) {}

  @Get('recommended')
  @ApiOperation({ summary: 'Personalized article recommendations' })
  getRecommended(
    @CurrentUser() user: JwtPayload,
    @Query('limit') limit = 20,
  ) {
    return this.articlesService.getRecommended(user.sub, +limit);
  }
}
