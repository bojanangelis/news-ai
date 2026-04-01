-- CreateEnum
CREATE TYPE "ScrapingSourceStatus" AS ENUM ('PENDING', 'ACTIVE', 'ERROR', 'PAUSED');

-- CreateTable
CREATE TABLE "ScrapingSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "scrapeIntervalMinutes" INTEGER NOT NULL DEFAULT 60,
    "lastScrapedAt" TIMESTAMP(3),
    "status" "ScrapingSourceStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScrapingSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScrapingSource_url_key" ON "ScrapingSource"("url");

-- CreateIndex
CREATE INDEX "ScrapingSource_isActive_status_idx" ON "ScrapingSource"("isActive", "status");

-- CreateIndex
CREATE INDEX "ScrapingSource_createdById_idx" ON "ScrapingSource"("createdById");

-- AddForeignKey
ALTER TABLE "ScrapingSource" ADD CONSTRAINT "ScrapingSource_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
