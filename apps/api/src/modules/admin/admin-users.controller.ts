import { Controller, Get, Patch, Post, Param, Body, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('admin')
@Controller({ path: 'admin/users', version: '1' })
export class AdminUsersController {
  constructor(private adminService: AdminService) {}

  @Roles('SUPER_ADMIN', 'EDITOR')
  @Get()
  findAll(@Query('page') page = 1, @Query('limit') limit = 50) {
    return this.adminService.findAllUsers(+page, +limit);
  }

  @Roles('SUPER_ADMIN')
  @Patch(':id/role')
  updateRole(@Param('id') id: string, @Body('role') role: string) {
    return this.adminService.updateUserRole(id, role);
  }

  @Roles('SUPER_ADMIN', 'EDITOR')
  @Post(':id/ban')
  ban(@Param('id') id: string, @CurrentUser() admin: JwtPayload) {
    return this.adminService.banUser(id, admin.sub);
  }
}
