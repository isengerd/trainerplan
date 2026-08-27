-- Auth foundation for multi-club accounts and invitation-based onboarding.
CREATE TYPE "MembershipStatus" AS ENUM ('active', 'suspended');

CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL DEFAULT 'F-Jugend',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "teamId" TEXT,
    "role" "Role" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Invitation" ADD COLUMN "clubId" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "teamId" TEXT;

CREATE UNIQUE INDEX "Club_slug_key" ON "Club"("slug");
CREATE UNIQUE INDEX "Team_clubId_name_key" ON "Team"("clubId", "name");
CREATE UNIQUE INDEX "Membership_userId_clubId_teamId_key" ON "Membership"("userId", "clubId", "teamId");
CREATE INDEX "Team_clubId_idx" ON "Team"("clubId");
CREATE INDEX "Membership_clubId_status_idx" ON "Membership"("clubId", "status");
CREATE INDEX "Membership_teamId_status_idx" ON "Membership"("teamId", "status");
CREATE INDEX "Invitation_clubId_idx" ON "Invitation"("clubId");
CREATE INDEX "Invitation_teamId_idx" ON "Invitation"("teamId");

ALTER TABLE "Team" ADD CONSTRAINT "Team_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
