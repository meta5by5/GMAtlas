// permissions.js — a thin seam for future access control. Direct
// instruction: "The Load button will only be available to the Admin or
// those given permission when access controls are implemented. So create
// any hooks needed in preparation for that future architecture." No user/
// role/login concept exists anywhere in this app yet (requirements/
// previous-design-principles/adr/0028-multiuser-access-and-cloud-sync.md
// is Proposed, not started) — every GM running this locally is implicitly
// the sole admin. Gated actions call a function from HERE, never an inline
// check, so wiring a real permission system later means teaching these
// functions about a real session/role instead of re-finding every call
// site. Defaults fully open (true), same "default open, only restrict once
// configured" posture as domain/entitlements.js's own install-level
// Game-System gate — a deliberately different, narrower concept (which
// Game Systems this install may use at all, no user axis) than this file's
// own (which user may take a given gated UI action) — never merge the two.

/** Whether the current session may click the Rulesets tab's "Load"
 *  sourcebook button (drawers/index.js/shell.js). Takes no real argument
 *  yet because there is no session/role object to pass — a future
 *  permission layer would thread one through here (and every other
 *  function this file grows) rather than each gated call site inventing
 *  its own check. */
export function canLoadRulesetReference(/* session */) {
  return true;
}
