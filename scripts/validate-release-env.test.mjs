import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReleaseEnv } from './validate-release-env.mjs';
const fixture = () => ({
  APP_ENV: 'staging', PUBLIC_APP_URL: 'https://staging.nextsession.de', DATABASE_URL: 'postgresql://test:test@stage-pooler.example.org/db?sslmode=require',
  EXPECTED_DATABASE_HOST: 'stage.example.org', PRODUCTION_DATABASE_HOST: 'prod.example.org',
  FIREBASE_PROJECT_ID: 'test-stage', EXPECTED_FIREBASE_PROJECT_ID: 'test-stage', PRODUCTION_FIREBASE_PROJECT_ID: 'test-prod',
  FIREBASE_CLIENT_EMAIL: 'firebase-adminsdk@test-stage.iam.gserviceaccount.com', FIREBASE_PRIVATE_KEY: 'fixture-not-a-key',
  NEXT_PUBLIC_FIREBASE_API_KEY: 'test-stage-web', EXPECTED_FIREBASE_API_KEY: 'test-stage-web', AUTH_RATE_LIMIT_SECRET: 'x'.repeat(32),
  PLATFORM_ADMIN_USER_IDS: 'fixture-admin', AUTH_PROVIDER: 'firebase', NEXT_PUBLIC_AUTH_PROVIDER: 'firebase', SEED_DEMO_DATA: 'false', LICENSE_SELF_SERVICE_ENABLED: 'false',
});
test('Release guard accepts isolated staging and rejects crossed resource identities', () => {
  assert.doesNotThrow(() => validateReleaseEnv(fixture(), 'staging'));
  for (const change of [
    { APP_ENV: 'production' }, { PUBLIC_APP_URL: 'https://nextsession.de' },
    { DATABASE_URL: 'postgresql://test:test@prod-pooler.example.org/db?sslmode=require', EXPECTED_DATABASE_HOST: 'prod.example.org' },
    { FIREBASE_PROJECT_ID: 'test-prod', EXPECTED_FIREBASE_PROJECT_ID: 'test-prod', FIREBASE_CLIENT_EMAIL: 'admin@test-prod.iam.gserviceaccount.com' },
    { NEXT_PUBLIC_FIREBASE_API_KEY: 'prod-web' }, { FIREBASE_CLIENT_EMAIL: 'admin@test-prod.iam.gserviceaccount.com' },
    { PLATFORM_ADMIN_USER_IDS: '' }, { FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099' }, { AUTH_RATE_LIMIT_SECRET: 'short' },
  ]) assert.throws(() => validateReleaseEnv({ ...fixture(), ...change }, 'staging'));
});
test('Production target requires its approved resource identities', () => {
  const env = { ...fixture(), APP_ENV: 'production', PUBLIC_APP_URL: 'https://nextsession.de', PRODUCTION_DATABASE_HOST: 'stage.example.org', PRODUCTION_FIREBASE_PROJECT_ID: 'test-stage' };
  assert.doesNotThrow(() => validateReleaseEnv(env, 'production'));
  assert.throws(() => validateReleaseEnv(fixture(), 'production'));
});
