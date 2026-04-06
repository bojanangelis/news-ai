-- CreateEnum
CREATE TYPE "AdType" AS ENUM ('POPUP', 'TOP_BANNER', 'INLINE_FEED', 'SIDEBAR', 'STICKY_BOTTOM', 'SPONSORED_CARD', 'FULL_SCREEN_TAKEOVER');

-- CreateEnum
CREATE TYPE "AdPlacement" AS ENUM ('POPUP', 'TOP_BANNER', 'SIDEBAR_RIGHT', 'FEED_INLINE', 'STICKY_BOTTOM', 'ARTICLE_INLINE', 'SPONSORED_CARD', 'FULL_SCREEN_TAKEOVER');

-- CreateEnum
CREATE TYPE "AdStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AdDeviceTarget" AS ENUM ('ALL', 'DESKTOP', 'MOBILE');

-- CreateEnum
CREATE TYPE "AdEventType" AS ENUM ('IMPRESSION', 'CLICK');

-- CreateTable
CREATE TABLE "Advertiser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advertiser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "budget" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ad" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "campaignId" TEXT,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "altText" TEXT,
    "type" "AdType" NOT NULL,
    "placement" "AdPlacement" NOT NULL,
    "deviceTarget" "AdDeviceTarget" NOT NULL DEFAULT 'ALL',
    "categoryTargets" TEXT[],
    "pageTargets" TEXT[],
    "destinationUrl" TEXT NOT NULL,
    "trackingUrl" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalDays" INTEGER,
    "popupDelaySec" INTEGER NOT NULL DEFAULT 0,
    "popupHomepageOnly" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "weight" INTEGER NOT NULL DEFAULT 100,
    "maxImpressionsPerDay" INTEGER,
    "maxTotalImpressions" INTEGER,
    "maxClicks" INTEGER,
    "status" "AdStatus" NOT NULL DEFAULT 'PENDING',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "rejectionReason" TEXT,
    "totalImpressions" INTEGER NOT NULL DEFAULT 0,
    "totalClicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdDailyStat" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AdDailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdEvent" (
    "id" TEXT NOT NULL,
    "adId" TEXT NOT NULL,
    "type" "AdEventType" NOT NULL,
    "sessionId" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "deviceType" TEXT,
    "referer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Advertiser_isActive_idx" ON "Advertiser"("isActive");

-- CreateIndex
CREATE INDEX "AdCampaign_advertiserId_isActive_idx" ON "AdCampaign"("advertiserId", "isActive");

-- CreateIndex
CREATE INDEX "Ad_placement_status_isEnabled_idx" ON "Ad"("placement", "status", "isEnabled");

-- CreateIndex
CREATE INDEX "Ad_startDate_endDate_idx" ON "Ad"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Ad_advertiserId_idx" ON "Ad"("advertiserId");

-- CreateIndex
CREATE INDEX "Ad_status_updatedAt_idx" ON "Ad"("status", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "AdDailyStat_date_idx" ON "AdDailyStat"("date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "AdDailyStat_adId_date_key" ON "AdDailyStat"("adId", "date");

-- CreateIndex
CREATE INDEX "AdEvent_adId_type_createdAt_idx" ON "AdEvent"("adId", "type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AdEvent_createdAt_idx" ON "AdEvent"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdDailyStat" ADD CONSTRAINT "AdDailyStat_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdEvent" ADD CONSTRAINT "AdEvent_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
