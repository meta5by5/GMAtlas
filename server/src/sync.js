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
//   POST   /api/sync/ticket               {campaignId} -> {ticket}  (60 s, one campaign)
//   GET    /api/sync/socket?ticket=...    WebSocket upgrade into the campaign's room

import { HttpError, json, readJson } from './http.js';
import { signAccessToken, verifyAccessToken } from './crypto.js';

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
    env.DB.prepare('DELETE FROM vault_keys WHERE user_id = ?').bind(user.id),
  ]);
  return json({ ok: true, campaigns: results.length });
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
