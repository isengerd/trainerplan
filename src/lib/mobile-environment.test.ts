import test from 'node:test';
import assert from 'node:assert/strict';
import { mobileEnvironment } from './mobile-environment';
test('Native test and production apps have separate identities, origins and projects', () => {
  const production = mobileEnvironment({ PUBLIC_APP_URL: 'http://localhost:3000' });
  const staging = mobileEnvironment({ MOBILE_APP_ENV: 'staging' });
  assert.equal(production.serverUrl, 'https://nextsession.de');
  assert.equal(staging.serverUrl, 'https://staging.nextsession.de');
  assert.notEqual(production.appId, staging.appId);
  assert.notEqual(production.iosPath, staging.iosPath);
  for (const url of ['https://nextsession.de', 'https://staging.nextsession.de.evil.org', 'https://staging.nextsession.de/path']) {
    assert.throws(() => mobileEnvironment({ MOBILE_APP_ENV: 'staging', CAPACITOR_SERVER_URL: url }));
  }
  assert.throws(() => mobileEnvironment({ MOBILE_APP_ENV: 'production', CAPACITOR_SERVER_URL: staging.serverUrl }));
  assert.equal(mobileEnvironment({ MOBILE_APP_ENV: 'development', CAPACITOR_SERVER_URL: 'http://localhost:3000' }).iosPath, staging.iosPath);
});
