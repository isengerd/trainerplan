ALTER TABLE "User" ADD COLUMN "activeTeamId" TEXT;
ALTER TABLE "Club" ADD COLUMN "licenseType" TEXT NOT NULL DEFAULT 'single_team';
ALTER TABLE "TeamGroup" ADD COLUMN "clubId" TEXT;
ALTER TABLE "Membership" ADD COLUMN "clubAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Membership" ADD COLUMN "groupId" TEXT;

UPDATE "Membership" SET "clubAdmin" = true WHERE "role" = 'admin';

CREATE INDEX "TeamGroup_clubId_idx" ON "TeamGroup"("clubId");

ALTER TABLE "TeamGroup"
ADD CONSTRAINT "TeamGroup_clubId_fkey"
FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "User" AS u
SET "activeTeamId" = membership."teamId"
FROM (
  SELECT DISTINCT ON ("userId") "userId", "teamId"
  FROM "Membership"
  WHERE "status" = 'active'
  ORDER BY "userId", "createdAt" ASC
) AS membership
WHERE u."id" = membership."userId";

UPDATE "TeamGroup" AS group_record
SET "clubId" = membership."clubId"
FROM (
  SELECT DISTINCT ON (u."groupId") u."groupId", m."clubId"
  FROM "User" u
  JOIN "Membership" m ON m."userId" = u."id" AND m."status" = 'active'
  WHERE u."groupId" IS NOT NULL
  ORDER BY u."groupId", m."createdAt" ASC
) AS membership
WHERE group_record."id" = membership."groupId";

UPDATE "Membership" AS membership
SET "groupId" = u."groupId"
FROM "User" u
WHERE membership."userId" = u."id" AND u."groupId" IS NOT NULL;

CREATE INDEX "Membership_groupId_idx" ON "Membership"("groupId");
ALTER TABLE "Membership"
ADD CONSTRAINT "Membership_groupId_fkey"
FOREIGN KEY ("groupId") REFERENCES "TeamGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
