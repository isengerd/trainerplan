-- AlterTable
ALTER TABLE "User" ADD COLUMN "ageGroup" TEXT NOT NULL DEFAULT 'F-Jugend';

-- CreateTable
CREATE TABLE "TournamentSquad" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trainerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentSquad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentSquadPlayer" (
    "squadId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentSquadPlayer_pkey" PRIMARY KEY ("squadId","playerId")
);

-- CreateIndex
CREATE INDEX "TournamentSquad_eventId_idx" ON "TournamentSquad"("eventId");
CREATE INDEX "TournamentSquad_trainerId_idx" ON "TournamentSquad"("trainerId");
CREATE UNIQUE INDEX "TournamentSquadPlayer_eventId_playerId_key" ON "TournamentSquadPlayer"("eventId", "playerId");
CREATE INDEX "TournamentSquadPlayer_playerId_idx" ON "TournamentSquadPlayer"("playerId");

-- AddForeignKey
ALTER TABLE "TournamentSquad" ADD CONSTRAINT "TournamentSquad_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ClubEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentSquad" ADD CONSTRAINT "TournamentSquad_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TournamentSquadPlayer" ADD CONSTRAINT "TournamentSquadPlayer_squadId_fkey" FOREIGN KEY ("squadId") REFERENCES "TournamentSquad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentSquadPlayer" ADD CONSTRAINT "TournamentSquadPlayer_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ClubEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentSquadPlayer" ADD CONSTRAINT "TournamentSquadPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
