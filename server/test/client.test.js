// client.test.js — the browser's account client (src/core/account.js)
// driven against the real Worker and real SQL: sign-in, the certificate
// reaching licensing, reloads, offline, token expiry, remote sign-out.
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import { makeServer, lastCode } from './helpers.js';
import { createAccountClient, describeDevice } from '../../src/core/account.js';
import { effectiveLicenses } from '../../src/domain/licensing.js';
import { LICENSES } from '../../src/data/licenses.js';

const ORIGIN = 'https://gmatlas.test';
const [L1, L2, L3] = LICENSES.filter((l) => !l.open).map((l) => l.id);

/** The parts of store.js the client uses, in memory. */
function fakeStore(appConfig = {}) {
  const s = {
    appConfig, cert: null,
    getAppConfig: () => s.appConfig,
    updateAppConfig(fn) { s.appConfig = fn(structuredClone(s.appConfig)) || s.appConfig; },
    setCertificate(payload) { s.cert = payload || null; },
    owned: () => effectiveLicenses({ attested: s.appConfig.licenses, cert: s.cert, devicePolicy: s.cert && s.cert.policy }),
  };
  return s;
}

/** A browser profile's network: one cookie jar, same-origin Origin header,
 *  and a switch to drop off the network. */
function network(server) {
  const net = { cookie: null, down: false };
  net.fetch = async (url, init = {}) => {
    if (net.down) throw new TypeError('Failed to fetch');
    const headers = { ...(init.headers || {}) };
    if (net.cookie) headers.cookie = `gm_refresh=${net.cookie}`;
    if (init.method && init.method !== 'GET') headers.origin = ORIGIN;
    const res = await worker.fetch(new Request(url, { method: init.method, headers, body: init.body }), server.env);
    const set = res.headers.get('set-cookie');
    if (set) net.cookie = decodeURIComponent(/gm_refresh=([^;]*)/.exec(set)[1]) || null;
    return res;
  };
  return net;
}

function client(server, store, net, extra = {}) {
  return createAccountClient({
    store, fetch: net.fetch, baseUrl: ORIGIN, locks: null,
    location: { protocol: 'https:' },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
    publicKeys: [{ kid: 'k-test', ...server.publicJwk }],
    ...extra,
  });
}

async function signIn(server, c, email = 'gm@example.com') {
  await c.requestCode(email);
  return c.verifyCode(email, lastCode(server, email));
}

test('describeDevice names the platform and browser', () => {
  assert.equal(describeDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36 Edg/140.0').name, 'Windows · Edge');
  assert.equal(describeDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1').name, 'iOS · Safari');
  assert.deepEqual(describeDevice(''), { name: 'Browser', platform: null });
});

test('under file:// the client is unavailable and never calls the network', async () => {
  const server = await makeServer();
  const net = network(server);
  net.down = true;
  const c = client(server, fakeStore(), net, { location: { protocol: 'file:' } });
  assert.equal((await c.start()).status, 'unavailable');
});

test('a static copy with no /api answers no_service', async () => {
  const server = await makeServer();
  const c = client(server, fakeStore(), { fetch: async () => new Response('<h1>404</h1>', { status: 404, headers: { 'content-type': 'text/html' } }) });
  await c.start();
  await assert.rejects(c.requestCode('gm@example.com'), { code: 'no_service' });
});

test('sign-in creates the account, saves this device, and the certificate decides licenses', async () => {
  const server = await makeServer();
  const store = fakeStore({ licenses: { [L1]: true, [L2]: true } });
  const c = client(server, store, network(server));
  assert.equal((await c.start()).status, 'signed-out');
  assert.deepEqual(store.owned(), { [L1]: true, [L2]: true }, 'signed out: this install\'s ticks');

  await assert.rejects(c.verifyCode('gm@example.com', '000000'), { code: 'bad_code' });
  const { newAccount } = await signIn(server, c);
  assert.equal(newAccount, true);
  const s = c.getState();
  assert.equal(s.status, 'signed-in');
  assert.equal(s.user.email, 'gm@example.com');
  assert.equal(s.device.name, 'Windows · Chrome');
  assert.equal(store.appConfig.account.deviceId, s.device.id);
  assert.ok(store.appConfig.account.cert.sig, 'the signed certificate is kept for offline use');
  assert.equal(JSON.stringify(store.appConfig).includes(s.user.id) && !JSON.stringify(store.appConfig).includes('accessToken'), true, 'the access token is never stored');
  assert.deepEqual(store.owned(), {}, 'a new account owns nothing yet; ticks are offered, not merged');

  assert.deepEqual(c.liftInCandidates(), [L1, L2].sort());
  await c.attest(c.liftInCandidates());
  assert.deepEqual(store.owned(), { [L1]: true, [L2]: true });
  assert.deepEqual(c.liftInCandidates(), []);

  await c.setDevicePolicy({ mode: 'follow', excluded: [L2] });
  assert.deepEqual(store.owned(), { [L1]: true }, 'hidden on this device only');
  await c.deactivate(L1);
  assert.deepEqual(store.owned(), {});
  await c.updateProfile({ displayName: 'The GM' });
  assert.equal(c.getState().user.displayName, 'The GM');
});

test('a reload restores the session; offline it runs on the cached certificate', async () => {
  const server = await makeServer();
  const store = fakeStore();
  const net = network(server);
  const first = client(server, store, net);
  await first.start();
  await signIn(server, first);
  await first.attest([L3]);

  // Reload: a new client, same browser profile (store + cookie jar).
  const second = client(server, store, net);
  const back = await second.start();
  assert.equal(back.status, 'signed-in');
  assert.equal(back.offline, false);
  assert.deepEqual(back.cert.licenses, [L3]);

  // Offline reload: still signed in, licenses from the cached certificate.
  store.cert = null;
  net.down = true;
  const third = client(server, store, net);
  const offline = await third.start();
  assert.equal(offline.status, 'signed-in');
  assert.equal(offline.offline, true);
  assert.deepEqual(store.owned(), { [L3]: true });

  // A tampered cached certificate is ignored.
  store.cert = null;
  store.appConfig.account.cert = { ...store.appConfig.account.cert, payload: store.appConfig.account.cert.payload.replace(`"${L3}"`, `"${L3}","${L1}"`) };
  await client(server, store, net).start();
  assert.equal(store.cert, null);
});

test('an expired access token refreshes itself; a remote sign-out signs this browser out', async () => {
  const server = await makeServer();
  const deskStore = fakeStore();
  const desk = client(server, deskStore, network(server));
  await desk.start();
  await signIn(server, desk);
  const deskId = desk.getState().device.id;

  server.clock.ms += 16 * 60 * 1000;
  assert.equal((await desk.listDevices()).length, 1, 'refreshed transparently');

  const laptop = client(server, fakeStore(), network(server));
  await laptop.start();
  await signIn(server, laptop);
  const devices = await laptop.listDevices();
  assert.deepEqual(devices.map((d) => d.current).sort(), [false, true]);
  await laptop.renameDevice(deskId, 'Study desktop');
  await laptop.revokeDevice(deskId);

  await assert.rejects(desk.listDevices(), { status: 401 });
  assert.equal(desk.getState().status, 'signed-out');
  assert.equal(deskStore.cert, null, 'licenses fall back to this install\'s ticks');
  assert.equal(deskStore.appConfig.account.user, null);
  assert.equal(deskStore.appConfig.account.deviceId, deskId, 'the device id is kept');
});

test('signing out and back in on the same browser reuses its device', async () => {
  const server = await makeServer();
  const store = fakeStore();
  const c = client(server, store, network(server));
  await c.start();
  await signIn(server, c);
  const id = c.getState().device.id;
  await c.signOut();
  assert.equal(c.getState().status, 'signed-out');
  const again = await signIn(server, c);
  assert.equal(again.newAccount, false);
  assert.equal(c.getState().device.id, id);
});
