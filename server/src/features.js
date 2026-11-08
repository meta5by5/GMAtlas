// features.js — feature flags on the server: loading them, resolving an
// account's features (src/domain/features.js, shared with the app), and
// refusing a request whose feature is off.

import { HttpError } from './http.js';
import { FEATURES } from '../../src/data/features.js';
import { resolveFeatures } from '../../src/domain/features.js';

/** {featureId: normalized-ish flag} from the feature_flags table. */
export async function loadFlags(env) {
  const { results } = await env.DB.prepare('SELECT * FROM feature_flags').all();
  const flags = {};
  for (const r of results) {
    flags[r.key] = {
      defaultValue: r.default_value === null ? null : !!r.default_value,
      rollout: r.rollout,
      kill: !!r.kill,
      overrides: JSON.parse(r.overrides || '{}'),
    };
  }
  return flags;
}

/** The features on for this account, given its active entitlements. */
export async function enabledFeaturesFor(env, userId, entitlements) {
  const granted = (entitlements || []).filter((e) => e.kind === 'feature').map((e) => e.ref);
  return resolveFeatures({ features: FEATURES, flags: await loadFlags(env), userId, granted });
}

/** Whether the feature is on for this account right now. */
export async function hasFeature(env, nowIso, userId, featureId) {
  const { results } = await env.DB.prepare("SELECT ref, kind FROM entitlements WHERE user_id = ? AND kind = 'feature' AND revoked_at IS NULL AND starts_at <= ? AND (ends_at IS NULL OR ends_at > ?)")
    .bind(userId, nowIso, nowIso).all();
  return (await enabledFeaturesFor(env, userId, results)).includes(featureId);
}

/** Throws 403 feature_off unless the feature is on for this account. */
export async function requireFeature(env, nowIso, userId, featureId) {
  if (!(await hasFeature(env, nowIso, userId, featureId))) {
    const f = FEATURES.find((x) => x.id === featureId);
    throw new HttpError(403, 'feature_off', `${f ? f.label : featureId} is turned off for this account.`);
  }
}
