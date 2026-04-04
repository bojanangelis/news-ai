import { Module } from '@nestjs/common';
import { StoryManagerService } from './story-manager.service';

@Module({
  providers: [StoryManagerService],
  exports: [StoryManagerService],
})
export class StoriesModule {}
