import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parse } from 'dotenv';

export function validateReleaseEnv(env, expected) {
  const fail = message => { throw new Error(message); };
  if (!['staging', 'production'].includes(expected)) fail('Release-Ziel fehlt oder ist ungültig.');
  if (env.APP_ENV !== expected) fail('APP_ENV stimmt nicht mit dem Release-Ziel überein.');
  if (env.PUBLIC_APP_URL !== (expected === 'production' ? 'https://nextsession.de' : 'https://staging.nextsession.de')) fail('PUBLIC_APP_URL passt nicht zur Umgebung.');
  for (const key of ['DATABASE_URL', 'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY', 'NEXT_PUBLIC_FIREBASE_API_KEY', 'AUTH_RATE_LIMIT_SECRET', 'PLATFORM_ADMIN_USER_IDS', 'EXPECTED_DATABASE_HOST', 'EXPECTED_FIREBASE_PROJECT_ID', 'EXPECTED_FIREBASE_API_KEY', 'PRODUCTION_DATABASE_HOST', 'PRODUCTION_FIREBASE_PROJECT_ID']) {
    if (!env[key]?.trim()) fail(`${key} fehlt.`);
  }
  let database;
  try { database = new URL(env.DATABASE_URL); } catch { fail('DATABASE_URL ist ungültig.'); }
  const normalize = host => host.replace('-pooler.', '.').toLowerCase();
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || database.searchParams.get('sslmode') !== 'require') fail('PostgreSQL mit sslmode=require ist erforderlich.');
  if (normalize(database.hostname) !== normalize(env.EXPECTED_DATABASE_HOST)) fail('Falsches Datenbankziel.');
  if (env.FIREBASE_PROJECT_ID !== env.EXPECTED_FIREBASE_PROJECT_ID || env.NEXT_PUBLIC_FIREBASE_API_KEY !== env.EXPECTED_FIREBASE_API_KEY) fail('Firebase-Server und Web-Konfiguration passen nicht zur erwarteten Umgebung.');
  if (!env.FIREBASE_CLIENT_EMAIL.endsWith(`@${env.FIREBASE_PROJECT_ID}.iam.gserviceaccount.com`)) fail('Firebase-Servicekonto gehört nicht zum erwarteten Projekt.');
  if (expected === 'staging' && (normalize(database.hostname) === normalize(env.PRODUCTION_DATABASE_HOST) || env.FIREBASE_PROJECT_ID === env.PRODUCTION_FIREBASE_PROJECT_ID)) fail('Staging darf keine Produktionsressourcen verwenden.');
  if (expected === 'production' && (normalize(database.hostname) !== normalize(env.PRODUCTION_DATABASE_HOST) || env.FIREBASE_PROJECT_ID !== env.PRODUCTION_FIREBASE_PROJECT_ID)) fail('Produktionsressourcen stimmen nicht mit der Freigabe überein.');
  if (env.AUTH_PROVIDER !== 'firebase' || env.NEXT_PUBLIC_AUTH_PROVIDER !== 'firebase') fail('Firebase-Anmeldung muss aktiviert sein.');
  if (env.SEED_DEMO_DATA !== 'false' || env.LICENSE_SELF_SERVICE_ENABLED !== 'false') fail('Demo-Seeding und Lizenz-Self-Service müssen für die Vereinsbeta deaktiviert sein.');
  if (env.AUTH_RATE_LIMIT_SECRET.length < 32) fail('AUTH_RATE_LIMIT_SECRET muss mindestens 32 Zeichen haben.');
  if (env.FIREBASE_AUTH_EMULATOR_HOST) fail('Kein Auth-Emulator in Releases.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const file = process.argv[3];
    const env = file ? { ...process.env, ...parse(readFileSync(file)) } : process.env;
    // Expected identities belong to protected CI settings, never the downloaded app config.
    for (const key of Object.keys(process.env).filter(key => key.startsWith('EXPECTED_') || key.startsWith('PRODUCTION_'))) env[key] = process.env[key];
    validateReleaseEnv(env, process.argv[2]);
    console.log('Release-Konfiguration geprüft. Keine Geheimnisse ausgegeben.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
