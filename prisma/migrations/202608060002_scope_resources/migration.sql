ALTER TABLE "ClubEvent" ADD COLUMN "clubId" TEXT;
ALTER TABLE "ClubEvent" ADD COLUMN "teamId" TEXT;
ALTER TABLE "ExerciseRecord" ADD COLUMN "clubId" TEXT;
ALTER TABLE "ExerciseRecord" ADD COLUMN "teamId" TEXT;
ALTER TABLE "AppConfig" ADD COLUMN "clubId" TEXT;
ALTER TABLE "AppConfig" ADD COLUMN "teamId" TEXT;

CREATE INDEX "ClubEvent_clubId_teamId_date_idx" ON "ClubEvent"("clubId", "teamId", "date");
CREATE INDEX "ExerciseRecord_clubId_teamId_idx" ON "ExerciseRecord"("clubId", "teamId");
CREATE INDEX "AppConfig_clubId_teamId_idx" ON "AppConfig"("clubId", "teamId");

ALTER TABLE "ClubEvent" ADD CONSTRAINT "ClubEvent_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClubEvent" ADD CONSTRAINT "ClubEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExerciseRecord" ADD CONSTRAINT "ExerciseRecord_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExerciseRecord" ADD CONSTRAINT "ExerciseRecord_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AppConfig" ADD CONSTRAINT "AppConfig_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AppConfig" ADD CONSTRAINT "AppConfig_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
