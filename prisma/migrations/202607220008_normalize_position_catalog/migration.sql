UPDATE "User"
SET "position" = 'Trainer'
WHERE "role" = 'trainer'
  AND "position" NOT IN ('Trainer', 'Cheftrainer F1', 'Cheftrainer', 'Co-Trainer', 'Torwarttrainer', 'Athletiktrainer', 'Betreuer');

UPDATE "User"
SET "position" = 'Allrounder'
WHERE "role" = 'player'
  AND "position" NOT IN ('Allrounder', 'Tor', 'Abwehr', 'Mittelfeld', 'Angriff');
