-- AlterTable
ALTER TABLE "Language" ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "Word" ADD COLUMN     "sourceWordId" TEXT;

-- CreateIndex
CREATE INDEX "Language_parentId_idx" ON "Language"("parentId");

-- CreateIndex
CREATE INDEX "Word_sourceWordId_idx" ON "Word"("sourceWordId");

-- AddForeignKey
ALTER TABLE "Language" ADD CONSTRAINT "Language_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Language"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_sourceWordId_fkey" FOREIGN KEY ("sourceWordId") REFERENCES "Word"("id") ON DELETE SET NULL ON UPDATE CASCADE;
