import test from 'node:test';
import assert from 'node:assert/strict';
import { publicAppOrigin, assertEmailRecipient, appEnvironment } from './app-environment';

test('Staging-Links bleiben auf Staging, bestehende Produktion bleibt stabil', () => {
  assert.equal(publicAppOrigin({ APP_ENV: 'staging', NODE_ENV: 'production', PUBLIC_APP_URL: 'https://staging.nextsession.de' }), 'https://staging.nextsession.de');
  assert.equal(publicAppOrigin({ NODE_ENV: 'production' }), 'https://nextsession.de');
  assert.throws(() => publicAppOrigin({ APP_ENV: 'staging', PUBLIC_APP_URL: 'https://nextsession.de' }));
  assert.throws(() => appEnvironment({ APP_ENV: 'stagign' }));
});
test('Staging-E-Mails sperren standardmäßig und erlauben nur exakte Testadressen', () => {
  assert.throws(() => assertEmailRecipient('real@example.org', { APP_ENV: 'staging' }));
  const env = { APP_ENV: 'staging', STAGING_EMAIL_ALLOWLIST: 'test@example.org' };
  assert.doesNotThrow(() => assertEmailRecipient('TEST@example.org', env));
  assert.throws(() => assertEmailRecipient('test@example.org.attacker.org', env));
  assert.throws(() => assertEmailRecipient('test@example.org,other@example.org', env));
});
