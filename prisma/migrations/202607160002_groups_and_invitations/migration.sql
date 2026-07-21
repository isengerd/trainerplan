CREATE TABLE "TeamGroup" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "color" TEXT NOT NULL DEFAULT '#45d875',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeamGroup_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "User" ADD COLUMN "groupId" TEXT;
CREATE INDEX "User_groupId_idx" ON "User"("groupId");
ALTER TABLE "User" ADD CONSTRAINT "User_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TeamGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Invitation" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT '',
  "role" "Role" NOT NULL,
  "groupId" TEXT,
  "invitedById" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");
CREATE INDEX "Invitation_groupId_idx" ON "Invitation"("groupId");
CREATE INDEX "Invitation_invitedById_idx" ON "Invitation"("invitedById");
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TeamGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "TeamGroup" ("id", "name", "description", "color", "createdAt", "updatedAt") VALUES
  ('group-f1', 'F1 · F-Jugend', 'Spielerinnen und Spieler der F1', '#45d875', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('group-staff', 'Trainerteam', 'Trainer und Administration', '#58a6ff', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

UPDATE "User" SET "groupId" = 'group-f1' WHERE "role" = 'player';
UPDATE "User" SET "groupId" = 'group-staff' WHERE "role" IN ('admin', 'trainer');
