CREATE TYPE "Role" AS ENUM ('admin', 'trainer', 'player');
CREATE TYPE "AttendanceValue" AS ENUM ('yes', 'no', 'maybe');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "position" TEXT NOT NULL,
  "number" INTEGER,
  "phone" TEXT NOT NULL DEFAULT '',
  "birthday" DATE,
  "avatar" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "ClubEvent" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "address" TEXT,
  "meetingTime" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "trainerNote" TEXT,
  "weather" JSONB,
  "maxParticipants" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClubEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttendanceResponse" (
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "value" "AttendanceValue" NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AttendanceResponse_pkey" PRIMARY KEY ("eventId", "userId")
);

CREATE TABLE "ExerciseRecord" (
  "id" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExerciseRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppConfig" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "settings" JSONB NOT NULL,
  "plans" JSONB NOT NULL,
  "templates" JSONB NOT NULL,
  "planMeta" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiSession" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ApiSession_tokenHash_key" ON "ApiSession"("tokenHash");
CREATE INDEX "ApiSession_userId_idx" ON "ApiSession"("userId");
CREATE INDEX "ApiSession_expiresAt_idx" ON "ApiSession"("expiresAt");

ALTER TABLE "AttendanceResponse" ADD CONSTRAINT "AttendanceResponse_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ClubEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceResponse" ADD CONSTRAINT "AttendanceResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiSession" ADD CONSTRAINT "ApiSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
