ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'guardian';

ALTER TABLE "User" ADD COLUMN "managedProfile" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "loginEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Invitation" ADD COLUMN "managedPlayerId" TEXT;

CREATE TABLE "GuardianPlayer" (
  "guardianId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GuardianPlayer_pkey" PRIMARY KEY ("guardianId", "playerId")
);

CREATE INDEX "GuardianPlayer_playerId_idx" ON "GuardianPlayer"("playerId");
CREATE INDEX "Invitation_managedPlayerId_idx" ON "Invitation"("managedPlayerId");

ALTER TABLE "GuardianPlayer" ADD CONSTRAINT "GuardianPlayer_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuardianPlayer" ADD CONSTRAINT "GuardianPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_managedPlayerId_fkey" FOREIGN KEY ("managedPlayerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
