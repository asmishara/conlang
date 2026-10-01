-- CreateTable
CREATE TABLE "WordGenerator" (
    "languageId" TEXT NOT NULL,
    "categories" JSONB NOT NULL,
    "patterns" TEXT[],
    "minSyllables" INTEGER NOT NULL,
    "maxSyllables" INTEGER NOT NULL,
    "dropoff" BOOLEAN NOT NULL,
    "forbidden" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WordGenerator_pkey" PRIMARY KEY ("languageId")
);

-- AddForeignKey
ALTER TABLE "WordGenerator" ADD CONSTRAINT "WordGenerator_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;
