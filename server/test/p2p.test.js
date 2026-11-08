// p2p.test.js — Phase S3 item 2 on the server: the campaign room relays
// sealed transfer set-up messages between the owner's open devices, only
// while the account has p2p.transfer; the ticket carries that; and the ICE
// servers endpoint (STUN always, TURN only when configured).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeServer, browser, signIn } from './helpers.js';
import { checkTicket } from '../src/sync.js';

const jwk = (n) => ({ kty: 'EC', crv: 'P-256', x: `x${n}`.padEnd(43, 'A'), y: `y${n}`.padEnd(43, 'B') });
const wrapped = (n) => ({ v: 1, alg: 'ECDH-ES+A256GCM', iv: `iv${n}`, ct: `ct${n}` });
const setFlag = (server, key, on) => server.sqlite.prepare("INSERT OR REPLACE INTO feature_flags (key, default_value, kill, overrides, updated_at) VALUES (?, ?, 0, '{}', '2026-11-07T00:00:00Z')").run(key, on ? 1 : 0);

async function hello(rooms, cid, id, p2p = true) {
  const ws = rooms.connect(cid, id, { p2p });
  await ws.deliver({ t: 'hello', v: 1, cursor: 0 });
  return ws;
}

test('room: signals go to the named device, or every other one with "*", and nowhere else', async () => {
  const server = await makeServer();
  const { rooms } = server;
  const desk = await hello(rooms, 'cmp_s', 'devA');
  const phone = await hello(rooms, 'cmp_s', 'devB');
  const laptop = await hello(rooms, 'cmp_s', 'devC');
  const other = await hello(rooms, 'cmp_other', 'devB');
  for (const ws of [desk, phone, laptop, other]) ws.take();

  await phone.deliver({ t: 'signal', to: 'devA', data: 'SEALED-1' });
  assert.deepEqual(desk.take(), [{ t: 'signal', from: 'devB', data: 'SEALED-1' }]);
  assert.deepEqual(laptop.take(), [], 'not for the laptop');
  assert.deepEqual(phone.take(), [], 'not echoed back');
  assert.deepEqual(other.take(), [], 'never into another campaign’s room');

  await phone.deliver({ t: 'signal', to: '*', data: 'SEALED-2' });
  assert.deepEqual(desk.take(), [{ t: 'signal', from: 'devB', data: 'SEALED-2' }]);
  assert.deepEqual(laptop.take(), [{ t: 'signal', from: 'devB', data: 'SEALED-2' }]);
  assert.deepEqual(phone.take(), []);

  await phone.deliver({ t: 'signal', to: 'devZ', data: 'x', ref: 'r1' });
  assert.deepEqual(phone.take(), [{ t: 'signal-gone', to: 'devZ', ref: 'r1' }], 'nobody there: the sender hears so');

  await phone.deliver({ t: 'signal', to: 'devA', data: 'x'.repeat(64 * 1024 + 1) });
  assert.equal(phone.take()[0].code, 'bad_signal', 'too large');
  await phone.deliver({ t: 'signal', to: 'devA', data: { not: 'a string' } });
  assert.equal(phone.take()[0].code, 'bad_signal', 'the payload is an opaque sealed string');
  assert.deepEqual(desk.take(), []);
});

test('room: a socket without p2p.transfer can neither send nor receive signals', async () => {
  const server = await makeServer();
  const { rooms } = server;
  const desk = await hello(rooms, 'cmp_f', 'devA', true);
  const old = await hello(rooms, 'cmp_f', 'devB', false);
  desk.take(); old.take();
  await old.deliver({ t: 'signal', to: 'devA', data: 'x' });
  assert.equal(old.take()[0].code, 'feature_off');
  assert.deepEqual(desk.take(), []);
  await desk.deliver({ t: 'signal', to: 'devB', data: 'x', ref: 'r' });
  assert.deepEqual(desk.take(), [{ t: 'signal-gone', to: 'devB', ref: 'r' }]);
  assert.deepEqual(old.take(), []);
  // Presence still lists both: only transfer is off.
  await desk.deliver({ t: 'hello', v: 1, cursor: 0 });
  assert.deepEqual(desk.take().find((f) => f.t === 'presence').devices, ['devA', 'devB']);
});

test('tickets say whether the socket may relay transfers, following the feature flag', async () => {
  const server = await makeServer();
  const desk = browser(server);
  await signIn(server, desk, 'gm@example.com', 'Desk');
  await desk.call('PUT', '/api/devices/key', { ecdhPub: jwk(1) });
  await desk.call('POST', '/api/vault', { mine: wrapped(1), recovery: wrapped('r') });
  await desk.call('POST', '/api/campaigns', { id: 'cmp_t', sealedKey: wrapped('k'), metaEnv: wrapped('m') });
  const ctx = { env: server.env, now: server.env.now };
  const ticket = async () => checkTicket((await desk.call('POST', '/api/sync/ticket', { campaignId: 'cmp_t' })).data.ticket, ctx);
  assert.equal((await ticket()).p2p, false, 'off by default (catalog default)');
  setFlag(server, 'p2p.transfer', true);
  assert.equal((await ticket()).p2p, true);
});

test('ICE servers: feature-gated; STUN only without TURN secrets; TURN credentials minted when set', async () => {
  const server = await makeServer();
  const desk = browser(server);
  await signIn(server, desk, 'gm@example.com', 'Desk');
  assert.equal((await desk.call('GET', '/api/p2p/ice')).data.error, 'feature_off');
  setFlag(server, 'p2p.transfer', true);
  const plain = (await desk.call('GET', '/api/p2p/ice')).data;
  assert.equal(plain.relay, false);
  assert.deepEqual(plain.iceServers, [{ urls: ['stun:stun.cloudflare.com:3478'] }]);

  const calls = [];
  server.env.TURN_KEY_ID = 'key1';
  server.env.TURN_KEY_API_TOKEN = 'tok';
  server.env.TURN_FETCH = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ iceServers: [{ urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turns:turn.cloudflare.com:443?transport=tcp'], username: 'u', credential: 'c' }] }), { status: 201 });
  };
  const turned = (await desk.call('GET', '/api/p2p/ice')).data;
  assert.equal(turned.relay, true);
  assert.equal(turned.iceServers.length, 2);
  assert.equal(turned.iceServers[1].username, 'u');
  assert.match(calls[0].url, /\/turn\/keys\/key1\/credentials\/generate-ice-servers$/);
  assert.equal(calls[0].init.headers.authorization, 'Bearer tok');
  assert.equal(JSON.parse(calls[0].init.body).ttl, 14400);

  server.env.TURN_FETCH = async () => new Response('down', { status: 503 });
  const fallback = (await desk.call('GET', '/api/p2p/ice')).data;
  assert.equal(fallback.relay, false, 'TURN down: still direct connections');
  assert.equal(fallback.iceServers.length, 1);
});
