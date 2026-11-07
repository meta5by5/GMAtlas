// accounts.test.js — sign-in, sessions, devices and entitlements, driven
// through the real Worker fetch against real SQL (node:sqlite).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeServer, browser, signIn, lastCode } from './helpers.js';
import { importVerifyKey, verifyCertificate } from '../src/crypto.js';

test('email code sign-in creates the account once, and a second browser joins it', async () => {
  const server = await makeServer();
  const desktop = browser(server);
  const first = await signIn(server, desktop, 'GM@Example.com');
  assert.equal(first.status, 200);
  assert.equal(first.data.newAccount, true);
  assert.equal(first.data.user.email, 'gm@example.com', 'emails are lower-cased');
  assert.match(first.setCookie, /gm_refresh=.+; Path=\/api\/auth; HttpOnly; Secure; SameSite=Strict/);
  const stored = server.sqlite.prepare('SELECT code_hash FROM email_codes').get().code_hash;
  assert.match(stored, /^[0-9a-f]{64}$/, 'codes are stored hashed');
  assert.notEqual(stored, lastCode(server, 'gm@example.com'));

  const laptop = browser(server);
  const second = await signIn(server, laptop, 'gm@example.com', 'Laptop · Edge');
  assert.equal(second.data.newAccount, false);
  assert.equal(second.data.user.id, first.data.user.id);
  const devices = await laptop.call('GET', '/api/devices');
  assert.deepEqual(devices.data.devices.map((d) => [d.name, d.current]).sort(), [['Desktop · Chrome', false], ['Laptop · Edge', true]]);
});

test('signing in again on the same browser reuses its device record', async () => {
  const server = await makeServer();
  const b = browser(server);
  const a = await signIn(server, b, 'gm@example.com');
  await b.call('POST', '/api/auth/signout');
  const again = await signIn(server, b, 'gm@example.com');
  assert.equal(again.data.device.id, a.data.device.id);
});

test('codes: wrong, reused, expired and brute-forced codes all fail; requests are rate-limited', async () => {
  const server = await makeServer();
  const b = browser(server);
  const email = 'gm@example.com';
  assert.equal((await b.call('POST', '/api/auth/email/start', { email: 'not an email' })).status, 400);
  await b.call('POST', '/api/auth/email/start', { email });
  const code = lastCode(server, email);
  const wrong = code === '000000' ? '111111' : '000000';
  assert.equal((await b.call('POST', '/api/auth/email/verify', { email, code: wrong })).data.error, 'bad_code');
  assert.equal((await b.call('POST', '/api/auth/email/verify', { email, code })).status, 200);
  assert.equal((await b.call('POST', '/api/auth/email/verify', { email, code })).data.error, 'bad_code', 'a code works once');

  await b.call('POST', '/api/auth/email/start', { email });
  server.clock.ms += 11 * 60 * 1000;
  assert.equal((await b.call('POST', '/api/auth/email/verify', { email, code: lastCode(server, email) })).data.error, 'bad_code', 'expired');

  await b.call('POST', '/api/auth/email/start', { email });
  const real = lastCode(server, email);
  for (let i = 0; i < 5; i++) await b.call('POST', '/api/auth/email/verify', { email, code: real === '123456' ? '654321' : '123456' });
  assert.equal((await b.call('POST', '/api/auth/email/verify', { email, code: real })).data.error, 'too_many_attempts', 'five wrong guesses burn the code');

  const other = 'flood@example.com';
  for (let i = 0; i < 5; i++) assert.equal((await b.call('POST', '/api/auth/email/start', { email: other })).status, 200);
  assert.equal((await b.call('POST', '/api/auth/email/start', { email: other })).data.error, 'too_many_codes');
  server.clock.ms += 61 * 60 * 1000;
  assert.equal((await b.call('POST', '/api/auth/email/start', { email: other })).status, 200, 'the limit resets after an hour');
});

test('per-network limits: code requests and wrong guesses across many addresses; private; other networks unaffected', async () => {
  const server = await makeServer();
  const from = (ip) => ({ headers: { 'cf-connecting-ip': ip } });
  const b = browser(server);
  for (let i = 0; i < 20; i++) assert.equal((await b.call('POST', '/api/auth/email/start', { email: `gm${i}@example.com` }, from('203.0.113.7'))).status, 200);
  const blocked = await b.call('POST', '/api/auth/email/start', { email: 'gm99@example.com' }, from('203.0.113.7'));
  assert.deepEqual([blocked.status, blocked.data.error], [429, 'too_many_codes'], 'a 21st address from one network is refused');
  assert.equal((await b.call('POST', '/api/auth/email/start', { email: 'gm99@example.com' }, from('198.51.100.2'))).status, 200, 'another network is fine');
  assert.ok(!server.sqlite.prepare('SELECT bucket FROM rate_events').all().some((r) => r.bucket.includes('203.0.113')), 'IPs are stored hashed');

  // 30 wrong guesses (6 addresses x 5) from one network, then even a right code is refused for an hour.
  for (let i = 0; i < 30; i++) await b.call('POST', '/api/auth/email/verify', { email: `gm${Math.floor(i / 5)}@example.com`, code: '000000' }, from('203.0.113.7'));
  const right = lastCode(server, 'gm10@example.com');
  assert.equal((await b.call('POST', '/api/auth/email/verify', { email: 'gm10@example.com', code: right }, from('203.0.113.7'))).data.error, 'too_many_attempts');
  assert.equal((await b.call('POST', '/api/auth/email/verify', { email: 'gm10@example.com', code: right }, from('198.51.100.2'))).status, 200, 'the right code from elsewhere still works');
  server.clock.ms += 61 * 60 * 1000;
  assert.equal((await b.call('POST', '/api/auth/email/start', { email: 'gm50@example.com' }, from('203.0.113.7'))).status, 200, 'resets after an hour');
});

test('access tokens expire; refresh rotates the cookie; replaying an old cookie ends the session', async () => {
  const server = await makeServer();
  const b = browser(server);
  await signIn(server, b, 'gm@example.com');
  assert.equal((await b.call('GET', '/api/me')).status, 200);
  server.clock.ms += 16 * 60 * 1000;
  assert.equal((await b.call('GET', '/api/me')).status, 401, 'access token expired');

  const stolen = b.state.cookie;
  const refreshed = await b.call('POST', '/api/auth/refresh');
  assert.equal(refreshed.status, 200);
  assert.notEqual(b.state.cookie, stolen, 'cookie rotated');
  assert.equal((await b.call('GET', '/api/me')).status, 200);

  const attacker = browser(server);
  attacker.state.cookie = stolen;
  assert.equal((await attacker.call('POST', '/api/auth/refresh')).status, 401, 'old cookie refused');
  assert.equal((await b.call('POST', '/api/auth/refresh')).status, 401, 'and the session it came from is ended');
});

test('sign-out and remote device sign-out take effect immediately', async () => {
  const server = await makeServer();
  const desktop = browser(server);
  const laptop = browser(server);
  await signIn(server, desktop, 'gm@example.com');
  await signIn(server, laptop, 'gm@example.com', 'Laptop');
  const laptopId = laptop.state.deviceId;

  assert.equal((await desktop.call('DELETE', `/api/devices/${laptopId}`)).status, 200);
  assert.equal((await laptop.call('GET', '/api/me')).status, 401, 'still-valid access token rejected');
  assert.equal((await laptop.call('POST', '/api/auth/refresh')).status, 401);
  assert.equal((await desktop.call('GET', '/api/devices')).data.devices.length, 1);

  await desktop.call('POST', '/api/auth/signout');
  assert.equal(desktop.state.cookie, null, 'cookie cleared');
  assert.equal((await desktop.call('GET', '/api/me')).status, 401);
});

test('a user can only see and change their own devices; policies are validated', async () => {
  const server = await makeServer();
  const alice = browser(server);
  const bob = browser(server);
  await signIn(server, alice, 'alice@example.com');
  await signIn(server, bob, 'bob@example.com');
  assert.equal((await bob.call('PATCH', `/api/devices/${alice.state.deviceId}`, { name: 'mine now' })).status, 404);
  assert.equal((await bob.call('DELETE', `/api/devices/${alice.state.deviceId}`)).status, 404);

  const ok = await alice.call('PATCH', `/api/devices/${alice.state.deviceId}`, { name: 'Convention laptop', policy: { mode: 'focused', only: ['fiveleagues', 'fiveleagues'] } });
  assert.deepEqual(ok.data.device.policy, { mode: 'focused', excluded: [], only: ['fiveleagues'] });
  assert.equal((await alice.call('PATCH', `/api/devices/${alice.state.deviceId}`, { policy: { mode: 'everything' } })).data.error, 'bad_policy');
  assert.equal((await alice.call('PATCH', `/api/devices/${alice.state.deviceId}`, { policy: { mode: 'follow', excluded: ['nope'] } })).data.error, 'unknown_license');
});

test('attested licenses follow the account into every device\'s signed certificate, until deactivated', async () => {
  const server = await makeServer();
  const verifyKey = await importVerifyKey(server.publicJwk);
  const desktop = browser(server);
  const laptop = browser(server);
  await signIn(server, desktop, 'gm@example.com');
  await signIn(server, laptop, 'gm@example.com', 'Laptop');

  assert.equal((await desktop.call('POST', '/api/entitlements/attest', { licenses: ['starforged'] })).data.error, 'unknown_license', 'open licenses are never stored');
  const attested = await desktop.call('POST', '/api/entitlements/attest', { licenses: ['fiveleagues', 'hostile', 'fiveleagues'] });
  assert.deepEqual(attested.data, { added: ['fiveleagues', 'hostile'], licenses: ['fiveleagues', 'hostile'] });
  assert.deepEqual((await desktop.call('POST', '/api/entitlements/attest', { licenses: ['hostile'] })).data.added, [], 'idempotent');

  await laptop.call('PATCH', `/api/devices/${laptop.state.deviceId}`, { policy: { mode: 'follow', excluded: ['hostile'] } });
  const { cert } = (await laptop.call('GET', '/api/entitlements')).data;
  assert.equal(await verifyCertificate(cert, verifyKey), true, 'verifies with the pinned public key');
  const payload = JSON.parse(cert.payload);
  assert.deepEqual(payload.licenses, ['fiveleagues', 'hostile'], 'ownership is account-wide');
  assert.deepEqual(payload.policy.excluded, ['hostile'], 'the device policy rides along for effectiveLicenses()');
  assert.equal(payload.deviceId, laptop.state.deviceId);
  assert.equal(payload.kid, 'k-test');
  assert.equal(Date.parse(payload.expiresAt) - Date.parse(payload.issuedAt), 30 * 24 * 60 * 60 * 1000);

  const tampered = { ...cert, payload: cert.payload.replace('"hostile"', '"swn"') };
  assert.equal(await verifyCertificate(tampered, verifyKey), false, 'a doctored certificate fails');

  assert.equal((await desktop.call('DELETE', '/api/entitlements/licenses/hostile')).status, 200);
  assert.deepEqual(JSON.parse((await laptop.call('GET', '/api/entitlements')).data.cert.payload).licenses, ['fiveleagues'], 'deactivated everywhere');
  assert.equal((await desktop.call('DELETE', '/api/entitlements/licenses/hostile')).status, 404);
  const audit = server.sqlite.prepare('SELECT action FROM audit_log ORDER BY at').all().map((r) => r.action);
  assert.deepEqual(audit, ['entitlement.attest', 'entitlement.attest', 'entitlement.deactivate']);
});

test('requests from another site are refused; unknown routes and wrong methods answer cleanly', async () => {
  const server = await makeServer();
  const b = browser(server);
  await signIn(server, b, 'gm@example.com');
  const cross = await b.call('POST', '/api/auth/refresh', undefined, { headers: { origin: 'https://evil.example' } });
  assert.equal(cross.status, 403);
  assert.equal((await b.call('GET', '/api/nope')).status, 404);
  const wrongMethod = await b.call('GET', '/api/auth/refresh');
  assert.equal(wrongMethod.status, 405);
  assert.equal((await b.call('POST', '/api/auth/email/start', undefined, { headers: { 'content-type': 'text/plain' } })).status, 415);
});
