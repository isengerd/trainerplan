ALTER TABLE "User" ADD COLUMN "ballNumber" INTEGER;

ALTER TABLE "User"
ADD CONSTRAINT "User_ballNumber_check" CHECK ("ballNumber" IS NULL OR "ballNumber" BETWEEN 0 AND 999);
