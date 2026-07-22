CREATE TABLE "AgeGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ageRange" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgeGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgeGroup_name_key" ON "AgeGroup"("name");
CREATE UNIQUE INDEX "AgeGroup_sortOrder_key" ON "AgeGroup"("sortOrder");

INSERT INTO "AgeGroup" ("id", "name", "ageRange", "sortOrder") VALUES
('g-jugend', 'G-Jugend', 'U6/U7', 10),
('f-jugend', 'F-Jugend', 'U8/U9', 20),
('e-jugend', 'E-Jugend', 'U10/U11', 30),
('d-jugend', 'D-Jugend', 'U12/U13', 40),
('c-jugend', 'C-Jugend', 'U14/U15', 50),
('b-jugend', 'B-Jugend', 'U16/U17', 60),
('a-jugend', 'A-Jugend', 'U18/U19', 70);

ALTER TABLE "Invitation" ADD COLUMN "ageGroup" TEXT NOT NULL DEFAULT 'F-Jugend';

UPDATE "AppConfig"
SET "settings" = ("settings" - 'ageGroups') || jsonb_build_object(
  'ageGroupIds',
  COALESCE(
    (SELECT jsonb_agg(ag."id" ORDER BY ag."sortOrder")
     FROM "AgeGroup" ag
     WHERE ag."name" IN (SELECT jsonb_array_elements_text("settings"->'ageGroups'))),
    '["f-jugend"]'::jsonb
  )
)
WHERE "settings" ? 'ageGroups';
