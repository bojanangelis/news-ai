import { Controller, Get, Patch, Post, Delete, Param, Body, Query } from '@nestjs/common';
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
  @Post()
  createUser(@Body() body: { name: string; email: string; password: string; role: string }, @CurrentUser() admin: JwtPayload) {
    return this.adminService.createUser(body, admin.sub);
  }

  @Roles('SUPER_ADMIN')
  @Patch(':id/role')
  updateRole(@Param('id') id: string, @Body('role') role: string, @CurrentUser() admin: JwtPayload) {
    return this.adminService.updateUserRole(id, role, admin.sub);
  }

  @Roles('SUPER_ADMIN', 'EDITOR')
  @Post(':id/ban')
  ban(@Param('id') id: string, @CurrentUser() admin: JwtPayload) {
    return this.adminService.banUser(id, admin.sub);
  }

  @Roles('SUPER_ADMIN', 'EDITOR')
  @Post(':id/unban')
  unban(@Param('id') id: string) {
    return this.adminService.unbanUser(id);
  }

  @Roles('SUPER_ADMIN')
  @Delete(':id')
  deleteUser(@Param('id') id: string, @CurrentUser() admin: JwtPayload) {
    return this.adminService.deleteUser(id, admin.sub);
  }
}
