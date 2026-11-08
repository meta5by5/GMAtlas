// syncPolicy.js — where each part of the stored state may travel once sync
// exists (design/ACCOUNTS-SYNC-ROADMAP.md, section 5.2). Pure data. The
// resolver that reads it is syncScopeFor() in domain/syncOps.js, and a test
// fails if any top-level campaign or appConfig key is left unclassified, so
// a new field is never synced (or leaked) by accident.
//
// Scopes:
//   local    never leaves this device (UI state, drafts, device choices)
//   account  the signed-in user's own devices only
//   gm       the campaign's GM partition (everything a GM sees today)
//   overlay  never stored here at all: store.get() splices it in from
//            appConfig, so it syncs (if ever) with its real owner
//
// The `table` and `player` partitions (Phase S5) are projections chosen per
// record by a `visibility` field, not by path, so they don't appear here.
// Document and image bytes are never in a synced op regardless of scope:
// syncOps refuses any `data:` URL value (Phase S0, roadmap section 6.1).
//
// Keys are dotted paths. The longest matching prefix wins, so a nested
// entry overrides its parent.

export const CAMPAIGN_SYNC_POLICY = {
  schemaVersion: 'gm',
  app: 'gm',
  meta: 'gm',
  context: 'gm',
  entities: 'gm',
  scenes: 'gm',
  journal: 'gm',
  journalDraft: 'local',
  timeline: 'gm',
  threads: 'gm',
  foreshadowing: 'gm',
  worldFlags: 'gm',
  factionEvents: 'gm',
  factionTurnNumber: 'gm',
  missions: 'gm',
  director: 'gm',
  oracles: 'gm',
  documents: 'gm',
  gallery: 'gm',
  battlemaps: 'gm',
  worldTracker: 'gm',
  hexcrawls: 'gm',
  dungeonCrawls: 'gm',
  party: 'gm',
  colony: 'gm',
  combatTracker: 'gm',
  turnStepProgress: 'gm',
  turnStepSlotAssignments: 'gm',
  crewTaskProgress: 'gm',
  guide: 'gm',
  trade: 'gm',
  mechanicsIndex: 'gm',
  settings: 'gm',
  'settings.ui': 'local',
  'settings.form': 'local',
  'settings.licenses': 'overlay',
  drawers: 'local',
  _legacy: 'gm',
  turnStepLists: 'overlay',
  crewTasks: 'overlay',
};

export const APP_CONFIG_SYNC_POLICY = {
  activeCampaignId: 'local',
  // This device's campaign index. Which campaigns are synced is the
  // server's list (Phase S2), not this array.
  campaigns: 'local',
  profiles: 'account',
  turnStepLists: 'account',
  tocLibrary: 'account',
  // Self-attested book ownership: follows the user (roadmap section 4.5).
  licenses: 'account',
  licensesVersion: 'local',
  // Today's local allow/deny map; Phase S1 derives it from the signed
  // entitlement certificate instead.
  entitlements: 'local',
  // This install's sign-in state (Phase S1): its device id, the signed-in
  // user and device, and the last entitlement certificate. It describes
  // this device, so it never syncs.
  account: 'local',
  // Synced campaigns removed from this device on purpose, so sync-by-
  // default (Phase S2) doesn't download them again. Per device.
  syncDeclined: 'local',
  // Device-to-device transfer settings (Phase S3): "Direct connections
  // only" is a choice about this device's network, so it stays here.
  p2p: 'local',
};
