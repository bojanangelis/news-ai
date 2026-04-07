import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TopicsModule } from './modules/topics/topics.module';
import { AuthorsModule } from './modules/authors/authors.module';
import { BookmarksModule } from './modules/bookmarks/bookmarks.module';
import { SearchModule } from './modules/search/search.module';
import { MediaModule } from './modules/media/media.module';
import { HomepageModule } from './modules/homepage/homepage.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AdminModule } from './modules/admin/admin.module';
import { StoriesModule } from './modules/stories/stories.module';
import { AdsModule } from './modules/ads/ads.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { SummaryModule } from './modules/summary/summary.module';
import { BriefingModule } from './modules/briefing/briefing.module';

@Module({
  imports: [
    // ─── Config ─────────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // ─── Scheduling ──────────────────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ─── Rate limiting ───────────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },   // 10 req/s
      { name: 'medium', ttl: 10000, limit: 50 },  // 50 req/10s
      { name: 'long', ttl: 60000, limit: 200 },   // 200 req/min
    ]),

    // ─── Infrastructure ───────────────────────────────────────────────────────
    PrismaModule,
    RedisModule,

    // ─── Feature modules ──────────────────────────────────────────────────────
    AuthModule,
    UsersModule,
    ArticlesModule,
    CategoriesModule,
    TopicsModule,
    AuthorsModule,
    BookmarksModule,
    SearchModule,
    MediaModule,
    HomepageModule,
    AnalyticsModule,
    AdminModule,
    StoriesModule,
    AdsModule,
    SubscriptionModule,
    SummaryModule,
    BriefingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global rate limit guard
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
