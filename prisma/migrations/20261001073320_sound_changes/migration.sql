-- CreateTable
CREATE TABLE "SoundChangeSet" (
    "id" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rules" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SoundChangeSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SoundChangeSet_languageId_idx" ON "SoundChangeSet"("languageId");

-- AddForeignKey
ALTER TABLE "SoundChangeSet" ADD CONSTRAINT "SoundChangeSet_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;
