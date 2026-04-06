import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AdsService } from './ads.service';

@Injectable()
export class AdsSchedulerService {
  private readonly logger = new Logger(AdsSchedulerService.name);

  constructor(private readonly adsService: AdsService) {}

  /** Run every hour: expire ads whose endDate has passed. */
  @Cron('0 * * * *')
  async expireAds() {
    const count = await this.adsService.expireOverdueAds();
    if (count > 0) {
      this.logger.log(`[ADS] Expired ${count} ad(s)`);
    }
  }
}
