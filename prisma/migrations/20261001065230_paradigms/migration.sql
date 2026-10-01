-- CreateTable
CREATE TABLE "Paradigm" (
    "id" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "partOfSpeech" TEXT NOT NULL,
    "dimensions" JSONB NOT NULL,
    "rules" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paradigm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Paradigm_languageId_partOfSpeech_idx" ON "Paradigm"("languageId", "partOfSpeech");

-- AddForeignKey
ALTER TABLE "Paradigm" ADD CONSTRAINT "Paradigm_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;
