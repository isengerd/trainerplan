UPDATE "User" SET "position" = 'Vereinsadmin' WHERE "role" = 'admin';
UPDATE "User" SET "position" = 'Trainer' WHERE "role" = 'trainer' AND "position" = 'Trainer/in';
UPDATE "User" SET "position" = 'Allrounder' WHERE "role" = 'player' AND "position" IN ('Spieler/in', '');

CREATE TABLE "EmailChangeRequest" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "newEmail" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailChangeRequest_tokenHash_key" ON "EmailChangeRequest"("tokenHash");
CREATE INDEX "EmailChangeRequest_userId_idx" ON "EmailChangeRequest"("userId");
CREATE INDEX "EmailChangeRequest_newEmail_idx" ON "EmailChangeRequest"("newEmail");

ALTER TABLE "EmailChangeRequest" ADD CONSTRAINT "EmailChangeRequest_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
