-- Historical occurrences have no reliable series identity. Keep them ungrouped.
ALTER TABLE "ClubEvent" ADD COLUMN "seriesId" TEXT;
CREATE INDEX "ClubEvent_clubId_teamId_seriesId_date_idx" ON "ClubEvent"("clubId", "teamId", "seriesId", "date");
