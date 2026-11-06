// account.js — the signed-in user's profile and devices (roadmap 3.2, 4.4).
//
//   GET    /api/me                   -> {user, device}
//   PATCH  /api/me                   {displayName}
//   GET    /api/devices              -> {devices}
//   PATCH  /api/devices/:id          {name?, policy?}   (own devices only)
//   DELETE /api/devices/:id          -> signs that device out everywhere

import { HttpError, json, readJson } from './http.js';
import { publicUser, publicDevice } from './auth.js';
import { LICENSES } from '../../src/data/licenses.js';

const iso = (ms) => new Date(ms).toISOString();
const OWNABLE = new Set(LICENSES.filter((l) => !l.open).map((l) => l.id));

export async function getMe(request, ctx, { user, device }) {
  return json({ user: publicUser(user), device: publicDevice(device, device.id) });
}

export async function updateMe(request, { env }, { user }) {
  const body = await readJson(request);
  const displayName = String(body.displayName ?? '').trim().slice(0, 60) || null;
  await env.DB.prepare('UPDATE users SET display_name = ? WHERE id = ?').bind(displayName, user.id).run();
  return json({ user: publicUser({ ...user, display_name: displayName }) });
}

export async function listDevices(request, { env }, { user, device }) {
  const { results } = await env.DB.prepare('SELECT * FROM devices WHERE user_id = ? AND revoked_at IS NULL ORDER BY last_seen_at DESC').bind(user.id).all();
  return json({ devices: results.map((d) => publicDevice(d, device.id)) });
}

/** A device install policy, validated: follow everything the account owns
 *  except `excluded`, or a focused install of `only` (roadmap 4.4). */
export function cleanPolicy(policy) {
  if (!policy || typeof policy !== 'object') throw new HttpError(400, 'bad_policy', 'Policy must be an object.');
  const mode = policy.mode === 'focused' ? 'focused' : policy.mode === 'follow' ? 'follow' : null;
  if (!mode) throw new HttpError(400, 'bad_policy', "Policy mode must be 'follow' or 'focused'.");
  const ids = (list) => {
    if (list === undefined) return [];
    if (!Array.isArray(list) || list.length > 100) throw new HttpError(400, 'bad_policy', 'License lists must be arrays.');
    const unknown = list.filter((id) => !OWNABLE.has(id));
    if (unknown.length) throw new HttpError(400, 'unknown_license', `Unknown license: ${unknown.join(', ')}`);
    return [...new Set(list)];
  };
  return { mode, excluded: ids(policy.excluded), only: ids(policy.only) };
}

async function ownDevice(env, user, id) {
  const device = await env.DB.prepare('SELECT * FROM devices WHERE id = ? AND user_id = ? AND revoked_at IS NULL').bind(id, user.id).first();
  if (!device) throw new HttpError(404, 'not_found', 'No such device.');
  return device;
}

export async function updateDevice(request, { env }, { user, device: current }, id) {
  const device = await ownDevice(env, user, id);
  const body = await readJson(request);
  const name = body.name === undefined ? device.name : (String(body.name).trim().slice(0, 60) || device.name);
  const policy = body.policy === undefined ? JSON.parse(device.policy) : cleanPolicy(body.policy);
  await env.DB.prepare('UPDATE devices SET name = ?, policy = ? WHERE id = ?').bind(name, JSON.stringify(policy), id).run();
  return json({ device: publicDevice({ ...device, name, policy: JSON.stringify(policy) }, current.id) });
}

export async function revokeDevice(request, { env, now }, { user }, id) {
  await ownDevice(env, user, id);
  const at = iso(now());
  await env.DB.batch([
    env.DB.prepare('UPDATE devices SET revoked_at = ? WHERE id = ?').bind(at, id),
    env.DB.prepare('UPDATE sessions SET revoked_at = ? WHERE device_id = ? AND revoked_at IS NULL').bind(at, id),
  ]);
  return json({ ok: true });
}
