import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const demoUsers = [
  { id: "admin-1", name: "Florian Keller", email: "admin@trainerplan.de", password: "admin123", role: "admin", position: "Vereinsadmin", phone: "+49 171 1234567", birthday: "1987-04-12" },
  { id: "coach-1", name: "Daniel Wagner", email: "trainer@trainerplan.de", password: "trainer123", role: "trainer", position: "Cheftrainer F1", phone: "+49 172 2345678", birthday: "1989-09-03" },
  { id: "player-1", name: "Noah Becker", email: "spieler@trainerplan.de", password: "spieler123", role: "player", position: "Allrounder", number: 7, phone: "+49 176 1000001", birthday: "2017-02-18" },
  { id: "player-2", name: "Elias Weber", email: "elias@trainerplan.de", password: "demo123", role: "player", position: "Allrounder", number: 10, phone: "+49 176 1000002", birthday: "2016-11-08" },
  { id: "player-3", name: "Ben Fischer", email: "ben@trainerplan.de", password: "demo123", role: "player", position: "Tor", number: 1, phone: "+49 176 1000003", birthday: "2017-05-21" },
  { id: "player-4", name: "Paul Richter", email: "paul@trainerplan.de", password: "demo123", role: "player", position: "Allrounder", number: 4, phone: "+49 176 1000004", birthday: "2016-12-13" },
  { id: "player-5", name: "Leon Hoffmann", email: "leon@trainerplan.de", password: "demo123", role: "player", position: "Allrounder", number: 9, phone: "+49 176 1000005", birthday: "2017-07-02" },
  { id: "player-6", name: "Finn Müller", email: "finn@trainerplan.de", password: "demo123", role: "player", position: "Allrounder", number: 11, phone: "+49 176 1000006", birthday: "2016-10-27" },
  { id: "player-7", name: "Luca Schneider", email: "luca@trainerplan.de", password: "demo123", role: "player", position: "Allrounder", number: 8, phone: "+49 176 1000007", birthday: "2017-01-16" },
  { id: "player-8", name: "Mats Wolf", email: "mats@trainerplan.de", password: "demo123", role: "player", position: "Allrounder", number: 6, phone: "+49 176 1000008", birthday: "2017-06-11" },
  { id: "player-9", name: "Emil Braun", email: "emil@trainerplan.de", password: "demo123", role: "player", position: "Allrounder", number: 3, phone: "+49 176 1000009", birthday: "2016-09-29" },
  { id: "player-10", name: "Theo Klein", email: "theo@trainerplan.de", password: "demo123", role: "player", position: "Allrounder", number: 5, phone: "+49 176 1000010", birthday: "2017-03-06" },
];

const demoEnabled = process.env.SEED_DEMO_DATA === "true";
const existingUsers = await prisma.user.count();
let users = [];

if (demoEnabled) {
  users = demoUsers;
} else if (existingUsers === 0) {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD || "";
  const name = process.env.INITIAL_ADMIN_NAME?.trim() || "Administration";
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || password.length < 12) {
    throw new Error("Für die Erstinstallation INITIAL_ADMIN_EMAIL und ein INITIAL_ADMIN_PASSWORD mit mindestens 12 Zeichen setzen. Alternativ SEED_DEMO_DATA=true nur für lokale Demos verwenden.");
  }
  users = [{ id: "admin-1", name, email, password, role: "admin", position: "Vereinsadmin", phone: "", birthday: "1990-01-01" }];
}

for (const user of users) {
  const { password, birthday, ...profile } = user;
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email: user.email },
    update: {},
    create: { ...profile, passwordHash, birthday: new Date(`${birthday}T12:00:00Z`) },
  });
}

await prisma.$disconnect();
