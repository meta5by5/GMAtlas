// accountSettings.js — the account-wide settings every signed-in device
// shares (Phase S2, design/adr/personal-sync.md "Account settings"): Rules
// Profiles (Storyboard positions, modules, ruleset, crew tasks), the Turn
// Step List inventory, the Reference TOC library, and which profile each
// synced campaign uses. Pure: store.js merges these with syncOps' per-field
// clocks, core/sync.js moves them, encrypted, through the server.
//
// The synced form ("view") is a plain document:
//   { profiles: [...], turnStepLists: [...], tocLibrary: {...},
//     campaignProfiles: { [campaignId]: profileId } }
// campaignProfiles covers synced campaigns only; a local campaign's choice
// stays on this device until it syncs. A device only speaks for the
// campaigns it syncs: entries for campaigns it doesn't have are carried
// over from what it last saw (`prior`), never removed.

const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** The synced view of an appConfig. `prior` is the view last synced (its
 *  campaignProfiles entries for other campaigns are kept). */
export function accountSettingsView(appConfig, prior = null) {
  const cfg = appConfig || {};
  const campaignProfiles = { ...((prior && isPlainObject(prior.campaignProfiles)) ? prior.campaignProfiles : {}) };
  for (const c of cfg.campaigns || []) {
    if (c.sync && c.profileId) campaignProfiles[c.id] = c.profileId;
  }
  return {
    profiles: cfg.profiles || [],
    turnStepLists: cfg.turnStepLists || [],
    tocLibrary: cfg.tocLibrary || {},
    campaignProfiles,
  };
}

/** `appConfig` with a synced view applied: profiles, lists and the TOC
 *  library replaced, and each campaign here that the view names moved to
 *  that profile (if it exists). Returns a new object. */
export function withAccountSettings(appConfig, view) {
  const v = view || {};
  const profiles = Array.isArray(v.profiles) ? clone(v.profiles) : appConfig.profiles;
  const ids = new Set((profiles || []).map((p) => p.id));
  const map = isPlainObject(v.campaignProfiles) ? v.campaignProfiles : {};
  return {
    ...appConfig,
    profiles,
    turnStepLists: Array.isArray(v.turnStepLists) ? clone(v.turnStepLists) : appConfig.turnStepLists,
    tocLibrary: isPlainObject(v.tocLibrary) ? clone(v.tocLibrary) : appConfig.tocLibrary,
    campaigns: (appConfig.campaigns || []).map((c) => {
      const pid = map[c.id];
      return pid && ids.has(pid) && c.profileId !== pid ? { ...c, profileId: pid } : c;
    }),
  };
}

// A record's content, without the fields every device stamps differently.
function content(record) {
  const { id, createdAt, updatedAt, ...rest } = record || {};
  return JSON.stringify(rest, Object.keys(flatKeys(rest)).sort());
}
function flatKeys(o, out = {}) {
  if (Array.isArray(o)) { for (const x of o) flatKeys(x, out); return out; }
  if (isPlainObject(o)) for (const k of Object.keys(o)) { out[k] = 1; flatKeys(o[k], out); }
  return out;
}

/** Folds an id-addressed list from this device into the account's. A
 *  local record with the same name as an account record is dropped in
 *  favour of the account's (its id recorded in `remap`) when it holds the
 *  same content, or is still exactly the app's own seed of that name
 *  (`seeds`: untouched here, so the account's copy, edited or not, is the
 *  one to keep). Every other local record the account lacks is added after
 *  the account's, so nothing edited on either side is lost. */
function joinRecords(remote, local, remap, seeds) {
  const out = clone(remote || []);
  const byId = new Set(out.map((r) => String(r.id)));
  const pristine = (rec) => (seeds || []).some((s) => s.name === rec.name && content(s) === content(rec));
  for (const rec of local || []) {
    if (byId.has(String(rec.id))) continue;
    const twin = out.find((r) => r.name === rec.name && content(r) === content(rec))
      || (pristine(rec) && out.find((r) => r.name === rec.name));
    if (twin) { remap[rec.id] = twin.id; continue; }
    out.push(clone(rec));
    byId.add(String(rec.id));
  }
  return out;
}

/** What a device's first sync of account settings joins to, when the
 *  account already has some: the account's settings, plus whatever this
 *  device has that the account doesn't. Nothing of the account's is
 *  removed or changed. Untouched seeds this device made itself fold into
 *  the account's same-named ones instead of duplicating them; `remap`
 *  says which local ids became which account ids, for the campaigns that
 *  point at them.
 *  `seeds` ({profiles, turnStepLists}) is what a brand-new install starts
 *  with. Returns { view, remap: { profiles: {old: new}, turnStepLists: {old: new} } }. */
export function joinAccountSettings(remoteView, localView, { seeds = null } = {}) {
  const remote = remoteView || {};
  const local = localView || {};
  const remap = { profiles: {}, turnStepLists: {} };
  const profiles = joinRecords(remote.profiles, local.profiles, remap.profiles, seeds && seeds.profiles);
  const turnStepLists = joinRecords(remote.turnStepLists, local.turnStepLists, remap.turnStepLists, seeds && seeds.turnStepLists);
  const tocLibrary = { ...clone(local.tocLibrary || {}), ...clone(remote.tocLibrary || {}) };
  const campaignProfiles = { ...(remote.campaignProfiles || {}) };
  for (const [cid, pid] of Object.entries(local.campaignProfiles || {})) {
    if (!(cid in campaignProfiles)) campaignProfiles[cid] = remap.profiles[pid] || pid;
  }
  return { view: { profiles, turnStepLists, tocLibrary, campaignProfiles }, remap };
}

/** `appConfig` with campaigns' profile ids moved per `remap.profiles`. */
export function remapCampaignProfiles(appConfig, profileRemap) {
  if (!profileRemap || !Object.keys(profileRemap).length) return appConfig;
  return {
    ...appConfig,
    campaigns: (appConfig.campaigns || []).map((c) => (profileRemap[c.profileId] ? { ...c, profileId: profileRemap[c.profileId] } : c)),
  };
}

/** A campaign document with its Turn Step slot assignments moved per
 *  `remap.turnStepLists`; the same object when nothing changes. */
export function remapTurnStepSlots(doc, listRemap) {
  const slots = doc && doc.turnStepSlotAssignments;
  if (!slots || !listRemap) return doc;
  let changed = false;
  const next = { ...slots };
  for (const [slot, id] of Object.entries(slots)) {
    if (id && listRemap[id]) { next[slot] = listRemap[id]; changed = true; }
  }
  return changed ? { ...doc, turnStepSlotAssignments: next } : doc;
}
