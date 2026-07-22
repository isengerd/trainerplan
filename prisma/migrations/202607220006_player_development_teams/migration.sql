ALTER TABLE "User"
ADD COLUMN "dribblingRating" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "shootingRating" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "passingRating" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "internalTeam" TEXT;

ALTER TABLE "User"
ADD CONSTRAINT "User_dribblingRating_check" CHECK ("dribblingRating" BETWEEN 0 AND 5),
ADD CONSTRAINT "User_shootingRating_check" CHECK ("shootingRating" BETWEEN 0 AND 5),
ADD CONSTRAINT "User_passingRating_check" CHECK ("passingRating" BETWEEN 0 AND 5),
ADD CONSTRAINT "User_internalTeam_check" CHECK ("internalTeam" IS NULL OR "internalTeam" IN ('A', 'B'));

UPDATE "AppConfig"
SET "settings" = "settings" || '{"splitTeamsEnabled": true}'::jsonb
WHERE NOT ("settings" ? 'splitTeamsEnabled');
