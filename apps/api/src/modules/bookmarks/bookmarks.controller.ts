import { Controller, Get, Post, Delete, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BookmarksService } from './bookmarks.service';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('bookmarks')
@Controller({ path: 'bookmarks', version: '1' })
export class BookmarksController {
  constructor(private bookmarksService: BookmarksService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.bookmarksService.findAll(user.sub, +page, +limit);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body('articleId') articleId: string) {
    return this.bookmarksService.create(user.sub, articleId);
  }

  @Delete(':articleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('articleId') articleId: string, @CurrentUser() user: JwtPayload) {
    return this.bookmarksService.remove(user.sub, articleId);
  }
}
