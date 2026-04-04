-- AlterTable
ALTER TABLE "ScrapingLog" ADD COLUMN     "articlesFailed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "articlesSkipped" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "feedUrl" TEXT,
ADD COLUMN     "pagesVisited" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "structuredData" JSONB;

-- AlterTable
ALTER TABLE "ScrapingSource" ADD COLUMN     "consecutiveErrors" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "healthScore" INTEGER,
ADD COLUMN     "lastSuccessAt" TIMESTAMP(3),
ADD COLUMN     "maxArticlesPerRun" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "maxPagesPerRun" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "totalArticlesSaved" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "ScrapingLog_status_createdAt_idx" ON "ScrapingLog"("status", "createdAt" DESC);
