import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HomepageService } from './homepage.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('homepage')
@Controller({ path: 'homepage', version: '1' })
export class HomepageController {
  constructor(private homepageService: HomepageService) {}

  @Public()
  @Get()
  getSections() {
    return this.homepageService.getSections();
  }

  @Roles('EDITOR', 'SUPER_ADMIN')
  @Get('sections')
  getSectionsAdmin() {
    return this.homepageService.getSectionsAdmin();
  }

  @Roles('EDITOR', 'SUPER_ADMIN')
  @Post('reorder')
  reorder(@Body() body: { order: { id: string; order: number }[] }) {
    return this.homepageService.reorderSections(body.order);
  }

  @Roles('EDITOR', 'SUPER_ADMIN')
  @Patch('sections/:id')
  patchSection(@Param('id') id: string, @Body() body: { isActive?: boolean; title?: string }, @CurrentUser() user: JwtPayload) {
    return this.homepageService.patchSection(id, body, user.sub);
  }

  @Roles('EDITOR', 'SUPER_ADMIN')
  @Delete('sections/:id')
  deleteSection(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.homepageService.deleteSection(id, user.sub);
  }

  @Roles('EDITOR', 'SUPER_ADMIN')
  @Post('sections')
  upsertSection(
    @Body() body: {
      id?: string;
      type: string;
      title?: string;
      order: number;
      isActive?: boolean;
      categoryId?: string;
      articleIds: string[];
    },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.homepageService.upsertSection({ ...body, adminId: user.sub });
  }
}
