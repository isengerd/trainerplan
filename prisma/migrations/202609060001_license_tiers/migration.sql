ALTER TABLE "Club" ADD COLUMN "licenseExpiresAt" TIMESTAMP(3);

-- Bestehende Einzelmannschaften behalten beim Rollout alle bisherigen Funktionen.
UPDATE "Club"
SET "licenseType" = 'single_team_pro'
WHERE "licenseType" = 'single_team';
