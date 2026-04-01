-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "sourceUrl" TEXT;

-- AlterTable
ALTER TABLE "ScrapingLog" ADD COLUMN     "articlesSaved" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ScrapingSource" ADD COLUMN     "defaultCategoryId" TEXT;

-- AddForeignKey
ALTER TABLE "ScrapingSource" ADD CONSTRAINT "ScrapingSource_defaultCategoryId_fkey" FOREIGN KEY ("defaultCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
