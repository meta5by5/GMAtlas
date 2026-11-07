// features.js — which features are on for one account (roadmap sections
// 4.2 and 9, "Feature flags"). Pure, shared with server/: the server puts
// the result in the entitlement certificate (`enabledFeatures`) and
// enforces it; the app reads it from the certificate.
//
// For each catalog feature (data/features.js), in order:
//   1. kill switch on            -> off, for everyone, whatever else says
//   2. a per-user override       -> that
//   3. a `feature` entitlement   -> on (granted, bought, trial)
//   4. the flag's default (or the catalog's, when the flag sets none)
//   5. still off: a percentage rollout turns it on for that share of
//      accounts, chosen by a stable hash of the account id, so the same
//      accounts stay in as the percentage grows.

/** 0..99, stable per (feature, account). FNV-1a, so it's synchronous and
 *  the same in every runtime. */
export function rolloutBucket(featureId, userId) {
  let h = 0x811c9dc5;
  const s = `${featureId}:${userId}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % 100;
}

/** A stored flag row, normalized: {defaultValue: bool|null, rollout:
 *  0..100|null, kill: bool, overrides: {userId: bool}}. */
export function normalizeFlag(flag) {
  const f = flag || {};
  const rollout = f.rollout === null || f.rollout === undefined || f.rollout === '' ? null : Math.max(0, Math.min(100, Math.round(Number(f.rollout)) || 0));
  const overrides = {};
  for (const [k, v] of Object.entries(f.overrides && typeof f.overrides === 'object' ? f.overrides : {})) overrides[k] = !!v;
  return {
    defaultValue: f.defaultValue === true || f.defaultValue === false ? f.defaultValue : null,
    rollout,
    kill: !!f.kill,
    overrides,
  };
}

/** Whether one feature is on for one account, and why
 *  ('kill' | 'override' | 'granted' | 'default' | 'rollout' | 'off'). */
export function featureState(feature, flag, userId, grantedIds) {
  const f = normalizeFlag(flag);
  if (f.kill) return { on: false, why: 'kill' };
  if (userId in f.overrides) return { on: f.overrides[userId], why: 'override' };
  if (grantedIds && grantedIds.includes(feature.id)) return { on: true, why: 'granted' };
  const base = f.defaultValue !== null ? f.defaultValue : !!feature.default;
  if (base) return { on: true, why: 'default' };
  if (f.rollout && rolloutBucket(feature.id, userId) < f.rollout) return { on: true, why: 'rollout' };
  return { on: false, why: 'off' };
}

/** The ids of every catalog feature on for this account, sorted.
 *  `flags`: {featureId: flag}; `granted`: feature ids from entitlements. */
export function resolveFeatures({ features, flags, userId, granted }) {
  return (features || [])
    .filter((feature) => featureState(feature, (flags || {})[feature.id], userId, granted || []).on)
    .map((f) => f.id)
    .sort();
}

/** Whether a verified certificate payload has a feature on. A certificate
 *  from before feature flags (no `enabledFeatures`) falls back to the
 *  catalog default. */
export function certHasFeature(cert, featureId, features) {
  if (cert && Array.isArray(cert.enabledFeatures)) return cert.enabledFeatures.includes(featureId);
  const f = (features || []).find((x) => x.id === featureId);
  return !!(f && f.default);
}
