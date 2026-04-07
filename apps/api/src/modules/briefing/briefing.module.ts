import { Module } from '@nestjs/common';
import { BriefingService } from './briefing.service';
import { BriefingController } from './briefing.controller';

@Module({
  controllers: [BriefingController],
  providers: [BriefingService],
  exports: [BriefingService],
})
export class BriefingModule {}
