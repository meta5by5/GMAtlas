// admin.test.js — admin v1 (Phase S1 item 4): roles and permissions, users,
// entitlements (grant, trial, extend, revoke, convert, bulk), feature flags
// (and their effect on the certificate and on sync), the audit log.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeServer, browser, signIn } from './helpers.js';
import { parseGrantCsv } from '../src/admin.js';

const setRoles = (server, email, roles) => server.sqlite.prepare('UPDATE users SET roles = ? WHERE email = ?').run(JSON.stringify(roles), email);
const idOf = (server, email) => server.sqlite.prepare('SELECT id FROM users WHERE email = ?').get(email).id;
const DAY = 24 * 60 * 60 * 1000;

async function people() {
  const server = await makeServer();
  const owner = browser(server); await signIn(server, owner, 'owner@example.com');
  const gm = browser(server); await signIn(server, gm, 'gm@example.com');
  const helper = browser(server); await signIn(server, helper, 'help@example.com');
  setRoles(server, 'owner@example.com', ['owner']);
  setRoles(server, 'help@example.com', ['support']);
  return { server, owner, gm, helper, gmId: idOf(server, 'gm@example.com'), helperId: idOf(server, 'help@example.com') };
}

test('admin: only admin roles get in, and each role only what it may do', async () => {
  const { server, owner, gm, helper, gmId } = await people();
  assert.equal((await gm.call('GET', '/api/admin/me')).data.error, 'not_admin');
  assert.equal((await gm.call('GET', '/api/admin/users')).status, 403);
  const me = (await owner.call('GET', '/api/admin/me')).data;
  assert.deepEqual(me.roles, ['owner']);
  assert.ok(me.permissions.includes('roles.write'));
  const sup = (await helper.call('GET', '/api/admin/me')).data;
  assert.ok(sup.permissions.includes('grants.write') && !sup.permissions.includes('flags.write') && !sup.permissions.includes('roles.write'));
  assert.equal((await helper.call('PUT', '/api/admin/flags/tables', { kill: true, note: 'x' })).data.error, 'forbidden', 'support can’t touch flags');
  assert.equal((await helper.call('PUT', `/api/admin/users/${gmId}/roles`, { roles: ['admin'], note: 'x' })).data.error, 'forbidden', 'only an owner sets roles');
  setRoles(server, 'help@example.com', ['content']);
  assert.equal((await helper.call('GET', '/api/admin/users')).data.error, 'forbidden', 'content can’t browse users');
  assert.equal((await helper.call('PUT', '/api/admin/flags/tables', { kill: false, note: 'ok' })).status, 200, 'content can set flags');
  assert.equal((await helper.call('GET', '/api/admin/audit')).status, 200);
});

test('admin users: search, metadata only, disable signs out everywhere, sessions, roles with a last-owner guard', async () => {
  const { server, owner, gm, gmId } = await people();
  const found = (await owner.call('GET', '/api/admin/users?q=gm@')).data.users;
  assert.deepEqual(found.map((u) => u.email), ['gm@example.com']);
  assert.equal((await owner.call('GET', '/api/admin/users?q=%')).data.users.length, 0, 'LIKE wildcards are literal');
  assert.equal((await owner.call('GET', '/api/admin/users')).data.users.length, 3);
  const detail = (await owner.call('GET', `/api/admin/users/${gmId}`)).data;
  assert.equal(detail.user.email, 'gm@example.com');
  assert.equal(detail.devices.length, 1);
  assert.equal(detail.sessions.length, 1);
  assert.deepEqual(detail.identities.map((i) => i.provider), ['email']);
  assert.deepEqual(detail.enabledFeatures, ['sync.devices']);
  assert.deepEqual(detail.sync, { vault: false, recoveryKey: false, campaigns: [], settings: null });

  assert.equal((await owner.call('POST', `/api/admin/users/${gmId}/status`, { status: 'disabled' })).data.error, 'note_required');
  assert.equal((await owner.call('POST', `/api/admin/users/${gmId}/status`, { status: 'disabled', note: 'abuse report #12' })).status, 200);
  assert.equal((await gm.call('GET', '/api/me')).status, 401, 'disabled: signed out at once');
  assert.equal((await gm.call('POST', '/api/auth/refresh')).status, 401, 'and the refresh cookie is dead');
  assert.equal((await owner.call('POST', `/api/admin/users/${gmId}/status`, { status: 'active', note: 'resolved' })).status, 200);
  await signIn(server, gm, 'gm@example.com');
  assert.equal((await gm.call('GET', '/api/me')).status, 200, 'active again');
  const ownerId = idOf(server, 'owner@example.com');
  assert.equal((await owner.call('POST', `/api/admin/users/${ownerId}/status`, { status: 'disabled', note: 'x' })).data.error, 'self');

  assert.equal((await owner.call('POST', `/api/admin/users/${gmId}/sessions/revoke`, { note: 'lost laptop' })).data.revoked, 1);
  assert.equal((await gm.call('POST', '/api/auth/refresh')).status, 401);

  assert.equal((await owner.call('PUT', `/api/admin/users/${gmId}/roles`, { roles: ['wizard'], note: 'x' })).data.error, 'bad_roles');
  assert.deepEqual((await owner.call('PUT', `/api/admin/users/${gmId}/roles`, { roles: ['support', 'admin'], note: 'new hire' })).data.roles, ['admin', 'support']);
  assert.equal((await owner.call('PUT', `/api/admin/users/${ownerId}/roles`, { roles: [], note: 'x' })).data.error, 'last_owner');
});

test('admin entitlements: grant, trial, extend, revoke, convert; all validated, noted and audited; the certificate follows', async () => {
  const { server, owner, gm, gmId } = await people();
  const cert = async () => { await gm.call('POST', '/api/auth/refresh'); return JSON.parse((await gm.call('GET', '/api/entitlements')).data.cert.payload); };
  const grant = async (body) => { await owner.call('POST', '/api/auth/refresh'); return owner.call('POST', `/api/admin/users/${gmId}/entitlements`, body); };
  assert.equal((await grant({ kind: 'license', ref: 'ghost', note: 'x' })).data.error, 'unknown_ref', 'no ghost licenses');
  assert.equal((await grant({ kind: 'license', ref: 'starforged', note: 'x' })).data.error, 'unknown_ref', 'open licenses aren’t granted');
  assert.equal((await grant({ kind: 'potion', ref: 'x', note: 'x' })).data.error, 'bad_kind');
  assert.equal((await grant({ kind: 'feature', ref: 'tables', source: 'trial', note: 'x' })).data.error, 'bad_date', 'a trial needs an end');
  assert.equal((await grant({ kind: 'feature', ref: 'tables', source: 'trial', endsAt: '2020-01-01', note: 'x' })).data.error, 'bad_date', 'in the future');

  const lic = (await grant({ kind: 'license', ref: 'fiveleagues', note: 'press copy' })).data.id;
  const trialEnd = new Date(server.clock.ms + 7 * DAY).toISOString();
  const trial = (await grant({ kind: 'feature', ref: 'tables', source: 'trial', endsAt: trialEnd, note: 'beta tester' })).data.id;
  await grant({ kind: 'module', ref: 'hexcrawl', note: 'bundle' });
  let c = await cert();
  assert.deepEqual(c.licenses, ['fiveleagues']);
  assert.deepEqual(c.features, ['tables']);
  assert.deepEqual(c.enabledFeatures, ['sync.devices', 'tables'], 'a granted feature is on');
  assert.deepEqual(c.modules, ['hexcrawl']);

  const later = new Date(server.clock.ms + 30 * DAY).toISOString();
  assert.equal((await owner.call('POST', `/api/admin/entitlements/${trial}/extend`, { endsAt: later, note: 'more time' })).data.endsAt, later);
  server.clock.ms += 10 * DAY;
  assert.deepEqual((await cert()).features, ['tables'], 'the extension kept it past the old end');
  server.clock.ms += 25 * DAY;
  assert.deepEqual((await cert()).features, [], 'and it ends when it says');

  await owner.call('POST', '/api/auth/refresh');
  assert.equal((await owner.call('POST', `/api/admin/entitlements/${lic}/revoke`, { note: 'refund' })).status, 200);
  assert.equal((await owner.call('POST', `/api/admin/entitlements/${lic}/revoke`, { note: 'again' })).data.error, 'already_revoked');
  assert.deepEqual((await cert()).licenses, []);

  await gm.call('POST', '/api/entitlements/attest', { licenses: ['hostile'] });
  const attested = server.sqlite.prepare("SELECT id FROM entitlements WHERE ref = 'hostile'").get().id;
  assert.equal((await owner.call('POST', `/api/admin/entitlements/${lic}/convert`, { note: 'x' })).data.error, 'not_attested');
  assert.equal((await owner.call('POST', `/api/admin/entitlements/${attested}/convert`, { note: 'verified receipt' })).status, 200);
  assert.equal(server.sqlite.prepare('SELECT source FROM entitlements WHERE id = ?').get(attested).source, 'grant');

  const audit = (await owner.call('GET', `/api/admin/audit?target=${trial}`)).data.entries;
  assert.deepEqual(audit.map((a) => a.action), ['admin.entitlement.extend', 'admin.entitlement.grant']);
  assert.equal(audit[0].note, 'more time');
  assert.equal(audit[0].actorEmail, 'owner@example.com');
  assert.deepEqual(audit[0].after, { endsAt: later });
  const byAction = (await owner.call('GET', '/api/admin/audit?action=admin.entitlement')).data.entries;
  assert.ok(byAction.length >= 6 && byAction.every((a) => a.action.startsWith('admin.entitlement')));
  const page = (await owner.call('GET', '/api/admin/audit?limit=2')).data;
  assert.equal(page.entries.length, 2);
  assert.equal(page.more, true);
  const next = (await owner.call('GET', `/api/admin/audit?limit=2&before=${encodeURIComponent(page.entries[1].at)}`)).data.entries;
  assert.ok(next.every((a) => a.at < page.entries[1].at), 'pages go back in time');
});

test('admin bulk grant: CSV checked line by line, all or nothing, dry run', async () => {
  const { server, owner } = await people();
  const now = server.clock.ms;
  const parsed = parseGrantCsv('email,kind,ref,endsAt\n# comment\ngm@example.com,license,fiveleagues\nGM@example.com,feature,tables,2027-01-01\nbad,license,x\n', now);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[1].source, 'trial');
  assert.equal(parsed.rows[0].email, 'gm@example.com');
  assert.deepEqual(parsed.errors.map((e) => e.line), [4]);
  const bad = await owner.call('POST', '/api/admin/entitlements/bulk', { csv: 'gm@example.com,license,fiveleagues\nnobody@example.com,license,hostile', note: 'promo' });
  assert.deepEqual([bad.status, bad.data.ok], [200, false], 'a validation result, not a failure');
  assert.equal(bad.data.errors[0].error, 'No account with that email.');
  assert.equal(server.sqlite.prepare("SELECT COUNT(*) AS n FROM entitlements WHERE source = 'grant'").get().n, 0, 'nothing granted when any line is bad');
  const dry = await owner.call('POST', '/api/admin/entitlements/bulk', { csv: 'gm@example.com,license,fiveleagues\nhelp@example.com,module,trade', note: 'promo', dryRun: true });
  assert.deepEqual([dry.status, dry.data.valid, dry.data.errors.length], [200, 2, 0]);
  assert.equal(server.sqlite.prepare("SELECT COUNT(*) AS n FROM entitlements WHERE source = 'grant'").get().n, 0, 'a dry run writes nothing');
  assert.equal((await owner.call('POST', '/api/admin/entitlements/bulk', { csv: 'gm@example.com,license,fiveleagues\nhelp@example.com,module,trade', note: 'promo' })).data.granted, 2);
});

test('feature flags: kill switch, overrides by email, rollout, defaults; reach the certificate and gate sync', async () => {
  const { server, owner, gm, gmId } = await people();
  const flags = (await owner.call('GET', '/api/admin/flags')).data;
  assert.deepEqual(flags.features.map((f) => f.id), ['sync.devices', 'p2p.transfer', 'tables']);
  assert.deepEqual(flags.flags, {});
  assert.equal((await owner.call('PUT', '/api/admin/flags/ghost', { note: 'x' })).status, 404);
  assert.equal((await owner.call('PUT', '/api/admin/flags/tables', { rollout: 150, note: 'x' })).data.error, 'bad_rollout');
  assert.equal((await owner.call('PUT', '/api/admin/flags/tables', { overrides: { 'nobody@example.com': true }, note: 'x' })).data.error, 'unknown_user');

  const enabled = async () => JSON.parse((await gm.call('GET', '/api/entitlements')).data.cert.payload).enabledFeatures;
  await owner.call('PUT', '/api/admin/flags/tables', { overrides: { 'gm@example.com': true }, note: 'early access' });
  assert.deepEqual(await enabled(), ['sync.devices', 'tables'], 'an override by email turns it on for them');
  const stored = (await owner.call('GET', '/api/admin/flags')).data;
  assert.deepEqual(stored.flags.tables.overrides, { [gmId]: true }, 'stored by account id');
  assert.equal(stored.emails[gmId], 'gm@example.com');
  await owner.call('PUT', '/api/admin/flags/tables', { rollout: 100, note: 'everyone' });
  assert.deepEqual(await enabled(), ['sync.devices', 'tables'], 'a 100% rollout');
  await owner.call('PUT', '/api/admin/flags/tables', { rollout: 0, note: 'no one' });
  assert.deepEqual(await enabled(), ['sync.devices']);

  // The kill switch beats everything, and the server refuses sync writes.
  await gm.call('PUT', '/api/devices/key', { ecdhPub: { kty: 'EC', crv: 'P-256', x: 'x'.padEnd(43, 'A'), y: 'y'.padEnd(43, 'B') } });
  await owner.call('PUT', '/api/admin/flags/sync.devices', { kill: true, overrides: { 'gm@example.com': true }, note: 'incident' });
  assert.deepEqual(await enabled(), [], 'kill beats an override');
  const vault = await gm.call('POST', '/api/vault', { mine: { v: 1 }, recovery: { v: 1 } });
  assert.deepEqual([vault.status, vault.data.error], [403, 'feature_off']);
  await owner.call('PUT', '/api/admin/flags/sync.devices', { kill: false, note: 'resolved' });
  assert.equal((await gm.call('POST', '/api/vault', { mine: { v: 1 }, recovery: { v: 1 } })).status, 200);
  await owner.call('PUT', '/api/admin/flags/sync.devices', { defaultValue: false, note: 'invite only' });
  assert.equal((await gm.call('POST', '/api/campaigns', { id: 'cmp_x', sealedKey: { v: 1 }, metaEnv: { v: 1 } })).data.error, 'feature_off', 'default off: refused');
  await owner.call('POST', `/api/admin/users/${gmId}/entitlements`, { kind: 'feature', ref: 'sync.devices', note: 'invited' });
  assert.equal((await gm.call('POST', '/api/campaigns', { id: 'cmp_x', sealedKey: { v: 1 }, metaEnv: { v: 1 } })).status, 200, 'a feature grant turns it on');
  const log = (await owner.call('GET', '/api/admin/audit?target=sync.devices')).data.entries;
  assert.equal(log.length, 3);
  assert.deepEqual(log.at(-1).after.kill, true);
});
