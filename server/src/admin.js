// admin.js — admin v1 (design/ACCOUNTS-SYNC-ROADMAP.md section 9; Phase S1
// item 4): users, entitlements, feature flags, the audit log, admin roles.
// Every route needs a signed-in account with an admin role, and checks the
// permission it needs. Every write takes a note and is audited with its
// before/after. Deliberately absent: viewing campaign contents (they're
// end-to-end encrypted) or impersonating a user.
//
//   GET  /api/admin/me                              -> {user, roles, permissions}
//   GET  /api/admin/users?q=                        -> {users}
//   GET  /api/admin/users/:id                       -> one user's account metadata
//   POST /api/admin/users/:id/status                {status, note}
//   POST /api/admin/users/:id/sessions/revoke       {sessionId?, note}   (none = all)
//   PUT  /api/admin/users/:id/roles                 {roles, note}        (owner only)
//   POST /api/admin/users/:id/entitlements          {kind, ref, source, endsAt?, note}
//   POST /api/admin/entitlements/bulk               {csv, note, dryRun?}
//   POST /api/admin/entitlements/:id/revoke         {note}
//   POST /api/admin/entitlements/:id/extend         {endsAt, note}
//   POST /api/admin/entitlements/:id/convert        {note}  attested -> grant
//   GET  /api/admin/flags                           -> {features, flags}
//   PUT  /api/admin/flags/:key                      {defaultValue, rollout, kill, overrides, note}
//   GET  /api/admin/audit?actor=&target=&action=&before=&limit=

import { HttpError, json, readJson } from './http.js';
import { newId } from './crypto.js';
import { audit } from './entitlements.js';
import { loadFlags, enabledFeaturesFor } from './features.js';
import { LICENSES } from '../../src/data/licenses.js';
import { FEATURES, FEATURE_IDS } from '../../src/data/features.js';
import { GATEABLE_MODULES } from '../../src/core/schema.js';
import { normalizeFlag } from '../../src/domain/features.js';

const iso = (ms) => new Date(ms).toISOString();

export const ROLES = ['owner', 'admin', 'support', 'content'];
// Support: users, grants and trials, no catalog or flags. Content: flags
// (and the catalog, S4). Only an owner changes roles.
const PERMISSIONS = {
  'users.read': ['owner', 'admin', 'support'],
  'users.write': ['owner', 'admin', 'support'],
  'grants.write': ['owner', 'admin', 'support'],
  'flags.read': ['owner', 'admin', 'support', 'content'],
  'flags.write': ['owner', 'admin', 'content'],
  'audit.read': ['owner', 'admin', 'support', 'content'],
  'roles.write': ['owner'],
};

/** What an account may grant, by kind: books it can own, catalog
 *  features, gateable campaign modules. */
export const GRANTABLE = {
  license: new Set(LICENSES.filter((l) => !l.open).map((l) => l.id)),
  feature: new Set(FEATURE_IDS),
  module: new Set(GATEABLE_MODULES),
};

const rolesOf = (user) => { try { return JSON.parse(user.roles || '[]').filter((r) => ROLES.includes(r)); } catch { return []; } };
const permissionsOf = (roles) => Object.keys(PERMISSIONS).filter((p) => PERMISSIONS[p].some((r) => roles.includes(r)));

function can(caller, permission) {
  const roles = rolesOf(caller.user);
  if (!roles.length) throw new HttpError(403, 'not_admin', 'This account has no admin role.');
  if (!PERMISSIONS[permission].some((r) => roles.includes(r))) throw new HttpError(403, 'forbidden', 'Your admin role can’t do that.');
}

function note(body) {
  const text = typeof body.note === 'string' ? body.note.trim() : '';
  if (!text) throw new HttpError(400, 'note_required', 'Say why: every admin change needs a note.');
  if (text.length > 500) throw new HttpError(400, 'note_too_long', 'Keep the note under 500 characters.');
  return text;
}

function futureIso(value, nowMs, name = 'endsAt') {
  const ms = Date.parse(value);
  if (!value || Number.isNaN(ms)) throw new HttpError(400, 'bad_date', `${name} must be a date.`);
  if (ms <= nowMs) throw new HttpError(400, 'bad_date', `${name} must be in the future.`);
  return iso(ms);
}

async function userById(env, id) {
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  if (!user) throw new HttpError(404, 'not_found', 'No such user.');
  return user;
}

const publicUser = (u) => ({ id: u.id, email: u.email, displayName: u.display_name, roles: rolesOf(u), status: u.status, createdAt: u.created_at });
const publicEntitlement = (e) => ({
  id: e.id, kind: e.kind, ref: e.ref, value: e.value, source: e.source, startsAt: e.starts_at, endsAt: e.ends_at,
  revokedAt: e.revoked_at, revokedBy: e.revoked_by, note: e.note, createdAt: e.created_at,
});

// --- me ----------------------------------------------------------------------

export async function adminMe(request, ctx, caller) {
  const roles = rolesOf(caller.user);
  if (!roles.length) throw new HttpError(403, 'not_admin', 'This account has no admin role.');
  return json({ user: publicUser(caller.user), roles, permissions: permissionsOf(roles), env: ctx.env.GMATLAS_ENV || 'dev' });
}

// --- users -------------------------------------------------------------------

export async function searchUsers(request, { env }, caller) {
  can(caller, 'users.read');
  const q = (new URL(request.url).searchParams.get('q') || '').trim().toLowerCase().slice(0, 100);
  const base = `SELECT u.*, (SELECT MAX(last_seen_at) FROM devices d WHERE d.user_id = u.id) AS last_seen,
    (SELECT COUNT(*) FROM devices d WHERE d.user_id = u.id AND d.revoked_at IS NULL) AS device_count FROM users u`;
  const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const stmt = q
    ? env.DB.prepare(`${base} WHERE u.id = ? OR lower(u.email) LIKE ? ESCAPE '\\' OR lower(COALESCE(u.display_name, '')) LIKE ? ESCAPE '\\' ORDER BY u.created_at DESC LIMIT 50`).bind(q, like, like)
    : env.DB.prepare(`${base} ORDER BY u.created_at DESC LIMIT 50`);
  const { results } = await stmt.all();
  return json({ users: results.map((u) => ({ ...publicUser(u), lastSeenAt: u.last_seen, devices: u.device_count })) });
}

export async function getUser(request, { env, now }, caller, id) {
  can(caller, 'users.read');
  const user = await userById(env, id);
  const at = iso(now());
  const all = (sql, ...args) => env.DB.prepare(sql).bind(...args).all().then((r) => r.results);
  const [identities, devices, sessions, entitlements, campaigns, approved, settings] = await Promise.all([
    all('SELECT provider, created_at FROM identities WHERE user_id = ?', id),
    all('SELECT * FROM devices WHERE user_id = ? ORDER BY last_seen_at DESC', id),
    all('SELECT id, device_id, created_at, expires_at FROM sessions WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ? ORDER BY created_at DESC', id, at),
    all('SELECT * FROM entitlements WHERE user_id = ? ORDER BY created_at DESC', id),
    all('SELECT id, created_at, updated_at FROM campaigns WHERE owner_id = ? ORDER BY updated_at DESC', id),
    all('SELECT slot FROM vault_keys WHERE user_id = ?', id),
    all('SELECT version, updated_at FROM account_settings WHERE user_id = ?', id),
  ]);
  const active = entitlements.filter((e) => !e.revoked_at && e.starts_at <= at && (!e.ends_at || e.ends_at > at));
  const slots = new Set(approved.map((r) => r.slot));
  return json({
    user: publicUser(user),
    identities: identities.map((i) => ({ provider: i.provider, createdAt: i.created_at })),
    devices: devices.map((d) => ({
      id: d.id, name: d.name, platform: d.platform, policy: JSON.parse(d.policy), createdAt: d.created_at,
      lastSeenAt: d.last_seen_at, revokedAt: d.revoked_at, syncApproved: slots.has(d.id),
    })),
    sessions: sessions.map((s) => ({ id: s.id, deviceId: s.device_id, createdAt: s.created_at, expiresAt: s.expires_at })),
    entitlements: entitlements.map(publicEntitlement),
    // Metadata only: titles and contents are end-to-end encrypted.
    sync: {
      vault: slots.size > 0, recoveryKey: slots.has('recovery'),
      campaigns: campaigns.map((c) => ({ id: c.id, createdAt: c.created_at, updatedAt: c.updated_at })),
      settings: settings[0] ? { version: settings[0].version, updatedAt: settings[0].updated_at } : null,
    },
    enabledFeatures: await enabledFeaturesFor(env, id, active),
  });
}

export async function setUserStatus(request, { env, now }, caller, id) {
  can(caller, 'users.write');
  const body = await readJson(request);
  const why = note(body);
  if (!['active', 'disabled'].includes(body.status)) throw new HttpError(400, 'bad_status', "Status is 'active' or 'disabled'.");
  if (id === caller.user.id) throw new HttpError(400, 'self', 'You can’t change your own account’s status.');
  const user = await userById(env, id);
  if (rolesOf(user).includes('owner') && !rolesOf(caller.user).includes('owner')) throw new HttpError(403, 'forbidden', 'Only an owner can disable an owner.');
  const at = iso(now());
  await env.DB.prepare('UPDATE users SET status = ? WHERE id = ?').bind(body.status, id).run();
  // Disabling signs the account out everywhere at once.
  if (body.status === 'disabled') await env.DB.prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').bind(at, id).run();
  await audit(env, at, caller.user.id, 'admin.user.status', 'user', id, { status: user.status }, { status: body.status }, why);
  return json({ ok: true, status: body.status });
}

export async function revokeSessions(request, { env, now }, caller, id) {
  can(caller, 'users.write');
  const body = await readJson(request);
  const why = note(body);
  await userById(env, id);
  const at = iso(now());
  const result = body.sessionId
    ? await env.DB.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL').bind(at, String(body.sessionId), id).run()
    : await env.DB.prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').bind(at, id).run();
  const n = (result.meta && result.meta.changes) || 0;
  if (body.sessionId && !n) throw new HttpError(404, 'not_found', 'No such active session.');
  await audit(env, at, caller.user.id, 'admin.sessions.revoke', 'user', id, null, { sessionId: body.sessionId || 'all', revoked: n }, why);
  return json({ ok: true, revoked: n });
}

export async function setUserRoles(request, { env, now }, caller, id) {
  can(caller, 'roles.write');
  const body = await readJson(request);
  const why = note(body);
  if (!Array.isArray(body.roles) || body.roles.some((r) => !ROLES.includes(r))) throw new HttpError(400, 'bad_roles', `Roles are any of: ${ROLES.join(', ')}.`);
  const roles = ROLES.filter((r) => body.roles.includes(r));
  const user = await userById(env, id);
  const before = rolesOf(user);
  if (before.includes('owner') && !roles.includes('owner')) {
    const { results } = await env.DB.prepare('SELECT roles FROM users WHERE status = ?').bind('active').all();
    const owners = results.filter((u) => rolesOf(u).includes('owner')).length;
    if (owners <= 1) throw new HttpError(400, 'last_owner', 'There must always be at least one owner.');
  }
  const at = iso(now());
  await env.DB.prepare('UPDATE users SET roles = ? WHERE id = ?').bind(JSON.stringify(roles), id).run();
  await audit(env, at, caller.user.id, 'admin.user.roles', 'user', id, { roles: before }, { roles }, why);
  return json({ ok: true, roles });
}

// --- entitlements ----------------------------------------------------------------

/** Checks one grant: a known kind and id, a source, and an end date
 *  (required for a trial). Returns the cleaned grant. */
function cleanGrant(g, nowMs) {
  const kind = String(g.kind || '');
  const ref = String(g.ref || '');
  if (!GRANTABLE[kind]) throw new HttpError(400, 'bad_kind', "Kind is 'license', 'feature' or 'module'.");
  if (!GRANTABLE[kind].has(ref)) throw new HttpError(400, 'unknown_ref', `Unknown ${kind}: ${ref || '(none)'}.`);
  const source = g.source === 'trial' ? 'trial' : g.source === undefined || g.source === 'grant' ? 'grant' : null;
  if (!source) throw new HttpError(400, 'bad_source', "Source is 'grant' or 'trial'.");
  if (source === 'trial' && !g.endsAt) throw new HttpError(400, 'bad_date', 'A trial needs an end date.');
  const endsAt = g.endsAt ? futureIso(g.endsAt, nowMs) : null;
  return { kind, ref, source, endsAt };
}

async function insertGrant(env, at, actorId, userId, grant, why) {
  const id = newId('ent');
  await env.DB.prepare('INSERT INTO entitlements (id, user_id, kind, ref, source, starts_at, ends_at, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, userId, grant.kind, grant.ref, grant.source, at, grant.endsAt, why, at).run();
  await audit(env, at, actorId, 'admin.entitlement.grant', 'entitlement', id, null, { userId, ...grant }, why);
  return id;
}

export async function grantEntitlement(request, { env, now }, caller, userId) {
  can(caller, 'grants.write');
  const body = await readJson(request);
  const why = note(body);
  await userById(env, userId);
  const grant = cleanGrant(body, now());
  const id = await insertGrant(env, iso(now()), caller.user.id, userId, grant, why);
  return json({ ok: true, id });
}

/** "email,kind,ref[,endsAt]" per line (a header line is skipped). Returns
 *  {rows, errors}: every line is checked before anything is written. */
export function parseGrantCsv(text, nowMs) {
  const rows = [];
  const errors = [];
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  lines.forEach((line, i) => {
    const cells = line.split(',').map((c) => c.trim());
    if (i === 0 && cells[0].toLowerCase() === 'email') return;
    const [email, kind, ref, endsAt] = cells;
    try {
      if (!email || !email.includes('@')) throw new HttpError(400, 'bad_email', 'Needs an email.');
      rows.push({ line: i + 1, email: email.toLowerCase(), ...cleanGrant({ kind, ref, source: endsAt ? 'trial' : 'grant', endsAt: endsAt || undefined }, nowMs) });
    } catch (err) {
      errors.push({ line: i + 1, text: line, error: err.message });
    }
  });
  return { rows, errors };
}

export async function bulkGrant(request, { env, now }, caller) {
  can(caller, 'grants.write');
  const body = await readJson(request, 256 * 1024);
  const why = note(body);
  const { rows, errors } = parseGrantCsv(body.csv, now());
  if (rows.length > 500) throw new HttpError(400, 'too_many', 'At most 500 rows at once.');
  const users = new Map();
  for (const email of new Set(rows.map((r) => r.email))) {
    const u = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (u) users.set(email, u.id);
  }
  const known = rows.filter((r) => users.has(r.email));
  for (const r of rows) if (!users.has(r.email)) errors.push({ line: r.line, text: r.email, error: 'No account with that email.' });
  errors.sort((a, b) => a.line - b.line);
  // All or nothing: any bad line and nothing is granted.
  if (errors.length || body.dryRun) return json({ ok: !errors.length, dryRun: !!body.dryRun, valid: known.length, errors });
  const at = iso(now());
  const ids = [];
  for (const r of rows) ids.push(await insertGrant(env, at, caller.user.id, users.get(r.email), { kind: r.kind, ref: r.ref, source: r.source, endsAt: r.endsAt }, why));
  return json({ ok: true, granted: ids.length });
}

async function entitlementById(env, id) {
  const e = await env.DB.prepare('SELECT * FROM entitlements WHERE id = ?').bind(id).first();
  if (!e) throw new HttpError(404, 'not_found', 'No such entitlement.');
  return e;
}

export async function revokeEntitlement(request, { env, now }, caller, id) {
  can(caller, 'grants.write');
  const why = note(await readJson(request));
  const e = await entitlementById(env, id);
  if (e.revoked_at) throw new HttpError(409, 'already_revoked', 'Already revoked.');
  const at = iso(now());
  await env.DB.prepare('UPDATE entitlements SET revoked_at = ?, revoked_by = ? WHERE id = ?').bind(at, caller.user.id, id).run();
  await audit(env, at, caller.user.id, 'admin.entitlement.revoke', 'entitlement', id, publicEntitlement(e), { revokedAt: at }, why);
  return json({ ok: true });
}

export async function extendEntitlement(request, { env, now }, caller, id) {
  can(caller, 'grants.write');
  const body = await readJson(request);
  const why = note(body);
  const e = await entitlementById(env, id);
  if (e.revoked_at) throw new HttpError(409, 'already_revoked', 'A revoked entitlement can’t be extended; grant a new one.');
  const endsAt = futureIso(body.endsAt, now());
  const at = iso(now());
  await env.DB.prepare('UPDATE entitlements SET ends_at = ? WHERE id = ?').bind(endsAt, id).run();
  await audit(env, at, caller.user.id, 'admin.entitlement.extend', 'entitlement', id, { endsAt: e.ends_at }, { endsAt }, why);
  return json({ ok: true, endsAt });
}

export async function convertEntitlement(request, { env, now }, caller, id) {
  can(caller, 'grants.write');
  const why = note(await readJson(request));
  const e = await entitlementById(env, id);
  if (e.source !== 'attested' || e.revoked_at) throw new HttpError(409, 'not_attested', 'Only an active attestation can be converted to a grant.');
  const at = iso(now());
  await env.DB.prepare("UPDATE entitlements SET source = 'grant', note = ? WHERE id = ?").bind(why, id).run();
  await audit(env, at, caller.user.id, 'admin.entitlement.convert', 'entitlement', id, { source: 'attested' }, { source: 'grant' }, why);
  return json({ ok: true });
}

// --- feature flags -----------------------------------------------------------------

export async function listFlags(request, { env }, caller) {
  can(caller, 'flags.read');
  const flags = await loadFlags(env);
  const { results } = await env.DB.prepare('SELECT key, updated_by, updated_at FROM feature_flags').all();
  const meta = new Map(results.map((r) => [r.key, r]));
  // Override keys are account ids; show their emails too.
  const ids = [...new Set(Object.values(flags).flatMap((f) => Object.keys(f.overrides)))];
  const emails = {};
  for (const uid of ids) {
    const u = await env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(uid).first();
    if (u) emails[uid] = u.email;
  }
  return json({
    features: FEATURES,
    flags: Object.fromEntries(Object.entries(flags).map(([k, f]) => [k, { ...f, updatedBy: meta.get(k).updated_by, updatedAt: meta.get(k).updated_at }])),
    emails,
  });
}

export async function putFlag(request, { env, now }, caller, key) {
  can(caller, 'flags.write');
  if (!FEATURE_IDS.includes(key)) throw new HttpError(404, 'unknown_feature', `Unknown feature: ${key}.`);
  const body = await readJson(request, 64 * 1024);
  const why = note(body);
  if (body.rollout !== null && body.rollout !== undefined && body.rollout !== '' && !(Number(body.rollout) >= 0 && Number(body.rollout) <= 100)) {
    throw new HttpError(400, 'bad_rollout', 'Rollout is a percentage, 0 to 100.');
  }
  // Overrides may be keyed by account id or email; stored by id.
  const overrides = {};
  for (const [who, on] of Object.entries(body.overrides && typeof body.overrides === 'object' ? body.overrides : {})) {
    const u = await env.DB.prepare('SELECT id FROM users WHERE id = ? OR email = ?').bind(who, who.toLowerCase()).first();
    if (!u) throw new HttpError(400, 'unknown_user', `No account: ${who}.`);
    overrides[u.id] = !!on;
  }
  const next = normalizeFlag({ defaultValue: body.defaultValue, rollout: body.rollout, kill: body.kill, overrides });
  const before = (await loadFlags(env))[key] || null;
  const at = iso(now());
  await env.DB.prepare(`INSERT INTO feature_flags (key, default_value, rollout, kill, overrides, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (key) DO UPDATE SET default_value = excluded.default_value, rollout = excluded.rollout, kill = excluded.kill, overrides = excluded.overrides, updated_by = excluded.updated_by, updated_at = excluded.updated_at`)
    .bind(key, next.defaultValue === null ? null : next.defaultValue ? 1 : 0, next.rollout, next.kill ? 1 : 0, JSON.stringify(next.overrides), caller.user.id, at).run();
  await audit(env, at, caller.user.id, 'admin.flag.update', 'flag', key, before, next, why);
  return json({ ok: true, flag: next });
}

// --- audit log ----------------------------------------------------------------------

export async function listAudit(request, { env }, caller) {
  can(caller, 'audit.read');
  const p = new URL(request.url).searchParams;
  const where = [];
  const args = [];
  if (p.get('actor')) { where.push('actor_id = ?'); args.push(p.get('actor')); }
  if (p.get('target')) { where.push('target_id = ?'); args.push(p.get('target')); }
  if (p.get('action')) { where.push('action LIKE ?'); args.push(`${p.get('action').replace(/[%_]/g, '')}%`); }
  if (p.get('before')) { where.push('at < ?'); args.push(p.get('before')); }
  const limit = Math.max(1, Math.min(200, Number(p.get('limit')) || 100));
  const sql = `SELECT a.*, u.email AS actor_email FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY a.at DESC, a.rowid DESC LIMIT ${limit}`;
  const { results } = await env.DB.prepare(sql).bind(...args).all();
  return json({
    entries: results.map((a) => ({
      id: a.id, at: a.at, actorId: a.actor_id, actorEmail: a.actor_email, action: a.action, targetKind: a.target_kind, targetId: a.target_id,
      before: a.before_json ? JSON.parse(a.before_json) : null, after: a.after_json ? JSON.parse(a.after_json) : null, note: a.note,
    })),
    more: results.length === limit,
  });
}
