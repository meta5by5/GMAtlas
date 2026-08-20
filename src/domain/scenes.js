// scenes.js — scene generation as pure functions. Adapted from v0.53's
// generateNextScene/mission/world seeds, but driven by the unified campaign
// model (context + settings.form) instead of reading the DOM.

import { getTable, pick } from './oracles.js';
import { getEntity, addRelationship, removeRelationship } from './entities.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

function safePick(tables, rng, ...path) {
  const t = getTable(tables, ...path);
  return Array.isArray(t) && t.length ? pick(t, rng) : null;
}

/** Generate the next scene from current context. Returns a scene object.
 *  `lensCategories` (docs/adr/0009-situation-engine-revisited.md, Decision
 *  item 3), if given a non-empty array of [group, table] Oracle paths,
 *  rolls the scene's Driver line from a random one of those categories
 *  instead of the generic Plot Engine > Scene Driver — the "filtered
 *  toward the chosen lens's mapped categories" suggestNextWithLens()
 *  (session.js) needs. Omitted/empty preserves this function's exact
 *  original behavior (used by the ordinary, lens-less Continue Story). */
export function generateScene(campaign, tables, rng = Math.random, lensCategories = null) {
  const what = campaign.context.what || {};
  const where = campaign.context.where || {};
  const form = campaign.settings.form || {};
  const scenes = campaign.scenes || [];
  const number = (scenes.length || 0) + 1;
  // Direct follow-up request: the party's cast carries forward into a new
  // scene by default — "clearing NPCs is not" by design, unlike Composer's
  // own textboxes, which already accumulate/append across scenes rather
  // than reset. Only the three Actor lists (Protagonists/Antagonists/
  // Bystanders) copy over; Assets present/Location details still start
  // fresh each scene, unchanged — a new scene isn't necessarily in the
  // same place or carrying the same gear, but it's very likely still
  // about the same people until the GM says otherwise.
  const prevScene = scenes[scenes.length - 1];
  const carriedProtagonistIds = prevScene ? [...(prevScene.protagonistIds || [])] : [];
  const carriedAntagonistIds = prevScene ? [...(prevScene.antagonistIds || [])] : [];
  const carriedBystanderIds = prevScene ? [...(prevScene.bystanderIds || [])] : [];

  const action = safePick(tables, rng, 'Core Oracles', 'Action');
  const theme = safePick(tables, rng, 'Core Oracles', 'Theme');
  const descriptor = safePick(tables, rng, 'Core Oracles', 'Descriptor');
  const focus = safePick(tables, rng, 'Core Oracles', 'Focus');
  const sensory = safePick(tables, rng, 'Location Themes', 'Sensory Detail');
  const clue = safePick(tables, rng, 'Miscellaneous', 'Story Clue');
  const complication = safePick(tables, rng, 'Miscellaneous', 'Story Complication');
  const sceneDriver = (lensCategories && lensCategories.length)
    ? safePick(tables, rng, ...lensCategories[Math.floor(rng() * lensCategories.length)])
    : safePick(tables, rng, 'Plot Engine', 'Scene Driver');
  const consequence = safePick(tables, rng, 'Miscellaneous', 'Pay the Price');

  const threat = what.threat || 0;
  const mystery = what.mystery || 0;
  // Site Description/Immediate Surroundings (direct follow-up request —
  // these replaced the long-dead where.summary/"Focus" field, and the
  // legacy settings.form.locationType/surroundings fallback before that,
  // as WHERE's actual current-location description) are what a fresh
  // scene's own summary/memory fields are seeded from now.
  const location = [where.siteDescription, where.surroundings].filter(Boolean).join(' — ') || 'the current location';
  const intent = what.intent || 'Discovery';

  // "Opening" is stored as the FULL sentence, computed once here from its
  // oracle-rolled ingredients (descriptor, sensory detail, a threat/mystery
  // mood aside) — not re-derived from those pieces on every recompose. A
  // GM editing the Opening field is editing the actual line shown, not a
  // fragment nested inside a fixed template (a real gap the first version
  // of this split left: only the sensory detail was ever editable).
  const pressure = pressureLine(threat, mystery);
  const opening = `The scene opens in a ${descriptor ? descriptor.toLowerCase() : 'quiet'} space. First impression — ${sensory || 'a low hum and stale air'}. ${pressure}`;

  const scene = {
    id: 'scn_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    number,
    createdAt: new Date().toISOString(),
    intent,
    summary: `${intent} at ${location}`,
    memory: location,
    threat,
    mystery,
    spine: { action, theme, descriptor, focus },
    opening,
    driver: sceneDriver || 'An unresolved thread pulls the party forward.',
    clue: clue || 'A detail here connects to the current thread.',
    complication: complication || 'Something makes the obvious choice costly.',
    // Was a fixed, un-editable sentence baked into recomposeSceneText;
    // promoted to a real field (like opening/driver/clue/complication)
    // so a GM can rewrite the actual tradeoff instead of always seeing
    // this same generic framing.
    decisionPoint: 'Weigh immediate safety, mission progress, and leverage over whoever is behind this.',
    consequence: consequence || 'Pay the price — something is lost or complicated.',
    situationLine: what.situation ? what.situation.split('\n')[0] : '',
    // Scene-scoped NPC state (docs/adr/0041 Phase 13b) — WHO's per-NPC
    // Disposition/Motivation/Threat Rank/Challenges/Opportunities, keyed
    // by entity id; and the three GM-curated Actor lists (Protagonists/
    // Antagonists/Bystanders — all three equally GM-picked via WHO's "+"
    // entity picker, docs/adr/0041 WHO redesign; see
    // addSceneProtagonist/addSceneAntagonist/addSceneBystander below).
    // Deliberately lives on the scene object, not a permanent entity
    // mutation or a new top-level campaign array — "specific to this
    // situation," same reasoning as the split Latest Scene fields above.
    npcStates: {},
    protagonistIds: carriedProtagonistIds,
    antagonistIds: carriedAntagonistIds,
    bystanderIds: carriedBystanderIds,
    // "Assets present" (WHO redesign, direct follow-up request) — a
    // fourth GM-curated scene list, same shape as bystanderIds, but for
    // #asset-TYPE entities (not NPCs) — deliberately NOT part of
    // ACTOR_LIST_KEY/moveSceneActor below, since dragging an Asset into
    // Protagonists/Antagonists/Bystanders (or vice versa) has no meaning.
    assetIds: [],
    // WHERE's own curated Location list (direct follow-up request —
    // "remove Focus... under WHERE it happens"): WHERE used to derive
    // "the current location(s)" by scanning Focus text for @mentions;
    // Focus is gone the same way WHO's was, so this is now the single
    // source of truth instead — factionTurnEngine.js's
    // getCurrentWhereLocations reads THIS, not Focus text, and its first
    // entry is "the" primary current location everywhere that concept is
    // used (System/Star resolution, Location Details, Faction/Conflict
    // presence blocks, ...).
    locationIds: [],
    // WHO's "Factions active nearby" ✕ (direct follow-up request — parity
    // with NPCs' own always-available remove) — factions there are mostly
    // DERIVED (region presence, an Actor's own membership), not a stored
    // list, so "remove" can't mean "take off a list" the way it does for
    // Protagonists/etc. Instead this is a scene-scoped dismiss list: "✕"
    // just hides that faction from THIS scene's view (addSceneDismissedFaction
    // below) without touching whatever real relationship/presence made it
    // appear — "curated convenience, not a restriction," same posture the
    // block's own manual-link case already had. Re-linking a dismissed
    // faction via the "+" picker clears the dismissal (see
    // addSceneDismissedFaction's own call site, shell.js).
    dismissedFactionIds: [],
  };
  scene.text = recomposeSceneText(scene);
  return scene;
}

// Threat/Mystery mood aside for a fresh roll's Opening line — a one-time
// ingredient at generation (see generateScene above), not recomputed on
// every recompose, since Opening is a real, freely-editable field once
// rolled, not re-derived from threat/mystery on every edit.
function pressureLine(threat, mystery) {
  return threat >= 7 ? 'Everything feels exposed, watched, or already too late.'
    : threat >= 4 ? 'There is enough pressure that lingering here has a cost.'
    : mystery >= 6 ? 'The scene feels wrong in a way that invites investigation.'
    : 'For now, there is room to observe before danger closes in.';
}

/** Rebuilds a scene's `text` blob from its CURRENT field values — the same
 *  line-by-line shape generateScene() originally composed, just driven by
 *  whatever the fields hold now instead of a fresh oracle roll. This is
 *  what makes the split Latest Scene fields (ui/workspace/index.js) and the
 *  combined `text` view stay in sync: fields are the source of truth,
 *  `text` is a derived, one-directional view of them (session.js's
 *  updateSceneField calls this after every field edit) — not a second,
 *  independently-editable copy. Pure; safe to call from a UI-driven edit. */
export function recomposeSceneText(scene) {
  const { number, intent, memory: location, threat = 0, mystery = 0, spine = {}, opening, driver, clue, complication, decisionPoint, consequence, situationLine } = scene;
  const { action, theme, descriptor, focus } = spine;

  const lines = [
    `Scene ${number}: ${intent}`,
    ``,
    `Location: ${location}`,
    `Threat ${threat}/10 · Mystery ${mystery}/10`,
    ``,
    `Oracle spine: Action ${action} / Theme ${theme} / Descriptor ${descriptor} / Focus ${focus}`,
    ``,
    `Opening: ${opening}`,
    ``,
    `Driver: ${driver}`,
    `Clue: ${clue}`,
    `Complication: ${complication}`,
    ``,
    `Decision point: ${decisionPoint}`,
    `Likely consequence: ${consequence}`,
  ];
  if (situationLine) { lines.push('', `Current thread: ${situationLine}`); }
  return lines.join('\n');
}

export function generateMissionSeed(campaign, tables, rng = Math.random) {
  const p = (...a) => safePick(tables, rng, ...a);
  return [
    'Mission Seed',
    '',
    `Mission: ${p('Missions', 'Mission Type')}`,
    `Patron: ${p('Missions', 'Patron')}`,
    `Complication: ${p('Missions', 'Twist')}`,
    `Opposition: ${p('Factions', 'Faction Type')} trying to ${p('Factions', 'Project')}`,
    `Reward: ${p('Missions', 'Reward')}`,
  ].filter((l) => !/: null$/.test(l)).join('\n');
}

export function generateWorldSeed(campaign, tables, rng = Math.random) {
  const p = (...a) => safePick(tables, rng, ...a);
  return [
    'World / Colony Seed',
    '',
    `Planetary Class: ${p('Planets', 'Planetary Class')}`,
    `Planet Trait: ${p('Planets', 'Planet Traits')}`,
    `Settlement: ${p('Settlements', 'Settlement Type')}`,
    `Authority: ${p('Settlements', 'Authority')}`,
    `Dominant Faction: ${p('Factions', 'Faction Type')}`,
    `Planetside Peril: ${p('Planets', 'Planetside Peril')}`,
  ].filter((l) => !/: null$/.test(l)).join('\n');
}

// --- Scene-scoped NPC state (docs/adr/0041 Phase 13b) ----------------------
// A scene's own npcStates/bystanderIds, added above generateScene(). Every
// mutator here is defensive about older scenes (created before this
// shipped) missing either field entirely — same "derive on read, no
// migration needed" posture every other lazy-backfilled field in this app
// already uses.

/** Oracle table path for each of a scene NPC's rollable fields —
 *  session.js's rollNpcSceneField/editNpcSceneField read this to know
 *  which table a field rolls from / writes an edit back to. `currentGoal`
 *  is deliberately NOT here — it's the already-existing, permanent
 *  `npc.currentGoal` entity field (entities.js), reused as-is rather than
 *  reinvented as scene-scoped state. */
export const NPC_SCENE_FIELD_ORACLE_PATH = {
  disposition: ['Characters', 'Disposition'],
  motivation: ['Characters', 'Want'],
  threatRank: ['Characters', 'Threat Rank'],
  challenges: ['Characters', 'Complication'],
  opportunities: ['Characters', 'Opportunity'],
};

function emptySceneNpcField() { return { value: '', sourcePath: null, sourceIndex: null }; }

function defaultNpcSceneState() {
  const s = {};
  for (const field of Object.keys(NPC_SCENE_FIELD_ORACLE_PATH)) s[field] = emptySceneNpcField();
  return s;
}

/** Read-only: an NPC's current scene state, or the all-blank default shape
 *  if they have none yet — never mutates `scene`. UI rendering should
 *  always go through this rather than reading `scene.npcStates[id]`
 *  directly, so a not-yet-touched NPC still renders blank fields instead
 *  of throwing. */
export function getNpcSceneState(scene, npcId) {
  return (scene.npcStates && scene.npcStates[npcId]) || defaultNpcSceneState();
}

/** Mutating: ensures `scene.npcStates[npcId]` exists and returns it —
 *  session.js's roll/edit functions use this (never the read-only getter
 *  above) since they need a real object to write into. Exported so
 *  session.js doesn't have to duplicate the default-shape/backfill logic. */
export function ensureNpcSceneState(scene, npcId) {
  if (!scene.npcStates || typeof scene.npcStates !== 'object') scene.npcStates = {};
  if (!scene.npcStates[npcId]) scene.npcStates[npcId] = defaultNpcSceneState();
  return scene.npcStates[npcId];
}

/** WHO's three Actor lists (docs/adr/0041 Phase 13b, redesigned per direct
 *  request) — Protagonists/Antagonists/Bystanders are all equally GM-
 *  curated id lists on the scene now (previously Protagonists/Antagonists
 *  were derived by parsing WHO's free-text Focus field, since removed —
 *  every Actor is now explicitly picked via WHO's own "+" entity picker
 *  instead). One shared implementation keyed by list name; each kind gets
 *  its own named export pair so call sites (shell.js) stay explicit about
 *  which list they're touching. Plain id lists, deduped; add is a no-op if
 *  already present. */
const ACTOR_LIST_KEY = { protagonist: 'protagonistIds', antagonist: 'antagonistIds', bystander: 'bystanderIds' };

function addSceneActor(campaign, sceneId, kind, npcId) {
  const next = clone(campaign);
  const scene = (next.scenes || []).find((s) => s.id === sceneId);
  const key = ACTOR_LIST_KEY[kind];
  if (!scene || !npcId || !key) return next;
  if (!Array.isArray(scene[key])) scene[key] = [];
  if (!scene[key].includes(npcId)) scene[key].push(npcId);
  return next;
}

function removeSceneActor(campaign, sceneId, kind, npcId) {
  const next = clone(campaign);
  const scene = (next.scenes || []).find((s) => s.id === sceneId);
  const key = ACTOR_LIST_KEY[kind];
  if (!scene || !key || !Array.isArray(scene[key])) return next;
  scene[key] = scene[key].filter((id) => id !== npcId);
  return next;
}

export function addSceneProtagonist(campaign, sceneId, npcId) { return addSceneActor(campaign, sceneId, 'protagonist', npcId); }
export function removeSceneProtagonist(campaign, sceneId, npcId) { return removeSceneActor(campaign, sceneId, 'protagonist', npcId); }
export function addSceneAntagonist(campaign, sceneId, npcId) { return addSceneActor(campaign, sceneId, 'antagonist', npcId); }
export function removeSceneAntagonist(campaign, sceneId, npcId) { return removeSceneActor(campaign, sceneId, 'antagonist', npcId); }
export function addSceneBystander(campaign, sceneId, npcId) { return addSceneActor(campaign, sceneId, 'bystander', npcId); }
export function removeSceneBystander(campaign, sceneId, npcId) { return removeSceneActor(campaign, sceneId, 'bystander', npcId); }

/** "Assets present" (direct follow-up request) — a #asset-TYPE entity
 *  list, same add/dedupe/remove shape as the three Actor lists above but
 *  deliberately its own pair rather than a fourth ACTOR_LIST_KEY entry —
 *  Assets never move between groups (moveSceneActor/drag-and-drop is an
 *  Actor-only concept). */
export function addSceneAsset(campaign, sceneId, assetId) {
  const next = clone(campaign);
  const scene = (next.scenes || []).find((s) => s.id === sceneId);
  if (!scene || !assetId) return next;
  if (!Array.isArray(scene.assetIds)) scene.assetIds = [];
  if (!scene.assetIds.includes(assetId)) scene.assetIds.push(assetId);
  return next;
}
export function removeSceneAsset(campaign, sceneId, assetId) {
  const next = clone(campaign);
  const scene = (next.scenes || []).find((s) => s.id === sceneId);
  if (!scene || !Array.isArray(scene.assetIds)) return next;
  scene.assetIds = scene.assetIds.filter((id) => id !== assetId);
  return next;
}

/** WHERE's curated Location list (direct follow-up request, replacing
 *  Focus-text @mention scanning as "the current location(s)" source of
 *  truth) — the "Location details" section (workspace/index.js), NOT the
 *  System row above it (see setSceneSystem below for that). Enforces "ONE
 *  entity of each type" (direct follow-up request — "the scene takes
 *  place in just one district, etc."): if the entity being added shares
 *  ANY tag with an entity already in the list, that existing entry is
 *  swapped out for the new one instead of accumulating a second of the
 *  same type — an untagged entity, or one whose tags don't overlap
 *  anything already present, is simply added alongside. Tag-driven, not a
 *  hardcoded type enum, so it works for #district/#site/whatever the GM's
 *  own tag vocabulary happens to be. */
export function addSceneLocation(campaign, sceneId, locationId) {
  const next = clone(campaign);
  const scene = (next.scenes || []).find((s) => s.id === sceneId);
  if (!scene || !locationId) return next;
  if (!Array.isArray(scene.locationIds)) scene.locationIds = [];
  if (scene.locationIds.includes(locationId)) return next;
  const incoming = getEntity(next, locationId);
  const incomingTags = new Set((incoming && incoming.tags) || []);
  if (incomingTags.size) {
    scene.locationIds = scene.locationIds.filter((id) => {
      const existingTags = (getEntity(next, id) || {}).tags || [];
      return !existingTags.some((t) => incomingTags.has(t));
    });
  }
  scene.locationIds.push(locationId);
  return next;
}
export function removeSceneLocation(campaign, sceneId, locationId) {
  const next = clone(campaign);
  const scene = (next.scenes || []).find((s) => s.id === sceneId);
  if (!scene || !Array.isArray(scene.locationIds)) return next;
  scene.locationIds = scene.locationIds.filter((id) => id !== locationId);
  return next;
}

/** WHERE's System row (direct follow-up request — a dedicated pick-or-
 *  create button instead of only a manual Relationships edit): System
 *  stays a pure relationship-graph read (getSystemForLocation, entities.js
 *  — "just use the Relationships for setting the choice"), this just makes
 *  SETTING it up nicer. `scene.locationIds[0]` (the "anchor," same primary
 *  Location Details already uses for Colony-Base/District) is either: (a)
 *  absent — no scene location exists yet, so the picked System becomes the
 *  anchor directly (it self-resolves as its own System via the #system
 *  tag, no relationship needed); (b) itself #system-tagged — a previous
 *  pick under case (a) standing in as the anchor — swapped out for the new
 *  pick the same way, never linked to itself; or (c) a real Location
 *  details entry (a site/district) — gets a `located_at` edge to the
 *  picked System, replacing any prior one so there's only ever one parent,
 *  matching getContainingLocation's own "at most one" assumption. */
export function setSceneSystem(campaign, sceneId, systemId) {
  let next = clone(campaign);
  const scene = (next.scenes || []).find((s) => s.id === sceneId);
  if (!scene || !systemId || !getEntity(next, systemId)) return next;
  if (!Array.isArray(scene.locationIds)) scene.locationIds = [];
  const anchorId = scene.locationIds[0] || null;
  if (anchorId === systemId) return next;
  const anchor = anchorId ? getEntity(next, anchorId) : null;
  if (!anchor || (anchor.tags || []).includes('system')) {
    scene.locationIds = scene.locationIds.filter((id) => id !== anchorId);
    scene.locationIds.unshift(systemId);
    return next;
  }
  const existingParent = (anchor.relationships || []).find((r) => r.type === 'located_at');
  if (existingParent && existingParent.to === systemId) return next;
  if (existingParent) next = removeRelationship(next, anchorId, existingParent.to);
  next = addRelationship(next, anchorId, systemId, 'System', 'located_at');
  return next;
}

/** WHO's "Factions active nearby" ✕ (direct follow-up request) — hides one
 *  faction from THIS scene's view without touching whatever real presence
 *  (region, an Actor's membership, a manual located_at edge) made it
 *  appear in the first place; see generateScene's dismissedFactionIds
 *  field comment above. */
export function addSceneDismissedFaction(campaign, sceneId, factionId) {
  const next = clone(campaign);
  const scene = (next.scenes || []).find((s) => s.id === sceneId);
  if (!scene || !factionId) return next;
  if (!Array.isArray(scene.dismissedFactionIds)) scene.dismissedFactionIds = [];
  if (!scene.dismissedFactionIds.includes(factionId)) scene.dismissedFactionIds.push(factionId);
  return next;
}
/** Clears a dismissal — called when the "+" picker manually (re-)links a
 *  previously-dismissed faction, so a deliberate re-add isn't immediately
 *  hidden again by a stale dismissal. */
export function removeSceneDismissedFaction(campaign, sceneId, factionId) {
  const next = clone(campaign);
  const scene = (next.scenes || []).find((s) => s.id === sceneId);
  if (!scene || !Array.isArray(scene.dismissedFactionIds)) return next;
  scene.dismissedFactionIds = scene.dismissedFactionIds.filter((id) => id !== factionId);
  return next;
}

/** Dragging a thumbnail from one Actor group to another (WHO redesign
 *  follow-up, direct request) — removes from `fromKind`'s list and adds to
 *  `toKind`'s in one pass (a real move, not remove-then-add as two separate
 *  store.update calls, so it can't land half-applied). No-op if `fromKind`
 *  and `toKind` are the same (dropping a thumbnail back on its own group)
 *  or either kind is unrecognized; deduped the same as addSceneActor if the
 *  npc is somehow already on the destination list. */
export function moveSceneActor(campaign, sceneId, fromKind, toKind, npcId) {
  const next = clone(campaign);
  const scene = (next.scenes || []).find((s) => s.id === sceneId);
  const fromKey = ACTOR_LIST_KEY[fromKind];
  const toKey = ACTOR_LIST_KEY[toKind];
  if (!scene || !npcId || !fromKey || !toKey || fromKind === toKind) return next;
  if (Array.isArray(scene[fromKey])) scene[fromKey] = scene[fromKey].filter((id) => id !== npcId);
  if (!Array.isArray(scene[toKey])) scene[toKey] = [];
  if (!scene[toKey].includes(npcId)) scene[toKey].push(npcId);
  return next;
}
