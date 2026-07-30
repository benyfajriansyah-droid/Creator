-- AlterTable
ALTER TABLE "ContentItem" ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "sourceText" TEXT;

-- CreateIndex
CREATE INDEX "ContentItem_sourceId_idx" ON "ContentItem"("sourceId");

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ContentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
