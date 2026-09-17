// entitlements.js — which Game Systems this install is allowed to activate.
// Backed by local appConfig state for now (a flat systemId -> boolean map,
// no concept of "who" at all); every call site goes through
// canAccessGameSystem() rather than reading appConfig.entitlements
// directly — that's the seam a real registration/subscription service
// replaces later without touching any call site. Pure/DOM-free, same
// convention as rulesProfiles.js: every function takes an appConfig object
// and returns a NEW one (or a boolean), never mutates the input.
//
// Deliberately NOT built here (future registration module's job entirely):
// any real user account, login, or subscription-tier logic. This is a flat
// local allow/deny map, defaulted to fully-open, so nothing changes for
// anyone until entitlements are actually configured by whatever comes
// later — see gameSystemActivationSection (drawers/index.js) for the one
// current call site, which renders a disallowed-but-gated Game System as
// visibly locked rather than silently hiding it.

/** Whether `systemId` (a RULES_PROVIDERS/GAME_SYSTEMS key) is allowed to be
 *  activated on this install. An entitlement with no explicit entry is
 *  treated as allowed — this only ever RESTRICTS a system once something
 *  has actually set it to false, never the other way around. */
export function canAccessGameSystem(appConfig, systemId) {
  const entitlements = (appConfig && appConfig.entitlements) || {};
  if (entitlements[systemId] === undefined) return true;
  return !!entitlements[systemId];
}

/** Sets (or clears) one systemId's entitlement. */
export function setEntitlement(appConfig, systemId, allowed) {
  return { ...appConfig, entitlements: { ...appConfig.entitlements, [systemId]: !!allowed } };
}
