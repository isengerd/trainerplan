ALTER TABLE "User"
ADD COLUMN "defaultTrainingAttendance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "defaultCompetitionAttendance" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ClubEvent"
ADD COLUMN "autoSetPlayersPresent" BOOLEAN NOT NULL DEFAULT false;
