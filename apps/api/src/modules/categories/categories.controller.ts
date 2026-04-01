import { Controller, Get, Post, Patch, Param, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('categories')
@Controller({ path: 'categories', version: '1' })
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Public()
  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Public()
  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.categoriesService.findBySlug(slug);
  }

  @Roles('EDITOR', 'SUPER_ADMIN')
  @Post()
  create(@Body() body: { name: string; slug: string; description?: string; color?: string }) {
    return this.categoriesService.create(body);
  }

  @Roles('EDITOR', 'SUPER_ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<{ name: string; description: string; color: string; order: number; isActive: boolean }>) {
    return this.categoriesService.update(id, body);
  }
}
