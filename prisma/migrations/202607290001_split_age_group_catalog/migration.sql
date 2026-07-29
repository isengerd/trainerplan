-- Die Spielklasse wird künftig als G1/G2 ... A1/A2 aus dem Geburtsjahr berechnet.
UPDATE "AgeGroup" SET "sortOrder" = "sortOrder" + 1000;
UPDATE "AgeGroup" SET "id" = 'g1', "name" = 'G1', "ageRange" = '2020', "sortOrder" = 10 WHERE "id" = 'g-jugend';
UPDATE "AgeGroup" SET "id" = 'f1', "name" = 'F1', "ageRange" = '2018', "sortOrder" = 30 WHERE "id" = 'f-jugend';
UPDATE "AgeGroup" SET "id" = 'e1', "name" = 'E1', "ageRange" = '2016', "sortOrder" = 50 WHERE "id" = 'e-jugend';
UPDATE "AgeGroup" SET "id" = 'd1', "name" = 'D1', "ageRange" = '2014', "sortOrder" = 70 WHERE "id" = 'd-jugend';
UPDATE "AgeGroup" SET "id" = 'c1', "name" = 'C1', "ageRange" = '2012', "sortOrder" = 90 WHERE "id" = 'c-jugend';
UPDATE "AgeGroup" SET "id" = 'b1', "name" = 'B1', "ageRange" = '2010', "sortOrder" = 110 WHERE "id" = 'b-jugend';
UPDATE "AgeGroup" SET "id" = 'a1', "name" = 'A1', "ageRange" = '2008', "sortOrder" = 130 WHERE "id" = 'a-jugend';

INSERT INTO "AgeGroup" ("id", "name", "ageRange", "sortOrder") VALUES
  ('g2', 'G2', '2021 und jünger', 20),
  ('f2', 'F2', '2019', 40),
  ('e2', 'E2', '2017', 60),
  ('d2', 'D2', '2015', 80),
  ('c2', 'C2', '2013', 100),
  ('b2', 'B2', '2011', 120),
  ('a2', 'A2', '2009', 140);

UPDATE "AppConfig"
SET "settings" = jsonb_set(
  "settings",
  '{ageGroupIds}',
  '["g1","g2","f1","f2","e1","e2","d1","d2","c1","c2","b1","b2","a1","a2"]'::jsonb,
  true
)
WHERE "id" = 'default';
