-- CreateEnum
CREATE TYPE "PhonemeKind" AS ENUM ('CONSONANT', 'VOWEL');

-- CreateTable
CREATE TABLE "Phoneme" (
    "id" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "ipa" TEXT NOT NULL,
    "kind" "PhonemeKind" NOT NULL,
    "spelling" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "Phoneme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Phoneme_languageId_position_idx" ON "Phoneme"("languageId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Phoneme_languageId_ipa_key" ON "Phoneme"("languageId", "ipa");

-- AddForeignKey
ALTER TABLE "Phoneme" ADD CONSTRAINT "Phoneme_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;
