import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthorsService } from './authors.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('authors')
@Controller({ path: 'authors', version: '1' })
export class AuthorsController {
  constructor(private authorsService: AuthorsService) {}

  @Public()
  @Get()
  findAll() {
    return this.authorsService.findAll();
  }

  @Public()
  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.authorsService.findBySlug(slug);
  }
}
