-- CreateTable
CREATE TABLE "LanguageEditor" (
    "languageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LanguageEditor_pkey" PRIMARY KEY ("languageId","userId")
);

-- CreateTable
CREATE TABLE "LanguageInvite" (
    "id" TEXT NOT NULL,
    "languageId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LanguageInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LanguageEditor_userId_idx" ON "LanguageEditor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LanguageInvite_tokenHash_key" ON "LanguageInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "LanguageInvite_languageId_idx" ON "LanguageInvite"("languageId");

-- AddForeignKey
ALTER TABLE "LanguageEditor" ADD CONSTRAINT "LanguageEditor_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageEditor" ADD CONSTRAINT "LanguageEditor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageInvite" ADD CONSTRAINT "LanguageInvite_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;
