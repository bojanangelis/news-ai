import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('admin')
@Controller({ path: 'admin/audit-log', version: '1' })
export class AdminAuditController {
  constructor(private adminService: AdminService) {}

  @Roles('SUPER_ADMIN')
  @Get()
  getLog(@Query('page') page = 1, @Query('limit') limit = 50) {
    return this.adminService.getAuditLog(+page, +limit);
  }
}
