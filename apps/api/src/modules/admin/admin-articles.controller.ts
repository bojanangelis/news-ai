import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ArticlesService } from '../articles/articles.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('admin')
@Controller({ path: 'admin/articles', version: '1' })
export class AdminArticlesController {
  constructor(private articlesService: ArticlesService) {}

  @Roles('SUPER_ADMIN', 'EDITOR', 'WRITER')
  @Get(':id')
  async findById(@Param('id') id: string) {
    const article = await this.articlesService.findByIdFull(id);
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }
}
