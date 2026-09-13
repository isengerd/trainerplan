CREATE TABLE "TrainingFeedback" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "exerciseId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "rating" INTEGER NOT NULL CHECK ("rating" BETWEEN 1 AND 3),
  "reason" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrainingFeedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TrainingFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TrainingFeedback_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TrainingFeedback_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TrainingFeedback_userId_teamId_sessionId_exerciseId_key" ON "TrainingFeedback"("userId", "teamId", "sessionId", "exerciseId");
CREATE INDEX "TrainingFeedback_clubId_teamId_date_idx" ON "TrainingFeedback"("clubId", "teamId", "date");
