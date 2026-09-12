// Read-only pre-deployment check. Outputs account IDs and existing ownership
// candidates; never passwords, Firebase credentials or connection strings.
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });
const db = new PrismaClient();
try {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error("Aufruf: node scripts/inspect-ownership.mjs <E-Mail des Betreiberkontos>");
  const account = await db.user.findUnique({ where: { email }, select: { id: true, name: true, loginEnabled: true, managedProfile: true } });
  if (!account || !account.loginEnabled || account.managedProfile) throw new Error("Kein aktives eigenständiges Konto gefunden.");
  console.log(JSON.stringify(account, null, 2));
  const memberships = await db.membership.findMany({ where: { userId: account.id }, select: { clubId: true, teamId: true, role: true, clubAdmin: true, status: true } });
  console.log(JSON.stringify(memberships, null, 2));
  console.log(`Nach Prüfung in Vercel setzen: PLATFORM_ADMIN_USER_IDS=${account.id}`);
} catch (error) {
  console.error(error instanceof Error && !error.message.includes("prisma") ? error.message : "Kontoprüfung fehlgeschlagen. Datenbankverbindung und Schema prüfen.");
  process.exitCode = 1;
} finally { await db.$disconnect(); }
