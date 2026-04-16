-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedFromStage" "ApplicationStage",
ADD COLUMN     "stageEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Application_stageEnteredAt_idx" ON "Application"("stageEnteredAt");

-- CreateIndex
CREATE INDEX "Application_nextActionAt_idx" ON "Application"("nextActionAt");
