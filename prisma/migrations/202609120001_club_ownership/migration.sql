ALTER TABLE "Club" ADD COLUMN "ownerUserId" TEXT;
ALTER TABLE "Club" ADD CONSTRAINT "Club_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD COLUMN "ownershipTransfer" BOOLEAN NOT NULL DEFAULT false;
-- Preserve the earliest existing license administrator. No memberships or accounts are deleted.
UPDATE "Club" c SET "ownerUserId" = candidate."userId"
FROM (
 SELECT DISTINCT ON (m."clubId") m."clubId", m."userId"
 FROM "Membership" m JOIN "User" u ON u.id = m."userId"
 WHERE m.status = 'active' AND m.role = 'admin' AND u."loginEnabled" = true AND u."managedProfile" = false
 ORDER BY m."clubId", m."clubAdmin" DESC, m."createdAt" ASC, m.id ASC
) candidate WHERE c.id = candidate."clubId";
