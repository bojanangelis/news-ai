import { Module } from '@nestjs/common';
import { ArticlesController, FeedController } from './articles.controller';
import { ArticlesService } from './articles.service';

@Module({
  controllers: [ArticlesController, FeedController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
