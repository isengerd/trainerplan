import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

test("Firebase Auth funktioniert ohne require(ESM) und verarbeitet echte RSA-Signaturschlüssel", () => {
  const script = `
    const assert = require('node:assert/strict');
    const crypto = require('node:crypto');
    const { getAuth } = require('firebase-admin/auth');
    const { retrieveSigningKeys } = require('jwks-rsa/src/utils');
    assert.equal(typeof getAuth, 'function');
    (async () => {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
      const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'runtime-test', alg: 'RS256', use: 'sig' };
      const keys = await retrieveSigningKeys([jwk]);
      assert.equal(keys.length, 1);
      assert.equal(keys[0].kid, 'runtime-test');
      const data = Buffer.from('NextSession runtime regression');
      const signature = crypto.sign('RSA-SHA256', data, privateKey);
      assert.equal(crypto.verify('RSA-SHA256', data, keys[0].getPublicKey(), signature), true);
      assert.equal(crypto.verify('RSA-SHA256', Buffer.from('tampered'), keys[0].getPublicKey(), signature), false);
      console.log('runtime-ok');
    })().catch(() => { process.exitCode = 1; });
  `;
  const output = execFileSync(process.execPath, ["--no-experimental-require-module", "-e", script], { encoding: "utf8", timeout: 20_000 });
  assert.match(output, /runtime-ok/);
});
