import { Module } from '@nestjs/common';
import { AdsService } from './ads.service';
import { AdsController } from './ads.controller';
import { AdminAdsController } from './admin-ads.controller';
import { AdsSchedulerService } from './ads-scheduler.service';

@Module({
  controllers: [AdsController, AdminAdsController],
  providers: [AdsService, AdsSchedulerService],
  exports: [AdsService],
})
export class AdsModule {}
