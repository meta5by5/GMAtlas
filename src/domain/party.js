// party.js — the Party tab: a live roster (NPC entities tagged #character —
// see domain/statblocks.js hasCharacterTag) plus free-form, party-wide
// resource trackers that aren't tied to any one entity (credits, custom
// clocks, timers). Ported from the old prototype's split between an
// entity-driven roster and a generic tracker list (see PROGRESS.md
// ISSUES/FINDINGS #1) — kept as two separate concerns here too, since a
// tracker like "party credits" has no natural entity to live on.

import { listEntities, getEntity } from './entities.js';
import { hasCharacterTag } from './statblocks.js';
import {
  findProgressDifficulty, STARFORGED_PROGRESS_TRACK_MAX,
  STARFORGED_MOMENTUM_MIN, STARFORGED_MOMENTUM_MAX, STARFORGED_MOMENTUM_RESET, STARFORGED_SUPPLY_MAX,
} from '../data/rulesets.js';
import { isGameSystemActivated } from '../data/rulesConstitution.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

function ensure(campaign) {
  if (!campaign.party || typeof campaign.party !== 'object') campaign.party = { trackers: [] };
  if (!Array.isArray(campaign.party.trackers)) campaign.party.trackers = [];
  if (campaign.party.sharedGear === undefined) campaign.party.sharedGear = '';
  if (!Array.isArray(campaign.party.sharedAssets)) campaign.party.sharedAssets = [];
  if (!Array.isArray(campaign.party.sharedAssetIds)) campaign.party.sharedAssetIds = [];
  // Relationships (direct follow-up request: "add a Relationships section
  // similar to how used on Entity Editor. This treats the Party as an
  // entity for the mapping purposes") — one-directional, Party-side-only
  // storage: {to, label, type, strength}, same shape a real entity's own
  // `relationships` array uses (entities.js), but never mirrored onto the
  // target entity's own list — "Party" has no real entity record to mirror
  // onto. Starship (direct follow-up request): a single #vehicle-tagged
  // entity reference, exclusively tagged #starship campaign-wide — see
  // setPartyStarship/clearPartyStarship below. starshipCampaignTurn is the
  // Campaign panel's Starship tab's own independent turn counter (no
  // Planetfall accrual — direct follow-up request).
  if (!Array.isArray(campaign.party.relationships)) campaign.party.relationships = [];
  if (campaign.party.starshipEntityId === undefined) campaign.party.starshipEntityId = null;
  if (campaign.party.starshipCampaignTurn === undefined) campaign.party.starshipCampaignTurn = 0;
  // The Campaign panel's Warband tab (Five Leagues from the Borderlands) —
  // its own independent turn counter, same shape as starshipCampaignTurn
  // above. No warbandEntityId: a warband is the whole roster (already
  // visible via Cast/Party), not one reference-by-id entity like the
  // Starship tab's single-ship picker.
  if (campaign.party.warbandCampaignTurn === undefined) campaign.party.warbandCampaignTurn = 0;
  return campaign.party;
}

/** Party members = NPC entities tagged #character. */
export function listPartyMembers(campaign) {
  return listEntities(campaign, ['npc']).filter(hasCharacterTag);
}

/** The member's own statblock fields (across every ENABLED — non-archived
 *  — statblock group they carry: a Character Sheet AND any Bestiary group
 *  at once, since #character NPCs can have both, or even two different
 *  rulesets' Character Sheets at once) whose key matches one of
 *  settings.partyHeadlineFields (case-insensitive) — what the Party
 *  Roster's collapsed member row shows as small right-aligned counters
 *  (direct request: "GM picks per-ruleset which fields surface"). Direct
 *  follow-up request: "whatever is added to 'Party Roster headline
 *  fields' should be checked as a statblock and displayed if present in
 *  any of the enabled character sheets" — ANY field kind (attribute,
 *  track, or plain text) is eligible, not just track fields as this used
 *  to require (a GM naming an attribute like Five Leagues' "Combat Skill"
 *  used to silently never surface here); an ARCHIVED group (the Bestiary/
 *  Character sheet currently swapped OUT of view, see ensureAutoStatblock)
 *  is skipped, since its fields aren't really "present" while hidden.
 *  Order follows settings.partyHeadlineFields, not field/group order, so a
 *  GM's chosen priority (e.g. "Health before Momentum") is honored
 *  regardless of how the underlying groups are sorted. Returns {f, gi, fi}
 *  triples — gi/fi index into entity.statblocks exactly like every other
 *  statblock mutator in this app expects. */
export function listPartyHeadlineTracks(campaign, entity) {
  const wanted = ((campaign.settings && campaign.settings.partyHeadlineFields) || []).map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!wanted.length) return [];
  const groups = entity.statblocks || [];
  const found = [];
  groups.forEach((group, gi) => {
    if (group.archived) return;
    (group.fields || []).forEach((f, fi) => {
      if (f && wanted.includes(String(f.key || '').trim().toLowerCase())) found.push({ f, gi, fi });
    });
  });
  return wanted
    .map((name) => found.find(({ f }) => String(f.key || '').trim().toLowerCase() === name))
    .filter(Boolean);
}

export function listPartyTrackers(campaign) {
  return ((campaign.party && campaign.party.trackers) || []);
}

// Which Party Tracker NAMES (lowercased) each ruleset's own auto-seed
// function below actually creates — a lookup, not a stored field on the
// tracker itself, since adding a `ruleset` field would be a schema change
// for something fully derivable from the name a GM hasn't renamed away
// from its seeded default (renaming one just means it stops being
// recognized as that ruleset's own, same as any other "matched by name"
// convention this app already uses — e.g. listPartyHeadlineTracks). Direct
// follow-up request ("the trackers on Navigator are for Starforged and
// should be filtered to that ruleset and all rulesets activated would
// have their trackers added to Navigator"): this is what lets the
// Navigator isolate "just Five Leagues' own trackers" out of a party.
// trackers array that may carry more than one ruleset's worth at once
// (ensureParty*Trackers below never removes a prior ruleset's own
// trackers when the GM switches statRuleset away from it).
const RULESET_OWNED_TRACKER_NAMES = {
  starforged: ['momentum', 'supply'],
  fiveleagues: ['gold marks', 'enemy threat', 'enemy plans'],
};

/** Whichever of campaign.party.trackers belong to `rulesetId`, matched by
 *  name against RULESET_OWNED_TRACKER_NAMES. Empty for a ruleset with no
 *  entry there yet (SWN/5PFH/Planetfall have no dedicated Party Tracker
 *  auto-seed of their own today) rather than throwing — callers can treat
 *  "no trackers" and "unrecognized ruleset" identically. */
export function listPartyTrackersForRuleset(campaign, rulesetId) {
  const names = RULESET_OWNED_TRACKER_NAMES[rulesetId];
  if (!names) return [];
  return listPartyTrackers(campaign).filter((t) => names.includes(String(t.name || '').trim().toLowerCase()));
}

/** A tracker's kind (and, for a Starforged counter, its difficulty) is fixed
 *  for its lifetime — chosen once at creation, never edited afterward (see
 *  updatePartyTracker below). `max` (meter box count, "usually 5 or 10 in
 *  Starforged" but any size the GM wants) and `difficulty` (a counter, only
 *  when the campaign's stat ruleset is Starforged — one of
 *  data/rulesets.js's STARFORGED_PROGRESS_DIFFICULTIES) are both
 *  creation-time-only for the same reason. `min`/`max` only apply to a
 *  'gauge' (a bidirectional single-position track like Momentum, see
 *  setGaugeTrackerValue below — unlike 'meter', it can go negative and
 *  isn't a fill-from-zero count). */
export function addPartyTracker(campaign, { name = 'New Tracker', kind = 'meter', value = 0, max = 5, min = -6, difficulty = '' } = {}) {
  const next = clone(campaign);
  const party = ensure(next);
  const validKind = ['meter', 'counter', 'currency', 'gauge'].includes(kind) ? kind : 'meter';
  const isStarforged = ((next.settings && next.settings.statRuleset) || 'starforged') === 'starforged';
  const rank = validKind === 'counter' && isStarforged ? findProgressDifficulty(difficulty) : null;
  const tracker = {
    id: 'ptrk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name, kind: validKind,
    value: Number(value) || 0,
  };
  if (validKind === 'meter') tracker.max = Math.max(1, Number(max) || 5);
  if (validKind === 'gauge') {
    tracker.min = Number.isFinite(Number(min)) ? Number(min) : -6;
    tracker.max = Number.isFinite(Number(max)) ? Number(max) : 10;
    tracker.value = Math.max(tracker.min, Math.min(tracker.max, tracker.value));
  }
  if (rank) tracker.difficulty = rank.id;
  party.trackers.push(tracker);
  return next;
}

/** Click-to-set a gauge tracker (Momentum) directly to n, clamped to its own
 *  [min, max] — unlike setPartyTrackerValue's meter boxes (fill-from-zero,
 *  click-the-filled-box-to-decrement), a gauge shows a single CURRENT
 *  POSITION that can be negative, so every box just sets the value to its
 *  own number outright — no toggle-off ambiguity. */
export function setGaugeTrackerValue(campaign, id, n) {
  const next = clone(campaign);
  const party = ensure(next);
  const t = party.trackers.find((x) => x.id === id);
  if (!t || t.kind !== 'gauge') return next;
  const min = Number.isFinite(t.min) ? t.min : -6;
  const max = Number.isFinite(t.max) ? t.max : 10;
  t.value = Math.max(min, Math.min(max, Number(n) || 0));
  return next;
}

/** The 10 (or fewer, if the real range is smaller) consecutive integers to
 *  render as a gauge's boxes — a fixed-size WINDOW onto [min, max] that
 *  always contains the current value, centered on it where the range's own
 *  edges allow. Momentum's real range (-6..10, 17 values) can't all fit in
 *  10 boxes at once, so which box reads "0" shifts position within the
 *  rendered row as the window slides to follow the current value — a
 *  deliberate design choice (direct request), not a limitation glossed
 *  over. Pure/exported so the UI's rendering and this math share one tested
 *  source instead of the window logic living untested in drawers/index.js. */
export function gaugeWindow(value, min, max, size = 10) {
  const v = Math.max(min, Math.min(max, Number(value) || 0));
  const span = Math.max(1, Math.min(size, max - min + 1));
  let start = v - Math.floor((span - 1) / 2);
  if (start < min) start = min;
  if (start + span - 1 > max) start = max - span + 1;
  return Array.from({ length: span }, (_, i) => start + i);
}

// Direct follow-up request, supersedes this function's own prior "never
// removed" design: "auto-setup and configure all trackers and shared
// fields in a game system module when that module is activated. Keep it
// in a record of module-specific functionality such that they are removed
// if the campaign or profile is modified or disabled where those
// trackers... are no longer applicable." Every tracker either ensure
// function below creates now carries its own `moduleId` — the ONE thing
// that lets this distinguish "auto-created by a module, safe to tear
// down" from a GM's own hand-added tracker (addPartyTracker, no moduleId
// — NEVER touched by this). Re-activating a module later recreates its
// trackers fresh (value reset to the same starting figure a brand-new
// one gets) rather than restoring whatever the GM had tracked before
// deactivating — an accepted, explicit tradeoff per this request's own
// wording, not an oversight.
/** Auto-populates Momentum (a 'gauge', -6..10, reset value +2) and Supply (a
 *  'meter', 0..5, starting full) onto the Party Tracker list the first time
 *  it's viewed under the Starforged ruleset (direct request) — idempotent
 *  (matched by name, case-insensitive) so it's safe to call on every Party
 *  drawer open rather than needing a one-time migration flag. Starforged
 *  has no Game System Activation gate of its own (always "on"), so
 *  statRuleset itself is the only real "is this the active one" signal —
 *  removes both (by moduleId, not name, so a GM's own same-named tracker
 *  is never caught in this) the moment statRuleset moves away from it. */
export function ensurePartyStarforgedTrackers(campaign, settings = campaign.settings) {
  const isStarforged = ((settings && settings.statRuleset) || 'starforged') === 'starforged';
  const next = clone(campaign);
  const party = ensure(next);
  if (!isStarforged) {
    party.trackers = party.trackers.filter((t) => t.moduleId !== 'starforged');
    return next;
  }
  const hasByName = (name) => party.trackers.some((t) => (t.name || '').trim().toLowerCase() === name);
  if (!hasByName('momentum')) {
    party.trackers.push({
      id: 'ptrk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: 'Momentum', kind: 'gauge', moduleId: 'starforged',
      value: STARFORGED_MOMENTUM_RESET, min: STARFORGED_MOMENTUM_MIN, max: STARFORGED_MOMENTUM_MAX,
    });
  }
  if (!hasByName('supply')) {
    party.trackers.push({
      id: 'ptrk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: 'Supply', kind: 'meter', moduleId: 'starforged',
      value: STARFORGED_SUPPLY_MAX, max: STARFORGED_SUPPLY_MAX,
    });
  }
  return next;
}

/** Same idempotent-by-name, call-on-every-Party-open shape as
 *  ensurePartyStarforgedTrackers above, for Five Leagues from the
 *  Borderlands (direct follow-up request: "When the campaign ruleset
 *  assigns 5LFB, auto-create the Party trackers for Gold Marks currency
 *  tracker and other trackers common to the ruleset") — three real,
 *  warband-wide (not per-character) mechanics named in the rulebook's own
 *  Campaign Turn sequence (data/turnStepListFiveLeagues.js's own step
 *  text, confirmed against the real PDF): Gold Marks (a 'currency'
 *  tracker — "if the warband has no Gold Marks, check Hard Times," p.81),
 *  Enemy Threat (a 'counter' — "track and escalate the current Enemy
 *  Threat level as the campaign progresses," p.97), and Enemy Plans (a
 *  'counter' — "advance the current Enemy's own scheme per the Enemy
 *  Plans track," p.207). All three start at 0 rather than a guessed
 *  starting figure — a new warband's actual starting Gold Marks (and
 *  Threat/Plans position) depends on the specific scenario/campaign
 *  start the GM is running, not a single fixed rulebook number the way
 *  Starforged's own Momentum reset (+2) or Supply max are. Direct follow-
 *  up request ("auto-setup... when that module is activated... removed
 *  if... disabled") moved the trigger from statRuleset to the real
 *  fiveleagues Game System Activation checkbox itself (Settings →
 *  Licenses) — Five Leagues, unlike Starforged, actually has one — and
 *  all three now get torn down (by moduleId, not name, so a GM's own
 *  same-named tracker is never caught in this) the moment that checkbox
 *  is unchecked, rather than staying forever once created. */
export function ensurePartyFiveLeaguesTrackers(campaign, settings = campaign.settings) {
  const isFiveLeaguesActive = isGameSystemActivated({ settings }, 'fiveleagues');
  const next = clone(campaign);
  const party = ensure(next);
  if (!isFiveLeaguesActive) {
    party.trackers = party.trackers.filter((t) => t.moduleId !== 'fiveleagues');
    return next;
  }
  const hasByName = (name) => party.trackers.some((t) => (t.name || '').trim().toLowerCase() === name);
  const newTracker = (name, kind) => ({ id: 'ptrk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, kind, value: 0, moduleId: 'fiveleagues' });
  if (!hasByName('gold marks')) party.trackers.push(newTracker('Gold Marks', 'currency'));
  if (!hasByName('enemy threat')) party.trackers.push(newTracker('Enemy Threat', 'counter'));
  if (!hasByName('enemy plans')) party.trackers.push(newTracker('Enemy Plans', 'counter'));
  return next;
}

/** Rename only — kind/difficulty/max are creation-time-only (see
 *  addPartyTracker), so they're stripped from any patch here rather than
 *  trusted to a caller that "shouldn't" send them. */
export function updatePartyTracker(campaign, id, patch) {
  const next = clone(campaign);
  const party = ensure(next);
  const t = party.trackers.find((x) => x.id === id);
  if (t) {
    const { kind, difficulty, max, min, ...rest } = patch || {};
    Object.assign(t, rest);
  }
  return next;
}

/** Step a counter/currency tracker by delta. A Starforged-difficulty counter
 *  steps by that rank's tick count (Troublesome=12 ... Epic=1, out of a
 *  40-tick track — data/rulesets.js's STARFORGED_PROGRESS_DIFFICULTIES/
 *  STARFORGED_PROGRESS_TRACK_MAX) instead of a plain +1, so it actually
 *  behaves like the Vow/quest progress track it's standing in for. Meters
 *  are click-to-set (see setPartyTrackerValue) and don't step. */
export function stepPartyTracker(campaign, id, delta) {
  const next = clone(campaign);
  const party = ensure(next);
  const t = party.trackers.find((x) => x.id === id);
  if (!t || t.kind === 'meter') return next;
  const rank = t.difficulty && findProgressDifficulty(t.difficulty);
  const step = rank ? rank.ticks : 1;
  const raw = (Number(t.value) || 0) + delta * step;
  t.value = rank ? Math.max(0, Math.min(STARFORGED_PROGRESS_TRACK_MAX, raw)) : Math.max(0, raw);
  return next;
}

/** Click-to-set a meter tracker's box (clicking the currently-filled box
 *  clears down by one) — the same interaction as an entity statblock's
 *  track boxes (see domain/statblocks.js's setStatblockTrackValue), now
 *  that a Party meter renders as boxes instead of a numeric ratio. */
export function setPartyTrackerValue(campaign, id, n) {
  const next = clone(campaign);
  const party = ensure(next);
  const t = party.trackers.find((x) => x.id === id);
  if (!t || t.kind !== 'meter') return next;
  const max = t.max || 5;
  const target = t.value === n ? n - 1 : n;
  t.value = Math.max(0, Math.min(max, target));
  return next;
}

export function removePartyTracker(campaign, id) {
  const next = clone(campaign);
  const party = ensure(next);
  party.trackers = party.trackers.filter((x) => x.id !== id);
  return next;
}

/** Party-wide free-text gear notes (not tied to any one character) —
 *  e.g. a shared toolkit, a ship's medkit. One field, overwritten
 *  wholesale on each edit like every other rich-text field in this app. */
export function setPartySharedGear(campaign, text) {
  const next = clone(campaign);
  const party = ensure(next);
  party.sharedGear = String(text || '');
  return next;
}

/** Append a free-text Shared Asset. Mirrors addPartyTracker's shape
 *  (party-level, not entity-level — see entities.js's addFactionAsset
 *  for the entity-scoped equivalent this deliberately does NOT reuse). */
export function addPartySharedAsset(campaign, text) {
  const next = clone(campaign);
  const party = ensure(next);
  const clean = String(text || '').trim();
  if (!clean) return next;
  party.sharedAssets.push(clean);
  return next;
}

/** Remove one Shared Asset by index. */
export function removePartySharedAsset(campaign, index) {
  const next = clone(campaign);
  const party = ensure(next);
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i >= party.sharedAssets.length) return next;
  party.sharedAssets.splice(i, 1);
  return next;
}

/** A real Asset ENTITY (a vehicle, typically — see the "+Vehicle" picker,
 *  shell.js) linked into Shared Assets, distinct from the plain free-text
 *  strings above — this one renders as a real entity thumbnail (opens the
 *  Entity Editor, shows its Vehicle Statblock) rather than a static chip.
 *  Deliberately a separate array from sharedAssets rather than repurposing
 *  it, since existing campaigns' sharedAssets entries are plain typed
 *  strings with no entity behind them (migration rule 5 — never reinterpret
 *  an existing field's meaning). */
export function addPartySharedAssetEntity(campaign, entityId) {
  const next = clone(campaign);
  const party = ensure(next);
  if (entityId && !party.sharedAssetIds.includes(entityId)) party.sharedAssetIds.push(entityId);
  return next;
}

export function removePartySharedAssetEntity(campaign, entityId) {
  const next = clone(campaign);
  const party = ensure(next);
  party.sharedAssetIds = party.sharedAssetIds.filter((id) => id !== entityId);
  return next;
}

/** Direct follow-up request: "If an Asset is added to the party and then
 *  changed to 'vehicle' (but was originally added as just an Asset), then
 *  rescan the party shared assets and notify the user it will be removed
 *  since it changed asset type." Called from the Entity Editor's own tag-
 *  input commit (shell.js) right after a tag is added — a no-op unless
 *  `entityId` is BOTH currently linked in Shared Assets AND now tagged
 *  #vehicle (the "+Vehicle" create flow itself tags #vehicle BEFORE
 *  linking the entity here, so it never trips this; only a RETROACTIVE
 *  retag of an already-linked, previously-non-vehicle entity does).
 *  Returns `{ campaign, removed }` rather than just the campaign — shell.js
 *  uses `removed` to decide whether to toast the GM, without having to
 *  separately re-diff sharedAssetIds itself. */
export function reconcilePartySharedAssetVehicleTag(campaign, entityId) {
  const party = campaign.party || {};
  const linked = (party.sharedAssetIds || []).includes(entityId);
  if (!linked) return { campaign, removed: false };
  const entity = getEntity(campaign, entityId);
  const isVehicle = !!(entity && (entity.tags || []).includes('vehicle'));
  if (!isVehicle) return { campaign, removed: false };
  return { campaign: removePartySharedAssetEntity(campaign, entityId), removed: true };
}

// --- Party Relationships (direct follow-up request: "add a Relationships
// section similar to how used on Entity Editor. This treats the Party as
// an entity for the mapping purposes") ---------------------------------
// One-directional, Party-side-only: campaign.party.relationships holds
// {to, label, type, strength}, the exact same shape a real entity's own
// relationships array uses (entities.js), and the SAME RELATIONSHIP_TYPES/
// RELATIONSHIP_TYPE_LABEL vocabulary (imported by the UI layer directly,
// not duplicated here) — but never mirrored onto the target entity's own
// list, since "Party" has no real entity record for entities.js's _link to
// push a reverse edge onto.
function clampStrength(n) {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.max(0, Math.min(10, v)) : 0;
}

/** Adds (or, if one already exists to this target, REPLACES — same "at
 *  most one edge to a given target" invariant a real entity's relationship
 *  list already has) a Party relationship. */
export function addPartyRelationship(campaign, targetId, label = 'linked', type = 'linked') {
  const next = clone(campaign);
  const party = ensure(next);
  party.relationships = party.relationships.filter((r) => r.to !== targetId);
  party.relationships.push({ to: targetId, label, type, strength: 0 });
  return next;
}

export function removePartyRelationship(campaign, targetId) {
  const next = clone(campaign);
  const party = ensure(next);
  party.relationships = party.relationships.filter((r) => r.to !== targetId);
  return next;
}

export function updatePartyRelationshipLabel(campaign, targetId, label) {
  const next = clone(campaign);
  const party = ensure(next);
  const r = party.relationships.find((rel) => rel.to === targetId);
  if (r) r.label = label;
  return next;
}

export function updatePartyRelationshipType(campaign, targetId, type) {
  const next = clone(campaign);
  const party = ensure(next);
  const r = party.relationships.find((rel) => rel.to === targetId);
  if (r) r.type = type;
  return next;
}

export function updatePartyRelationshipStrength(campaign, targetId, strength) {
  const next = clone(campaign);
  const party = ensure(next);
  const r = party.relationships.find((rel) => rel.to === targetId);
  if (r) r.strength = clampStrength(strength);
  return next;
}

// --- Party Starship (direct follow-up request) -------------------------
// A single #vehicle-tagged entity, exclusively tagged #starship
// campaign-wide (enforced here, not left to the UI): selecting one (a)
// strips #starship from whoever currently holds it — anywhere in
// campaign.entities.items, not just the previous party.starshipEntityId,
// so a manually-mistagged duplicate can never coexist — (b) tags the new
// entity #starship, (c) replaces any existing "Owns" Party relationship
// pointing at the OLD starship with one pointing at the new entity (owns
// already exists in entities.js's RELATIONSHIP_TYPES/expects target type
// 'asset' — no new relationship type needed), (d) sets
// party.starshipEntityId. clearPartyStarship reverses all three side
// effects. Both are single atomic mutators (not a compose-in-the-UI
// pattern) so the tag/relationship/field invariant can never drift apart.
export function setPartyStarship(campaign, entityId) {
  const next = clone(campaign);
  const party = ensure(next);
  const items = (next.entities && next.entities.items) || [];
  for (const e of items) {
    if (e.id !== entityId && Array.isArray(e.tags) && e.tags.some((t) => t.toLowerCase() === 'starship')) {
      e.tags = e.tags.filter((t) => t.toLowerCase() !== 'starship');
    }
  }
  const target = items.find((e) => e.id === entityId);
  if (target) {
    if (!Array.isArray(target.tags)) target.tags = [];
    if (!target.tags.some((t) => t.toLowerCase() === 'starship')) target.tags.push('starship');
  }
  // Only the auto-managed "Owns" edge to the OLD starship is dropped — a
  // manually-added, differently-typed Party relationship to that same
  // entity (added via the generic Relationships section before it became
  // the starship) is left alone.
  party.relationships = party.relationships.filter((r) => !(r.type === 'owns' && r.to === party.starshipEntityId));
  if (target) {
    party.relationships = party.relationships.filter((r) => r.to !== entityId);
    party.relationships.push({ to: entityId, label: 'Owns', type: 'owns', strength: 0 });
  }
  party.starshipEntityId = target ? entityId : null;
  return next;
}

/** Detaches the current starship without picking a new one — untags the
 *  entity, drops the Owns relationship, nulls the field. No-op if none is
 *  currently set. */
export function clearPartyStarship(campaign) {
  const next = clone(campaign);
  const party = ensure(next);
  if (!party.starshipEntityId) return next;
  const target = getEntity(next, party.starshipEntityId);
  if (target && Array.isArray(target.tags)) target.tags = target.tags.filter((t) => t.toLowerCase() !== 'starship');
  party.relationships = party.relationships.filter((r) => !(r.type === 'owns' && r.to === party.starshipEntityId));
  party.starshipEntityId = null;
  return next;
}

/** Brings a campaign's module-owned Party Trackers in line with its profile:
 *  adds the trackers of a module that's in use, removes those (tagged
 *  moduleId) of one that no longer is. A GM's own trackers are never
 *  touched. `settings` is the profile-overlaid settings (a store.update()
 *  mutator only sees the raw doc). */
export function syncModuleTrackers(campaign, settings = campaign.settings) {
  return ensurePartyFiveLeaguesTrackers(ensurePartyStarforgedTrackers(campaign, settings), settings);
}

/** Older campaigns' module trackers were created before trackers carried a
 *  moduleId, so nothing ever removed them when the game system changed.
 *  Tags an untagged tracker whose name is one a module seeds with that
 *  module's id. Idempotent. */
export function tagLegacyModuleTrackers(campaign) {
  const trackers = campaign && campaign.party && Array.isArray(campaign.party.trackers) ? campaign.party.trackers : null;
  const moduleFor = (t) => {
    const name = String(t.name || '').trim().toLowerCase();
    return Object.keys(RULESET_OWNED_TRACKER_NAMES).find((m) => RULESET_OWNED_TRACKER_NAMES[m].includes(name));
  };
  if (!trackers || !trackers.some((t) => !t.moduleId && moduleFor(t))) return campaign;
  const next = clone(campaign);
  for (const t of next.party.trackers) {
    if (t.moduleId) continue;
    const moduleId = moduleFor(t);
    if (moduleId) t.moduleId = moduleId;
  }
  return next;
}
