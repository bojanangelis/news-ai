-- CreateEnum
CREATE TYPE "ScrapingLogStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'ERROR');

-- CreateTable
CREATE TABLE "ScrapingLog" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" "ScrapingLogStatus" NOT NULL,
    "articlesFound" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapingLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScrapingLog_sourceId_createdAt_idx" ON "ScrapingLog"("sourceId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ScrapingLog" ADD CONSTRAINT "ScrapingLog_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ScrapingSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
