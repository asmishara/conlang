-- CreateTable
CREATE TABLE "IrregularForm" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "paradigmId" TEXT NOT NULL,
    "cell" TEXT NOT NULL,
    "form" TEXT NOT NULL,

    CONSTRAINT "IrregularForm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IrregularForm_paradigmId_idx" ON "IrregularForm"("paradigmId");

-- CreateIndex
CREATE UNIQUE INDEX "IrregularForm_wordId_paradigmId_cell_key" ON "IrregularForm"("wordId", "paradigmId", "cell");

-- AddForeignKey
ALTER TABLE "IrregularForm" ADD CONSTRAINT "IrregularForm_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IrregularForm" ADD CONSTRAINT "IrregularForm_paradigmId_fkey" FOREIGN KEY ("paradigmId") REFERENCES "Paradigm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
