// sync.test.js — Phase S2 server: the vault and device approval, the synced
// campaign index, snapshots, socket tickets, and the room's op log.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeServer, browser, signIn } from './helpers.js';
import { checkTicket } from '../src/sync.js';
import { COMPACT_EVERY, MAX_FRAME_CHARS } from '../src/roomCore.js';

const jwk = (n) => ({ kty: 'EC', crv: 'P-256', x: `x${n}`.padEnd(43, 'A'), y: `y${n}`.padEnd(43, 'B') });
const wrapped = (n) => ({ v: 1, alg: 'ECDH-ES+A256GCM', iv: `iv${n}`, ct: `ct${n}` });

async function syncDevice(server, email, name, n) {
  const b = browser(server);
  await signIn(server, b, email, name);
  assert.equal((await b.call('PUT', '/api/devices/key', { ecdhPub: jwk(n) })).status, 200);
  return b;
}

test('vault: first device creates it; a second device is approved by the first, never by itself', async () => {
  const server = await makeServer();
  const desk = await syncDevice(server, 'gm@example.com', 'Desk', 1);
  assert.equal((await desk.call('PUT', '/api/devices/key', { ecdhPub: { ...jwk(1), d: 'secret' } })).data.error, 'bad_key', 'private keys are refused');
  assert.equal((await desk.call('PUT', '/api/devices/key', { ecdhPub: jwk(9) })).data.error, 'key_exists', 'a device key is set once');
  assert.equal((await desk.call('GET', '/api/vault')).data.exists, false);
  assert.equal((await desk.call('POST', '/api/vault', { mine: wrapped(1), recovery: wrapped('r') })).status, 200);
  assert.equal((await desk.call('POST', '/api/vault', { mine: wrapped(1), recovery: wrapped('r') })).data.error, 'vault_exists');
  assert.deepEqual((await desk.call('GET', '/api/vault')).data.mine, wrapped(1));

  const phone = await syncDevice(server, 'gm@example.com', 'Phone', 2);
  const before = (await phone.call('GET', '/api/vault')).data;
  assert.equal(before.exists, true);
  assert.equal(before.mine, null);
  const phoneRow = before.devices.find((d) => d.current);
  assert.equal(phoneRow.approved, false);
  assert.deepEqual(phoneRow.ecdhPub, jwk(2));
  assert.equal((await phone.call('PUT', `/api/vault/devices/${phoneRow.id}`, { wrapped: wrapped(2) })).data.error, 'not_approved', 'an unapproved device can\'t approve anyone');
  assert.equal((await desk.call('PUT', `/api/vault/devices/${phoneRow.id}`, { wrapped: wrapped(2) })).status, 200);
  assert.deepEqual((await phone.call('GET', '/api/vault')).data.mine, wrapped(2));

  // Recovery path: a third device fetches the recovery wrap and stores its own.
  const laptop = await syncDevice(server, 'gm@example.com', 'Laptop', 3);
  assert.deepEqual((await laptop.call('GET', '/api/vault/recovery')).data.wrapped, wrapped('r'));
  assert.equal((await laptop.call('PUT', '/api/vault/mine', { wrapped: wrapped(3) })).status, 200);
  assert.deepEqual((await laptop.call('GET', '/api/vault')).data.mine, wrapped(3));

  // Signing a device out removes its copy of the vault key.
  await desk.call('DELETE', `/api/devices/${phoneRow.id}`);
  assert.equal(server.sqlite.prepare('SELECT COUNT(*) AS n FROM vault_keys WHERE slot = ?').get(phoneRow.id).n, 0);

  // Another account sees none of it.
  const other = await syncDevice(server, 'other@example.com', 'Other', 4);
  assert.equal((await other.call('GET', '/api/vault')).data.exists, false);
  assert.equal((await other.call('GET', '/api/vault/recovery')).status, 404);
});

test('campaigns: register, list, conflicts, snapshots, stop syncing, reset', async () => {
  const server = await makeServer();
  const desk = await syncDevice(server, 'gm@example.com', 'Desk', 1);
  const body = { id: 'cmp_abc', sealedKey: wrapped('k'), metaEnv: wrapped('m') };
  assert.equal((await desk.call('POST', '/api/campaigns', body)).data.error, 'not_approved', 'sync must be set up first');
  await desk.call('POST', '/api/vault', { mine: wrapped(1), recovery: wrapped('r') });
  assert.equal((await desk.call('POST', '/api/campaigns', body)).status, 200);
  assert.equal((await desk.call('POST', '/api/campaigns', body)).data.error, 'campaign_exists');
  assert.equal((await desk.call('POST', '/api/campaigns', { ...body, id: 'bad id!' })).data.error, 'bad_id');

  const other = await syncDevice(server, 'other@example.com', 'Other', 2);
  await other.call('POST', '/api/vault', { mine: wrapped(2), recovery: wrapped('r2') });
  assert.equal((await other.call('POST', '/api/campaigns', body)).data.error, 'id_taken');
  assert.equal((await other.call('GET', '/api/campaigns/cmp_abc/snapshot')).status, 404, 'not theirs');

  assert.equal((await desk.call('GET', '/api/campaigns/cmp_abc/snapshot')).status, 404, 'no snapshot yet');
  assert.equal((await desk.call('PUT', '/api/campaigns/cmp_abc/snapshot?upto=5', 'env')).data.error, 'bad_upto', 'a snapshot can\'t be ahead of the log');
  assert.equal((await desk.call('PUT', '/api/campaigns/cmp_abc/snapshot?upto=0', 'first-snapshot')).status, 200);
  assert.deepEqual((await desk.call('GET', '/api/campaigns/cmp_abc/snapshot')).data, { upto: 0, env: '"first-snapshot"' });

  await desk.call('PATCH', '/api/campaigns/cmp_abc', { metaEnv: wrapped('m2') });
  const list = (await desk.call('GET', '/api/campaigns')).data.campaigns;
  assert.deepEqual(list.map((c) => [c.id, c.metaEnv.ct]), [['cmp_abc', 'ctm2']]);
  assert.deepEqual((await other.call('GET', '/api/campaigns')).data.campaigns, []);

  assert.equal((await desk.call('DELETE', '/api/campaigns/cmp_abc')).status, 200);
  assert.deepEqual((await desk.call('GET', '/api/campaigns')).data.campaigns, []);
  assert.equal(server.rooms.room('cmp_abc').ensureCore().head(), 0, 'the room\'s log is gone');

  await desk.call('POST', '/api/campaigns', { ...body, id: 'cmp_two' });
  assert.equal((await desk.call('DELETE', '/api/vault')).data.campaigns, 1);
  assert.equal((await desk.call('GET', '/api/vault')).data.exists, false);
  assert.deepEqual((await desk.call('GET', '/api/campaigns')).data.campaigns, []);
});

test('socket tickets: one campaign, one minute, owner only, never an access token', async () => {
  const server = await makeServer();
  const desk = await syncDevice(server, 'gm@example.com', 'Desk', 1);
  await desk.call('POST', '/api/vault', { mine: wrapped(1), recovery: wrapped('r') });
  await desk.call('POST', '/api/campaigns', { id: 'cmp_t', sealedKey: wrapped('k'), metaEnv: wrapped('m') });
  const { ticket } = (await desk.call('POST', '/api/sync/ticket', { campaignId: 'cmp_t' })).data;
  const ctx = { env: server.env, now: server.env.now };
  const claims = await checkTicket(ticket, ctx);
  assert.equal(claims.cid, 'cmp_t');
  assert.equal(claims.did, desk.state.deviceId);
  assert.equal((await desk.call('GET', '/api/me', undefined, { headers: { authorization: `Bearer ${ticket}` }, auth: false })).status, 401);
  assert.equal((await desk.call('POST', '/api/sync/ticket', { campaignId: 'cmp_nope' })).status, 404);
  assert.equal((await desk.call('GET', `/api/sync/socket?ticket=${ticket}`)).status, 426, 'a plain GET is not an upgrade');
  server.clock.ms += 61 * 1000;
  await assert.rejects(checkTicket(ticket, ctx), { code: 'bad_ticket' });
  await assert.rejects(checkTicket('junk', ctx), { code: 'bad_ticket' });
});

test('room: push, ack, fan-out, dedupe, catch-up in frames, resets, compaction', async () => {
  const server = await makeServer();
  const { rooms } = server;
  const desk = rooms.connect('cmp_r', 'devA');
  const phone = rooms.connect('cmp_r', 'devB');
  await desk.deliver({ t: 'hello', v: 1, cursor: 0 });
  assert.deepEqual(desk.take(), [{ t: 'welcome', head: 0 }, { t: 'caughtUp', head: 0 }]);

  await desk.deliver({ t: 'push', batchId: 'b1', env: 'E1' });
  assert.deepEqual(desk.take(), [{ t: 'ack', batchId: 'b1', seq: 1 }]);
  assert.deepEqual(phone.take(), [{ t: 'ops', ops: [{ seq: 1, env: 'E1', from: 'devA' }] }]);
  await desk.deliver({ t: 'push', batchId: 'b1', env: 'E1' });
  assert.deepEqual(desk.take(), [{ t: 'ack', batchId: 'b1', seq: 1 }], 'a resend is acked, not stored twice');
  assert.deepEqual(phone.take(), []);
  await phone.deliver({ t: 'push', batchId: 'b1', env: 'P1' });
  assert.deepEqual(phone.take(), [{ t: 'ack', batchId: 'b1', seq: 2 }], 'batch ids are per device');
  await desk.deliver({ t: 'push', env: 'x' });
  assert.equal(desk.take().pop().code, 'bad_push');
  desk.take();

  // A late device catches up from its cursor, in frames under the size cap.
  const big = 'x'.repeat(200 * 1024);
  for (let i = 0; i < 5; i++) await desk.deliver({ t: 'push', batchId: `big${i}`, env: big });
  desk.take();
  const late = rooms.connect('cmp_r', 'devC');
  await late.deliver({ t: 'hello', v: 1, cursor: 1 });
  const frames = late.take();
  assert.deepEqual(frames[0], { t: 'welcome', head: 7 });
  assert.deepEqual(frames.at(-1), { t: 'caughtUp', head: 7 });
  const opsFrames = frames.filter((f) => f.t === 'ops');
  assert.ok(opsFrames.length >= 2, 'split into several frames');
  assert.ok(opsFrames.every((f) => JSON.stringify(f).length < MAX_FRAME_CHARS + 1024));
  assert.deepEqual(opsFrames.flatMap((f) => f.ops.map((o) => o.seq)), [2, 3, 4, 5, 6, 7]);

  await late.deliver({ t: 'hello', v: 1, cursor: 99 });
  assert.equal(late.take()[0].t, 'reset', 'a cursor ahead of the log (a recreated room) resets');

  // Snapshots trim old ops; a device behind the trim point must reset.
  server.clock.ms += 31 * 24 * 60 * 60 * 1000;
  assert.equal((await rooms.get('cmp_r').fetch(new Request('https://room/snapshot?upto=7', { method: 'PUT', body: 'SNAP' }))).status, 200);
  await late.deliver({ t: 'hello', v: 1, cursor: 3 });
  assert.deepEqual(late.take(), [{ t: 'reset', snapshotUpto: 7 }]);
  await late.deliver({ t: 'hello', v: 1, cursor: 7 });
  assert.deepEqual(late.take(), [{ t: 'welcome', head: 7 }, { t: 'caughtUp', head: 7 }]);

  // Every COMPACT_EVERY ops past the snapshot, the pusher is asked for one.
  let asked = 0;
  for (let i = 0; i < COMPACT_EVERY; i++) {
    await desk.deliver({ t: 'push', batchId: `c${i}`, env: 'e' });
    asked += desk.take().filter((f) => f.t === 'snapshotReq').length;
  }
  assert.equal(asked, 1);
  await desk.deliver({ t: 'nonsense' });
  assert.equal(desk.take()[0].code, 'unknown_frame');
});

test('recovery key email: approved devices only, to the account address, never stored; a new key replaces the old', async () => {
  const server = await makeServer();
  const desk = await syncDevice(server, 'GM@Example.com', 'Desk', 1);
  const key = '7K3M-ABCD-EFGH-JKMN-PQRS-TVWX-YZ01-2345';
  assert.equal((await desk.call('POST', '/api/vault/recovery/email', { recoveryKey: key })).data.error, 'not_approved');
  await desk.call('POST', '/api/vault', { mine: wrapped(1), recovery: wrapped('r') });
  assert.equal((await desk.call('POST', '/api/vault/recovery/email', { recoveryKey: 'not-a-key' })).data.error, 'bad_key');
  const sent = await desk.call('POST', '/api/vault/recovery/email', { recoveryKey: key.toLowerCase() });
  assert.equal(sent.status, 200);
  assert.equal(sent.data.email, 'gm@example.com');
  const mail = server.mail.at(-1);
  assert.equal(mail.to, 'gm@example.com');
  assert.match(mail.subject, /recovery key/i);
  assert.ok(mail.text.includes(key));
  const everything = JSON.stringify(server.sqlite.prepare("SELECT * FROM vault_keys").all()) + JSON.stringify(server.sqlite.prepare('SELECT * FROM audit_log').all());
  assert.ok(!everything.includes(key), 'the key itself is never stored');

  const phone = await syncDevice(server, 'gm@example.com', 'Phone', 2);
  assert.equal((await phone.call('PUT', '/api/vault/recovery', { wrapped: wrapped('r2') })).data.error, 'not_approved');
  assert.equal((await desk.call('PUT', '/api/vault/recovery', { wrapped: wrapped('r2') })).status, 200);
  assert.deepEqual((await phone.call('GET', '/api/vault/recovery')).data.wrapped, wrapped('r2'));
});

test('health says which environment answered', async () => {
  const server = await makeServer();
  const b = browser(server);
  assert.deepEqual((await b.call('GET', '/api/health')).data, { ok: true, env: 'dev' });
  server.env.GMATLAS_ENV = 'production';
  assert.deepEqual((await b.call('GET', '/api/health')).data, { ok: true, env: 'production' });
});
