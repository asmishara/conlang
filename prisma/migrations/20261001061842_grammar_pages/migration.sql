-- CreateTable
CREATE TABLE "GrammarPage" (
    "id" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "parentId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrammarPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GrammarPage_languageId_parentId_position_idx" ON "GrammarPage"("languageId", "parentId", "position");

-- AddForeignKey
ALTER TABLE "GrammarPage" ADD CONSTRAINT "GrammarPage_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarPage" ADD CONSTRAINT "GrammarPage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "GrammarPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
