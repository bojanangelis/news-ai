import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { AdminAuditController } from './admin-audit.controller';
import { AdminScrapingController } from './admin-scraping.controller';
import { AdminService } from './admin.service';
import { ScrapingService } from './scraping.service';
import { ScrapingSchedulerService } from './scraping-scheduler.service';
import { StoriesModule } from '../stories/stories.module';

@Module({
  imports: [StoriesModule],
  controllers: [AdminUsersController, AdminAuditController, AdminScrapingController],
  providers: [AdminService, ScrapingService, ScrapingSchedulerService],
})
export class AdminModule {}
