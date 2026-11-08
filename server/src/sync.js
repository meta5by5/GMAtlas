// sync.js — the REST half of personal sync (roadmap 5.4-5.6; Phase S2).
// Everything stored is metadata or ciphertext the server can't open.
//
//   PUT    /api/devices/key               {ecdhPub}          this device's public key (once)
//   GET    /api/vault                     -> {exists, mine, recovery, devices}
//   POST   /api/vault                     {mine, recovery}   create (first device)
//   PUT    /api/vault/devices/:id         {wrapped}          approve another of your devices
//   GET    /api/vault/recovery            -> {wrapped}       to unlock with the recovery key
//   PUT    /api/vault/mine                {wrapped}          store this device's own wrap (after recovery)
//   DELETE /api/vault                     resets sync: vault, synced campaigns, rooms
//   GET    /api/campaigns                 -> {campaigns: [{id, sealedKey, metaEnv, ...}]}
//   POST   /api/campaigns                 {id, sealedKey, metaEnv}
//   PATCH  /api/campaigns/:id             {metaEnv}
//   DELETE /api/campaigns/:id             stops syncing it (server copy deleted)
//   GET    /api/campaigns/:id/snapshot    -> {upto, env}
//   PUT    /api/campaigns/:id/snapshot?upto=N   body: env text
//   GET    /api/account/settings?known=N  -> {version, sealedKey, env} | {version, unchanged} | {version: 0}
//   PUT    /api/account/settings          {baseVersion, sealedKey, env} -> {version}  (409 if stale)
//   POST   /api/sync/ticket               {campaignId} -> {ticket}  (60 s, one campaign)
//   GET    /api/sync/socket?ticket=...    WebSocket upgrade into the campaign's room

import { HttpError, json, readJson } from './http.js';
import { signAccessToken, verifyAccessToken } from './crypto.js';
import { requireFeature } from './features.js';

const iso = (ms) => new Date(ms).toISOString();
const MAX_SNAPSHOT_CHARS = 60 * 1024 * 1024;
const CAMPAIGN_ID = /^[\w-]{1,80}$/;

/** A JSON value the client produced (a wrapped key, an envelope), checked
 *  for shape and size only: the server can't and doesn't read it. */
function blob(value, name, max = 8192) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'bad_request', `${name} must be an object.`);
  const text = JSON.stringify(value);
  if (text.length > max) throw new HttpError(413, 'too_large', `${name} is too large.`);
  return text;
}

function publicJwk(value) {
  if (!value || value.kty !== 'EC' || value.crv !== 'P-256' || typeof value.x !== 'string' || typeof value.y !== 'string' || value.d) {
    throw new HttpError(400, 'bad_key', 'Send a P-256 public key.');
  }
  return JSON.stringify({ kty: 'EC', crv: 'P-256', x: value.x, y: value.y });
}

export async function putDeviceKey(request, { env }, { device }) {
  const body = await readJson(request);
  const key = publicJwk(body.ecdhPub);
  if (device.ecdh_pub && device.ecdh_pub !== key) throw new HttpError(409, 'key_exists', 'This device already has a sync key.');
  await env.DB.prepare('UPDATE devices SET ecdh_pub = ? WHERE id = ?').bind(key, device.id).run();
  return json({ ok: true });
}

async function vaultRows(env, userId) {
  const { results } = await env.DB.prepare('SELECT slot, wrapped FROM vault_keys WHERE user_id = ?').bind(userId).all();
  return new Map(results.map((r) => [r.slot, r.wrapped]));
}

export async function getVault(request, { env }, { user, device }) {
  const rows = await vaultRows(env, user.id);
  const { results } = await env.DB.prepare('SELECT id, name, platform, ecdh_pub, last_seen_at FROM devices WHERE user_id = ? AND revoked_at IS NULL ORDER BY last_seen_at DESC').bind(user.id).all();
  return json({
    exists: rows.size > 0,
    mine: rows.has(device.id) ? JSON.parse(rows.get(device.id)) : null,
    recovery: rows.has('recovery'),
    devices: results.map((d) => ({
      id: d.id, name: d.name, platform: d.platform, current: d.id === device.id, lastSeenAt: d.last_seen_at,
      ecdhPub: d.ecdh_pub ? JSON.parse(d.ecdh_pub) : null, approved: rows.has(d.id),
    })),
  });
}

export async function createVault(request, { env, now }, { user, device }) {
  await requireFeature(env, iso(now()), user.id, 'sync.devices');
  const body = await readJson(request);
  const mine = blob(body.mine, 'mine');
  const recovery = blob(body.recovery, 'recovery');
  if (!device.ecdh_pub) throw new HttpError(409, 'no_device_key', 'Register this device’s key first.');
  if ((await vaultRows(env, user.id)).size) throw new HttpError(409, 'vault_exists', 'Sync is already set up on this account.');
  const at = iso(now());
  await env.DB.batch([
    env.DB.prepare('INSERT INTO vault_keys (user_id, slot, wrapped, wrapped_by, created_at) VALUES (?, ?, ?, ?, ?)').bind(user.id, device.id, mine, device.id, at),
    env.DB.prepare('INSERT INTO vault_keys (user_id, slot, wrapped, wrapped_by, created_at) VALUES (?, ?, ?, ?, ?)').bind(user.id, 'recovery', recovery, device.id, at),
  ]);
  return json({ ok: true });
}

async function requireApproved(env, user, device) {
  const row = await env.DB.prepare('SELECT 1 AS ok FROM vault_keys WHERE user_id = ? AND slot = ?').bind(user.id, device.id).first();
  if (!row) throw new HttpError(403, 'not_approved', 'This device hasn’t been approved for sync yet.');
}

export async function approveDevice(request, { env, now }, { user, device }, targetId) {
  await requireApproved(env, user, device);
  const target = await env.DB.prepare('SELECT * FROM devices WHERE id = ? AND user_id = ? AND revoked_at IS NULL').bind(targetId, user.id).first();
  if (!target) throw new HttpError(404, 'not_found', 'No such device.');
  if (!target.ecdh_pub) throw new HttpError(409, 'no_device_key', 'That device hasn’t asked to sync yet.');
  const wrapped = blob((await readJson(request)).wrapped, 'wrapped');
  await env.DB.prepare('INSERT INTO vault_keys (user_id, slot, wrapped, wrapped_by, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (user_id, slot) DO UPDATE SET wrapped = excluded.wrapped, wrapped_by = excluded.wrapped_by')
    .bind(user.id, targetId, wrapped, device.id, iso(now())).run();
  return json({ ok: true });
}

export async function getRecovery(request, { env }, { user }) {
  const rows = await vaultRows(env, user.id);
  if (!rows.has('recovery')) throw new HttpError(404, 'not_found', 'Sync isn’t set up on this account.');
  return json({ wrapped: JSON.parse(rows.get('recovery')) });
}

/** After unlocking with the recovery key, a device stores its own wrap. */
export async function putOwnWrap(request, { env, now }, { user, device }) {
  if (!device.ecdh_pub) throw new HttpError(409, 'no_device_key', 'Register this device’s key first.');
  if (!(await vaultRows(env, user.id)).size) throw new HttpError(404, 'not_found', 'Sync isn’t set up on this account.');
  const wrapped = blob((await readJson(request)).wrapped, 'wrapped');
  await env.DB.prepare('INSERT INTO vault_keys (user_id, slot, wrapped, wrapped_by, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (user_id, slot) DO UPDATE SET wrapped = excluded.wrapped, wrapped_by = excluded.wrapped_by')
    .bind(user.id, device.id, wrapped, device.id, iso(now())).run();
  return json({ ok: true });
}

const RECOVERY_KEY = /^([0-9A-HJKMNP-TV-Z]{4}-){7}[0-9A-HJKMNP-TV-Z]{4}$/;

/** Emails a recovery key to the account's own address. The key passes
 *  through here once, in memory, and is never stored or logged. This is a
 *  deliberate trade (design/adr/personal-sync.md): the inbox now holds the
 *  key, so whoever controls the inbox can sign in AND unlock synced
 *  campaigns. Only an approved device can ask, so a stranger can't use it
 *  to spam an address. */
export async function emailRecoveryKey(request, { env }, { user, device }) {
  await requireApproved(env, user, device);
  const key = String((await readJson(request)).recoveryKey || '').trim().toUpperCase();
  if (!RECOVERY_KEY.test(key)) throw new HttpError(400, 'bad_key', 'That isn’t a recovery key.');
  await env.MAILER.send({
    to: user.email,
    subject: 'Your GMAtlas recovery key',
    text: [
      'Your GMAtlas recovery key is:',
      '',
      `    ${key}`,
      '',
      'Your synced campaigns are encrypted on your devices. A new device can read them once one of your other devices approves it, or with this key.',
      '',
      'Keep this email, or copy the key somewhere safe and delete the email. Anyone who can read this inbox can also sign in to your account, so protect it.',
      '',
      'A newer recovery key replaces this one. If you didn’t turn on sync for GMAtlas, you can ignore this email.',
    ].join('\n'),
  });
  return json({ ok: true, email: user.email });
}

/** Replaces the recovery key's wrap (a new key; the old one stops working). */
export async function putRecovery(request, { env, now }, { user, device }) {
  await requireApproved(env, user, device);
  const wrapped = blob((await readJson(request)).wrapped, 'wrapped');
  await env.DB.prepare("UPDATE vault_keys SET wrapped = ?, wrapped_by = ?, created_at = ? WHERE user_id = ? AND slot = 'recovery'")
    .bind(wrapped, device.id, iso(now()), user.id).run();
  return json({ ok: true });
}

const room = (env, campaignId) => env.CAMPAIGN_ROOMS.get(env.CAMPAIGN_ROOMS.idFromName(campaignId));
const roomUrl = (path) => `https://room${path}`;

async function destroyRoom(env, campaignId) {
  const res = await room(env, campaignId).fetch(new Request(roomUrl('/destroy'), { method: 'POST' }));
  if (!res.ok) throw new HttpError(502, 'room_error', 'Couldn’t clear the synced copy.');
}

/** Deletes the vault and every synced campaign, server side. Local copies
 *  on every device are untouched; they just stop syncing. */
export async function resetVault(request, { env }, { user }) {
  const { results } = await env.DB.prepare('SELECT id FROM campaigns WHERE owner_id = ?').bind(user.id).all();
  for (const c of results) await destroyRoom(env, c.id);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM campaigns WHERE owner_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM account_settings WHERE user_id = ?').bind(user.id),
    env.DB.prepare('DELETE FROM vault_keys WHERE user_id = ?').bind(user.id),
  ]);
  return json({ ok: true, campaigns: results.length });
}

// --- account settings ---------------------------------------------------------
// One encrypted record per account: the settings every device shares. A
// write names the version it merged (`baseVersion`, 0 for the first), and
// is refused with 409 version_conflict if another device wrote since.

const MAX_SETTINGS_CHARS = 1900 * 1000; // under D1's 2 MB row limit

/** GET /api/account/settings?known=N -> {version: 0} (none yet),
 *  {version, unchanged: true, sealedKey} when N is current, else
 *  {version, sealedKey, env}. */
export async function getAccountSettings(request, { env }, { user }) {
  const row = await env.DB.prepare('SELECT sealed_key, env, version FROM account_settings WHERE user_id = ?').bind(user.id).first();
  if (!row) return json({ version: 0 });
  const known = Number(new URL(request.url).searchParams.get('known'));
  const sealedKey = JSON.parse(row.sealed_key);
  if (known === row.version) return json({ version: row.version, unchanged: true, sealedKey });
  return json({ version: row.version, sealedKey, env: JSON.parse(row.env) });
}

/** PUT /api/account/settings {baseVersion, sealedKey, env} -> {version}.
 *  The sealed key is set by the first write and kept after that. */
export async function putAccountSettings(request, { env, now }, { user, device }) {
  await requireFeature(env, iso(now()), user.id, 'sync.devices');
  await requireApproved(env, user, device);
  const body = await readJson(request, MAX_SETTINGS_CHARS + 16 * 1024);
  const base = Number(body.baseVersion);
  if (!Number.isInteger(base) || base < 0) throw new HttpError(400, 'bad_request', 'baseVersion must be a whole number.');
  const envText = blob(body.env, 'env', MAX_SETTINGS_CHARS);
  const at = iso(now());
  let result;
  if (base === 0) {
    const sealed = blob(body.sealedKey, 'sealedKey');
    result = await env.DB.prepare('INSERT INTO account_settings (user_id, sealed_key, env, version, updated_by, updated_at) VALUES (?, ?, ?, 1, ?, ?) ON CONFLICT (user_id) DO NOTHING')
      .bind(user.id, sealed, envText, device.id, at).run();
  } else {
    result = await env.DB.prepare('UPDATE account_settings SET env = ?, version = version + 1, updated_by = ?, updated_at = ? WHERE user_id = ? AND version = ?')
      .bind(envText, device.id, at, user.id, base).run();
  }
  if (!result.meta || !result.meta.changes) throw new HttpError(409, 'version_conflict', 'Settings changed on another device; fetch and merge first.');
  return json({ version: base + 1 });
}

const publicCampaign = (c) => ({ id: c.id, sealedKey: JSON.parse(c.sealed_key), metaEnv: JSON.parse(c.meta_env), createdAt: c.created_at, updatedAt: c.updated_at });

async function ownCampaign(env, user, id) {
  const c = await env.DB.prepare('SELECT * FROM campaigns WHERE id = ?').bind(id).first();
  if (!c || c.owner_id !== user.id) throw new HttpError(404, 'not_found', 'No such synced campaign.');
  return c;
}

export async function listCampaigns(request, { env }, { user }) {
  const { results } = await env.DB.prepare('SELECT * FROM campaigns WHERE owner_id = ? ORDER BY updated_at DESC').bind(user.id).all();
  return json({ campaigns: results.map(publicCampaign) });
}

export async function createCampaign(request, { env, now }, { user, device }) {
  await requireFeature(env, iso(now()), user.id, 'sync.devices');
  await requireApproved(env, user, device);
  const body = await readJson(request);
  const id = String(body.id || '');
  if (!CAMPAIGN_ID.test(id)) throw new HttpError(400, 'bad_id', 'Bad campaign id.');
  const sealed = blob(body.sealedKey, 'sealedKey');
  const meta = blob(body.metaEnv, 'metaEnv');
  const existing = await env.DB.prepare('SELECT owner_id FROM campaigns WHERE id = ?').bind(id).first();
  if (existing) {
    throw existing.owner_id === user.id
      ? new HttpError(409, 'campaign_exists', 'A campaign with this id is already synced to your account.')
      : new HttpError(409, 'id_taken', 'That campaign id is in use. Make a copy of the campaign and sync the copy.');
  }
  const at = iso(now());
  await env.DB.prepare('INSERT INTO campaigns (id, owner_id, sealed_key, meta_env, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(id, user.id, sealed, meta, at, at).run();
  return json({ campaign: publicCampaign({ id, sealed_key: sealed, meta_env: meta, created_at: at, updated_at: at }) });
}

export async function updateCampaignMeta(request, { env, now }, { user }, id) {
  await ownCampaign(env, user, id);
  const meta = blob((await readJson(request)).metaEnv, 'metaEnv');
  await env.DB.prepare('UPDATE campaigns SET meta_env = ?, updated_at = ? WHERE id = ?').bind(meta, iso(now()), id).run();
  return json({ ok: true });
}

export async function deleteCampaign(request, { env }, { user }, id) {
  await ownCampaign(env, user, id);
  await destroyRoom(env, id);
  await env.DB.prepare('DELETE FROM campaigns WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

export async function getSnapshot(request, { env }, { user }, id) {
  await ownCampaign(env, user, id);
  return room(env, id).fetch(new Request(roomUrl('/snapshot')));
}

export async function putSnapshot(request, { env, now }, { user, device }, id) {
  await ownCampaign(env, user, id);
  const upto = new URL(request.url).searchParams.get('upto');
  const text = await request.text();
  if (!text || text.length > MAX_SNAPSHOT_CHARS) throw new HttpError(413, 'too_large', 'Snapshot is empty or too large.');
  const res = await room(env, id).fetch(new Request(roomUrl(`/snapshot?upto=${encodeURIComponent(upto)}`), { method: 'PUT', body: text, headers: { 'x-device-id': device.id } }));
  if (res.ok) await env.DB.prepare('UPDATE campaigns SET updated_at = ? WHERE id = ?').bind(iso(now()), id).run();
  return res;
}

const TICKET_SECONDS = 60;

export async function issueTicket(request, { env, now }, { user, device }) {
  await requireFeature(env, iso(now()), user.id, 'sync.devices');
  const { campaignId } = await readJson(request);
  await ownCampaign(env, user, String(campaignId || ''));
  await requireApproved(env, user, device);
  const ticket = await signAccessToken({ sub: user.id, did: device.id, cid: String(campaignId), typ: 'ws' }, env.ACCESS_TOKEN_SECRET, now(), TICKET_SECONDS);
  return json({ ticket });
}

/** The socket ticket's claims after re-checking the device, the campaign
 *  and ownership; throws 401/404 otherwise. Exported for tests. */
export async function checkTicket(ticket, { env, now }) {
  const claims = await verifyAccessToken(ticket, env.ACCESS_TOKEN_SECRET, now());
  if (!claims || claims.typ !== 'ws' || !claims.cid) throw new HttpError(401, 'bad_ticket', 'Sync ticket expired. Reconnecting…');
  const device = await env.DB.prepare('SELECT * FROM devices WHERE id = ? AND user_id = ?').bind(claims.did, claims.sub).first();
  if (!device || device.revoked_at) throw new HttpError(401, 'signed_out', 'Please sign in again.');
  await ownCampaign(env, { id: claims.sub }, claims.cid);
  return claims;
}

export async function openSocket(request, ctx) {
  if (request.headers.get('upgrade') !== 'websocket') throw new HttpError(426, 'upgrade_required', 'Expected a WebSocket.');
  const claims = await checkTicket(new URL(request.url).searchParams.get('ticket'), ctx);
  const headers = new Headers(request.headers);
  headers.set('x-device-id', claims.did);
  return room(ctx.env, claims.cid).fetch(new Request(roomUrl('/socket'), { headers }));
}
