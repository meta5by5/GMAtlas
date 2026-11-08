// entitlements.js — what an account owns, and the signed certificate every
// device caches (roadmap sections 4.2-4.5).
//
//   GET    /api/entitlements                  -> {cert, publicKeyId}
//   POST   /api/entitlements/attest           {licenses: [id]}  ("I own these books")
//   DELETE /api/entitlements/licenses/:id     -> deactivates it on every device
//
// Third-party books are attestations, not sales (roadmap 4.5): ticking "I
// own Five Leagues" on any device creates an `attested` entitlement that
// then follows the account everywhere. Open (CC-BY) licenses are always
// owned and never stored.

import { HttpError, json, readJson } from './http.js';
import { newId, signCertificate } from './crypto.js';
import { LICENSES } from '../../src/data/licenses.js';
import { enabledFeaturesFor } from './features.js';

const iso = (ms) => new Date(ms).toISOString();
const OWNABLE = new Set(LICENSES.filter((l) => !l.open).map((l) => l.id));
export const CERT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const ACTIVE = 'revoked_at IS NULL AND starts_at <= ? AND (ends_at IS NULL OR ends_at > ?)';

export async function activeEntitlements(env, userId, nowIso) {
  const { results } = await env.DB.prepare(`SELECT * FROM entitlements WHERE user_id = ? AND ${ACTIVE}`).bind(userId, nowIso, nowIso).all();
  return results;
}

/** Appends to the audit log (roadmap section 9: every admin write and
 *  every entitlement change; actor, action, target, before/after, note). */
export async function audit(env, at, actorId, action, targetKind, targetId, before, after, note = null) {
  await env.DB.prepare('INSERT INTO audit_log (id, at, actor_id, action, target_kind, target_id, before_json, after_json, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(newId('aud'), at, actorId, action, targetKind, targetId, before === null ? null : JSON.stringify(before), after === null ? null : JSON.stringify(after), note).run();
}

/** The certificate payload for one device: what the account owns, plus
 *  that device's install policy, which the client applies through
 *  effectiveLicenses() (src/domain/licensing.js). */
export function certificatePayload({ user, device, entitlements, nowMs, keyId, enabledFeatures }) {
  const refs = (kind) => [...new Set(entitlements.filter((e) => e.kind === kind).map((e) => e.ref))].sort();
  return {
    v: 1,
    kid: keyId,
    accountId: user.id,
    deviceId: device.id,
    licenses: refs('license'),
    // `features`: granted feature entitlements; `enabledFeatures`: what's
    // actually on after feature flags (src/domain/features.js).
    features: refs('feature'),
    ...(enabledFeatures ? { enabledFeatures } : {}),
    modules: refs('module'),
    policy: JSON.parse(device.policy),
    issuedAt: iso(nowMs),
    expiresAt: iso(nowMs + CERT_TTL_MS),
  };
}

export async function getCertificate(request, { env, now }, { user, device }) {
  const entitlements = await activeEntitlements(env, user.id, iso(now()));
  const enabledFeatures = await enabledFeaturesFor(env, user.id, entitlements);
  const payload = certificatePayload({ user, device, entitlements, nowMs: now(), keyId: env.CERT_KEY_ID, enabledFeatures });
  return json({ cert: await signCertificate(payload, await env.certSigningKey()) });
}

export async function attestLicenses(request, { env, now }, { user }) {
  const body = await readJson(request);
  if (!Array.isArray(body.licenses) || body.licenses.length > 100) throw new HttpError(400, 'bad_licenses', 'Send {licenses: [ids]}.');
  const unknown = body.licenses.filter((id) => !OWNABLE.has(id));
  if (unknown.length) throw new HttpError(400, 'unknown_license', `Unknown or open license: ${unknown.join(', ')}`);
  const at = iso(now());
  const owned = new Set((await activeEntitlements(env, user.id, at)).filter((e) => e.kind === 'license').map((e) => e.ref));
  const added = [...new Set(body.licenses)].filter((id) => !owned.has(id));
  for (const id of added) {
    const entId = newId('ent');
    await env.DB.prepare("INSERT INTO entitlements (id, user_id, kind, ref, source, starts_at, created_at) VALUES (?, ?, 'license', ?, 'attested', ?, ?)")
      .bind(entId, user.id, id, at, at).run();
    await audit(env, at, user.id, 'entitlement.attest', 'entitlement', entId, null, { ref: id, source: 'attested' });
  }
  return json({ added, licenses: [...owned, ...added].sort() });
}

export async function deactivateLicense(request, { env, now }, { user }, licenseId) {
  const at = iso(now());
  const rows = (await activeEntitlements(env, user.id, at)).filter((e) => e.kind === 'license' && e.ref === licenseId);
  if (!rows.length) throw new HttpError(404, 'not_found', 'That license isn’t active on this account.');
  for (const row of rows) {
    await env.DB.prepare('UPDATE entitlements SET revoked_at = ?, revoked_by = ? WHERE id = ?').bind(at, user.id, row.id).run();
    await audit(env, at, user.id, 'entitlement.deactivate', 'entitlement', row.id, { ref: row.ref, source: row.source }, null);
  }
  return json({ ok: true, deactivated: licenseId });
}
