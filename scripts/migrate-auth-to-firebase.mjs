import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const required = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];
for (const key of required) if (!process.env[key]) throw new Error(`${key} fehlt.`);

const app = getApps()[0] ?? initializeApp({ credential: cert({
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
}) });
const auth = getAuth(app);
const prisma = new PrismaClient();

try {
  const users = await prisma.user.findMany({ where: { loginEnabled: true, managedProfile: false }, select: { id: true, email: true, name: true, passwordHash: true, firebaseUid: true } });
  for (const user of users) {
    if (user.firebaseUid) continue;
    let firebaseUser;
    try { firebaseUser = await auth.getUserByEmail(user.email); }
    catch (error) {
      if (error?.code !== "auth/user-not-found") throw error;
      const result = await auth.importUsers([{
        uid: user.id,
        email: user.email,
        displayName: user.name,
        passwordHash: Buffer.from(user.passwordHash),
      }], { hash: { algorithm: "BCRYPT" } });
      if (result.failureCount) throw result.errors[0].error;
      firebaseUser = await auth.getUser(user.id);
    }
    await prisma.user.update({ where: { id: user.id }, data: { firebaseUid: firebaseUser.uid } });
    process.stdout.write(`Migriert: ${user.email}\n`);
  }
  process.stdout.write(`Fertig: ${users.length} anmeldbare Konten geprüft.\n`);
} finally {
  await prisma.$disconnect();
}
