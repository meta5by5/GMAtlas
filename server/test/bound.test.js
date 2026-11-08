// bound.test.js — device-bound sessions (roadmap 3.2; design/adr/
// device-bound-sessions.md), the real account client against the real
// Worker: a refresh cookie alone can't renew a session anywhere else.
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import { makeServer, lastCode } from './helpers.js';
import { createAccountClient } from '../../src/core/account.js';
import { base64url } from '../src/crypto.js';

const ORIGIN = 'https://gmatlas.test';

/** The parts of store.js the client uses, in memory; `keys: false` is an
 *  older store without a key record. */
function fakeStore({ keys = true } = {}) {
  const s = { appConfig: {}, keyRecord: {} };
  s.getAppConfig = () => s.appConfig;
  s.updateAppConfig = (fn) => { s.appConfig = fn(structuredClone(s.appConfig)) || s.appConfig; };
  s.setCertificate = () => {};
  if (keys) {
    s.getSyncKeys = async () => s.keyRecord;
    s.setSyncKeys = async (patch) => { s.keyRecord = { ...s.keyRecord, ...patch }; return s.keyRecord; };
  }
  return s;
}

function network(server) {
  const net = { cookie: null, sent: [] };
  net.fetch = async (url, init = {}) => {
    const headers = { ...(init.headers || {}) };
    if (net.cookie) headers.cookie = `gm_refresh=${net.cookie}`;
    if (init.method && init.method !== 'GET') headers.origin = ORIGIN;
    if (String(url).endsWith('/api/auth/refresh')) net.sent.push(init.body);
    const res = await worker.fetch(new Request(url, { method: init.method, headers, body: init.body }), server.env);
    const set = res.headers.get('set-cookie');
    if (set) net.cookie = decodeURIComponent(/gm_refresh=([^;]*)/.exec(set)[1]) || null;
    return res;
  };
  return net;
}

const client = (server, store, net) => createAccountClient({
  store, fetch: net.fetch, baseUrl: ORIGIN, locks: null, location: { protocol: 'https:' },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/140.0', publicKeys: [{ kid: 'k-test', ...server.publicJwk }],
});

async function signIn(server, c, email = 'gm@example.com') {
  await c.requestCode(email);
  return c.verifyCode(email, lastCode(server, email));
}

/** A raw refresh with a given cookie and body, as a thief would send it. */
async function refreshWith(server, cookie, body) {
  const res = await worker.fetch(new Request(`${ORIGIN}/api/auth/refresh`, {
    method: 'POST', headers: { cookie: `gm_refresh=${cookie}`, origin: ORIGIN, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), server.env);
  return { status: res.status, data: await res.json() };
}

async function otherKeyProof(ts) {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, new TextEncoder().encode(`gmatlas-refresh:v1:${ts}`));
  return { deviceKey: { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y }, proof: { ts, sig: base64url(sig) } };
}

const session = (server) => server.sqlite.prepare('SELECT * FROM sessions ORDER BY created_at DESC LIMIT 1').get();

test('a session is bound to its browser’s key at sign-in, and every refresh proves it', async () => {
  const server = await makeServer();
  const store = fakeStore();
  const net = network(server);
  const c = client(server, store, net);
  await c.start();
  await signIn(server, c);
  const s = session(server);
  assert.ok(s.bound_key, 'bound at sign-in');
  assert.deepEqual(JSON.parse(s.bound_key), store.keyRecord.sessionKey.publicJwk);
  assert.equal(store.keyRecord.sessionKey.privateKey.extractable, false, 'the private key can’t be exported');

  // A reload: a fresh client on the same browser profile refreshes with a proof.
  const again = client(server, store, net);
  assert.equal((await again.start()).status, 'signed-in');
  const proofAt = session(server).proof_at;
  assert.ok(proofAt > 0, 'the proof was taken');
  assert.ok(JSON.parse(net.sent.at(-1)).proof.sig, 'the refresh carried a signature');

  // The cookie stolen: no proof, or a proof from another key, gets nothing.
  const stolen = net.cookie;
  assert.equal((await refreshWith(server, stolen)).data.error, 'device_proof');
  assert.equal((await refreshWith(server, stolen, await otherKeyProof(Date.now() + 5000))).data.error, 'device_proof');
  // ... and a captured proof can't be replayed.
  const replay = await refreshWith(server, stolen, JSON.parse(net.sent.at(-1)));
  assert.equal(replay.status, 409);
  assert.equal(replay.data.error, 'stale_proof');
  // The real browser was never signed out by any of that.
  assert.equal(session(server).revoked_at, null);
  const third = client(server, store, net);
  assert.equal((await third.start()).status, 'signed-in');
});

test('a device whose clock is behind signs again just after the last proof', async () => {
  const server = await makeServer();
  const store = fakeStore();
  const net = network(server);
  const c = client(server, store, net);
  await c.start();
  await signIn(server, c);
  await client(server, store, net).start();
  const future = Date.now() + 10 * 24 * 3600 * 1000;
  server.sqlite.prepare('UPDATE sessions SET proof_at = ?').run(future);
  assert.equal((await client(server, store, net).start()).status, 'signed-in');
  assert.equal(session(server).proof_at, future + 1);
});

test('a session from before binding binds at its next signed refresh; a browser without WebCrypto still works', async () => {
  const server = await makeServer();
  const net = network(server);
  // An older client: no key record, so no key.
  const oldStore = fakeStore({ keys: false });
  const old = client(server, oldStore, net);
  await old.start();
  await signIn(server, old);
  assert.equal(session(server).bound_key, null);
  assert.equal((await client(server, oldStore, net).start()).status, 'signed-in', 'unbound: a plain refresh still works');
  assert.equal(session(server).bound_key, null);

  // This browser updates (same saved account, now with a key record): its
  // next refresh binds the session.
  const store = fakeStore();
  store.appConfig = structuredClone(oldStore.appConfig);
  assert.equal((await client(server, store, net).start()).status, 'signed-in');
  assert.ok(session(server).bound_key, 'bound now');
  assert.equal((await refreshWith(server, net.cookie)).data.error, 'device_proof', 'and a plain refresh no longer works');
});

test('without a key the client signs in unbound (no WebCrypto, no key store)', async () => {
  const server = await makeServer();
  const net = network(server);
  const c = client(server, fakeStore({ keys: false }), net);
  await c.start();
  await signIn(server, c);
  assert.equal(session(server).bound_key, null);
  assert.equal((await client(server, fakeStore({ keys: false }), net).start()).status, 'signed-out', 'no saved user in a fresh store: signed out, as before');
});
