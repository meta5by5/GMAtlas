// factionTurnEngine.js — the SWN Faction Turn Engine (docs/adr/0031-swn-
// faction-turn-engine.md). Pure, DOM-free, RNG-injectable, clone-and-
// return-new-campaign — same discipline as every other domain module.
// Builds a second, deeper layer on top of domain/factions.js's existing
// small Force/Cunning/Wealth mini-game (kept, untouched): real HP/
// FacCreds/XP, a homeworld + Bases of Influence, structured purchasable
// assets transcribed from data/swnFactionData.js, SWN Faction Tags, and a
// current Goal tracked as a Thread (domain/threads.js, `kind:'faction-
// goal'`, mirroring domain/factions.js's own Pressure Track pattern).
//
// Propose-then-confirm (Article II: the GM always retains creative
// authority): proposeFactionTurn()/advanceFactionTurnRound() compute a
// full DRAFT — goal check, action choice, targets, every die roll — against
// a scratch clone of the campaign and return it for review, never
// mutating the real campaign. A draft carries its own fully-resolved
// `resultCampaign` (the scratch clone with the action already applied) so
// commitFactionTurn() is a trivial, deterministic "what you reviewed is
// exactly what lands" — no separate replay step that could re-roll dice.
// A full round chains each faction's proposal against the previous
// faction's resultCampaign (so faction 2's draft already reflects faction
// 1's proposed changes) — by design this makes a round's drafts an
// all-or-nothing batch for this pass: "Commit All" applies the chain,
// there's no partial per-faction accept once a round has been proposed.
// Re-run advanceFactionTurnRound to get a fresh batch instead.
//
// Scope, called out explicitly (see the ADR for the full rationale):
// - Seize Planet is a single-turn HP-pool check against total unstealthed
//   rival HP at a location, continued via `seizeProgress` across turns —
//   not the book's full multi-turn siege bookkeeping per specific asset.
// - Change Homeworld always takes exactly one turn to transit — the
//   book's "+1 turn per hex of distance" isn't modeled, since most
//   Locations in a non-Hostile genre pack carry no hex coordinate at all.
// - Use Asset Ability mechanically resolves the ~5 simple dice-for-
//   FacCreds abilities (data/swnFactionData.js's SWN_AUTOMATIC_ASSET_
//   ABILITIES); every other asset's special text is surfaced for the GM
//   to adjudicate and type an outcome for, matching SWN's own stated
//   philosophy that the system "is not meant to be a standalone game
//   that doesn't require GM involvement."
// - Expand Influence's "any rival may free-Attack the new Base" contest
//   is resolved as a flat 1d6 hit against the new Base (not a specific
//   chosen rival asset) for whichever rivals beat the roll — a
//   deliberately simple stand-in for a full targeted counter-attack.

import { getEntity, updateEntity, listEntities, addRelationship } from './entities.js';
import { listThreads, addThread, advanceThread, removeThread } from './threads.js';
import {
  SWN_FACTION_ASSETS, SWN_FACTION_TAGS, SWN_FACTION_GOALS, SWN_BASE_OF_INFLUENCE,
  SWN_ASSET_MAINTENANCE, SWN_AUTOMATIC_ASSET_ABILITIES, findSwnAssetAnyStat, findSwnGoal,
} from '../data/swnFactionData.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

// --- dice --------------------------------------------------------------
function rollD10(rng) { return Math.floor(rng() * 10) + 1; }

/** Parses a transcribed dice expression ("2d6+4", "1d4-1", "special", null)
 *  into a rolled total. "special"/null/unparseable expressions roll 0 —
 *  the caller surfaces the raw text for the GM instead (see
 *  useAssetAbility). */
function rollDiceExpr(expr, rng) {
  if (!expr || expr === 'special') return { total: 0, rolls: [], expr: expr || '' };
  const m = String(expr).match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!m) return { total: 0, rolls: [], expr };
  const count = Number(m[1]); const sides = Number(m[2]); const mod = m[3] ? Number(m[3]) : 0;
  const rolls = Array.from({ length: count }, () => Math.floor(rng() * sides) + 1);
  return { total: Math.max(0, rolls.reduce((a, b) => a + b, 0) + mod), rolls, expr };
}

function assetMaintenanceCost(catalogId) { return SWN_ASSET_MAINTENANCE[catalogId] || 0; }

function makeEvent({ turnNumber, factionId, factionName, action, targets = [], rollsSummary = '', outcome = 'info', narrative }) {
  return {
    id: 'fev_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    turnNumber, createdAt: new Date().toISOString(),
    factionId, factionName, action, targets, rollsSummary, outcome, narrative,
  };
}

function pushLog(campaign, event) {
  if (!Array.isArray(campaign.factionLog)) campaign.factionLog = [];
  campaign.factionLog.push(event);
}

// --- goal tracking (reuses Threads, mirrors factions.js's Pressure Track) --

export function getFactionGoalTrack(campaign, factionId) {
  return listThreads(campaign).find((t) => t.kind === 'faction-goal' && t.factionId === factionId) || null;
}

/** Creates (or replaces a stale) goal-progress Thread for a faction's
 *  current goal. No-op if the faction/goal is missing or the track
 *  already tracks this exact goal. Thread `segments` = the goal's
 *  computed difficulty (clamped 2-12 by addThread itself — a difficulty-1
 *  goal reads as a 2-segment clock, the same clamp every other Thread in
 *  this app already accepts). */
export function ensureFactionGoalTrack(campaign, factionId, goalId) {
  const faction = getEntity(campaign, factionId);
  const goal = findSwnGoal(goalId);
  if (!faction || !goal) return clone(campaign);
  const existing = getFactionGoalTrack(campaign, factionId);
  if (existing && existing.goalId === goalId) return clone(campaign);
  let next = clone(campaign);
  if (existing) next = removeThread(next, existing.id);
  const difficulty = Math.max(1, Math.round(typeof goal.difficulty === 'function' ? goal.difficulty(faction) : goal.difficulty));
  next = addThread(next, `${faction.name || 'Faction'} — ${goal.name}`, difficulty);
  const t = next.threads[next.threads.length - 1];
  t.kind = 'faction-goal';
  t.factionId = factionId;
  t.goalId = goalId;
  return next;
}

/** Applies whichever delta matches the faction's CURRENT goal's countable
 *  criteria (data/swnFactionData.js's `goal.countable`), and — if that
 *  completes the track — awards XP equal to the goal's difficulty and
 *  clears currentGoalId so a new one can be picked next turn. No-op if
 *  the faction has no active goal/track, or the delta doesn't match. */
export function advanceGoalProgress(campaign, factionId, delta = {}) {
  let next = clone(campaign);
  const faction = getEntity(next, factionId);
  if (!faction || !faction.currentGoalId) return next;
  const goal = findSwnGoal(faction.currentGoalId);
  const track = getFactionGoalTrack(next, factionId);
  if (!goal || !track) return next;
  const c = goal.countable || {};
  let amount = 0;
  if (c.statTypeDestroyed && delta.statTypeDestroyed === c.statTypeDestroyed) amount += delta.count || 1;
  if (c.hpDamageDealt && delta.hpDamageDealt) amount += delta.hpDamageDealt;
  if (c.facCredsSpent && delta.facCredsSpent) amount += delta.facCredsSpent;
  if (c.expandInfluence && delta.expandInfluence) amount += 1;
  if (c.seizePlanet && delta.seizePlanet) amount += 1;
  if (c.destroyRivalFaction && delta.destroyRivalFaction) amount += goal.difficulty();
  if (!amount) return next;
  next = advanceThread(next, track.id, amount);
  const updated = getFactionGoalTrack(next, factionId);
  if (updated && updated.done) {
    const f = getEntity(next, factionId);
    next = updateEntity(next, factionId, { xp: (f.xp || 0) + updated.segments, currentGoalId: '' });
  }
  return next;
}

/** Factions whose current goal is >=75% complete and not yet resolved —
 *  mirrors domain/factions.js's factionsUnderPressure exactly, for
 *  copilot.js's advise(). */
export function factionsWithGoalNearCompletion(campaign) {
  return listThreads(campaign)
    .filter((t) => t.kind === 'faction-goal' && !t.done && t.status !== 'resolved' && t.status !== 'archived' && t.filled / t.segments >= 0.75)
    .map((t) => ({ ...t, faction: getEntity(campaign, t.factionId) }))
    .filter((t) => t.faction);
}

// --- turn bookkeeping ----------------------------------------------------

export function startTurnRound(campaign) {
  const next = clone(campaign);
  next.factionTurnNumber = (next.factionTurnNumber || 0) + 1;
  return next;
}

function initiativeOrder(factionIds, rng) {
  const n = Math.max(1, factionIds.length);
  const die = Math.floor(rng() * n);
  return factionIds.slice(die).concat(factionIds.slice(0, die));
}

/** FacCred income + asset maintenance for one faction's turn — half Wealth
 *  (rounded up) plus a quarter of Force+Cunning (rounded down), per SWN.
 *  Maintenance is the sum of each active asset's per-turn cost
 *  (data/swnFactionData.js's SWN_ASSET_MAINTENANCE) plus a 1-FacCred
 *  surcharge for every asset held past a stat's rating cap. If the
 *  faction can't cover total maintenance, every asset actually costing
 *  upkeep gets `missedMaintenance` bumped; two consecutive misses loses
 *  the asset (checked here, applied by the caller). */
export function payFactionUpkeep(campaign, factionId) {
  let next = clone(campaign);
  const f = getEntity(next, factionId);
  if (!f || f.type !== 'faction') return { campaign: next, income: 0, maintenance: 0, lostAssetIds: [] };
  const income = Math.ceil((f.wealth || 0) / 2) + Math.floor(((f.force || 0) + (f.cunning || 0)) / 4);
  const active = (f.factionAssets || []).filter((a) => a.status === 'active');
  let maintenance = 0;
  for (const a of active) maintenance += assetMaintenanceCost(a.catalogId);
  for (const statType of ['force', 'cunning', 'wealth']) {
    const count = active.filter((a) => a.statType === statType).length;
    const rating = f[statType] || 0;
    if (count > rating) maintenance += (count - rating);
  }
  const balance = (f.facCreds || 0) + income;
  const lostAssetIds = [];
  let facCreds = balance;
  if (balance < maintenance) {
    facCreds = 0; // every FacCred goes to partial upkeep; the shortfall is a missed turn
    for (const a of active) {
      if (assetMaintenanceCost(a.catalogId) > 0) {
        a.missedMaintenance = (a.missedMaintenance || 0) + 1;
        if (a.missedMaintenance >= 2) lostAssetIds.push(a.id);
      }
    }
  } else {
    facCreds = balance - maintenance;
    for (const a of active) a.missedMaintenance = 0;
  }
  if (lostAssetIds.length) f.factionAssets = f.factionAssets.filter((a) => !lostAssetIds.includes(a.id));
  f.facCreds = facCreds;
  // Assets bought last turn (status 'assembling') come online now.
  for (const a of f.factionAssets) if (a.status === 'assembling') a.status = 'active';
  return { campaign: next, income, maintenance, lostAssetIds };
}

export function pickGoalIfNone(campaign, factionId, { rng = Math.random } = {}) {
  let next = clone(campaign);
  const f = getEntity(next, factionId);
  if (!f || f.type !== 'faction' || f.currentGoalId) return next;
  const goal = SWN_FACTION_GOALS[Math.floor(rng() * SWN_FACTION_GOALS.length)];
  next = updateEntity(next, factionId, { currentGoalId: goal.id });
  next = ensureFactionGoalTrack(next, factionId, goal.id);
  return next;
}

// --- helpers ---------------------------------------------------------------

function activeAsset(faction, factionAssetId) {
  return (faction.factionAssets || []).find((a) => a.id === factionAssetId) || null;
}

function catalogFor(factionAsset) {
  return factionAsset ? findSwnAssetAnyStat(factionAsset.catalogId) : null;
}

function locationsOf(faction) {
  const set = new Set();
  if (faction.homeworldId) set.add(faction.homeworldId);
  for (const b of faction.basesOfInfluence || []) set.add(b.locationId);
  return set;
}

function rivalAssetsAt(campaign, factionId, locationId) {
  const out = [];
  for (const f of listEntities(campaign, 'faction')) {
    if (f.id === factionId) continue;
    for (const a of f.factionAssets || []) {
      if (a.locationId === locationId && a.status === 'active' && !a.stealthed) out.push({ faction: f, asset: a });
    }
  }
  return out;
}

// --- actions -----------------------------------------------------------

/** Buy one asset from the catalog on the faction's homeworld or a world
 *  with one of its own Bases of Influence. Requires a sufficient stat
 *  rating and (loosely) a sufficient location tech level — this app's
 *  Location.techLevel is free text (docs/adr/0026), so the check is
 *  advisory only when a numeric techLevel is actually present. The new
 *  asset is 'assembling' (usable from next turn's upkeep pass). */
export function buyAsset(campaign, { factionId, statType, catalogId, locationId, turnNumber } = {}) {
  const next = clone(campaign);
  const f = getEntity(next, factionId);
  const catalog = (SWN_FACTION_ASSETS[statType] || []).find((a) => a.id === catalogId);
  const validLocation = f && (f.homeworldId === locationId || (f.basesOfInfluence || []).some((b) => b.locationId === locationId));
  if (!f || f.type !== 'faction' || !catalog || !validLocation || (f[statType] || 0) < catalog.rating || (f.facCreds || 0) < catalog.cost) {
    return { campaign: next, event: makeEvent({ turnNumber, factionId, factionName: f && f.name, action: 'buyAsset', outcome: 'failure', narrative: `Could not buy ${catalog ? catalog.name : catalogId} — insufficient rating, FacCreds, or an invalid location.` }) };
  }
  f.facCreds -= catalog.cost;
  const id = 'fa_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  f.factionAssets.push({ id, catalogId, statType, locationId, hp: catalog.hp, stealthed: false, status: 'assembling', missedMaintenance: 0 });
  const event = makeEvent({ turnNumber, factionId, factionName: f.name, action: 'buyAsset', targets: [{ locationId }], outcome: 'success', narrative: `${f.name} purchases ${catalog.name} (${statType} ${catalog.rating}) for ${catalog.cost} FacCred(s).` });
  return { campaign: next, event, factionAssetId: id };
}

/** Sell an asset for half its catalog cost (rounded down). */
export function sellAsset(campaign, { factionId, factionAssetId, turnNumber } = {}) {
  const next = clone(campaign);
  const f = getEntity(next, factionId);
  const asset = f && activeAsset(f, factionAssetId);
  const catalog = catalogFor(asset);
  if (!f || f.type !== 'faction' || !asset || !catalog) {
    return { campaign: next, event: makeEvent({ turnNumber, factionId, factionName: f && f.name, action: 'sellAsset', outcome: 'failure', narrative: 'No such asset to sell.' }) };
  }
  const refund = Math.floor(catalog.cost / 2);
  f.facCreds = (f.facCreds || 0) + refund;
  f.factionAssets = f.factionAssets.filter((a) => a.id !== factionAssetId);
  const event = makeEvent({ turnNumber, factionId, factionName: f.name, action: 'sellAsset', outcome: 'success', narrative: `${f.name} sells ${catalog.name} for ${refund} FacCred(s).` });
  return { campaign: next, event };
}

/** Repair a damaged asset (heal = faction's rating in the asset's own
 *  stat per "increment," cost = 1+2+3+...+increments FacCreds) or, with
 *  no `factionAssetId`, heal the faction itself by the rounded average of
 *  its highest and lowest stat (flat 1 FacCred, per SWN). */
export function repairAssetOrFaction(campaign, { factionId, factionAssetId = null, increments = 1, turnNumber } = {}) {
  const next = clone(campaign);
  const f = getEntity(next, factionId);
  if (!f || f.type !== 'faction') return { campaign: next, event: makeEvent({ turnNumber, factionId, action: 'repairAssetOrFaction', outcome: 'failure', narrative: 'No such faction.' }) };
  if (factionAssetId) {
    const asset = activeAsset(f, factionAssetId);
    const catalog = catalogFor(asset);
    if (!asset || !catalog) return { campaign: next, event: makeEvent({ turnNumber, factionId, factionName: f.name, action: 'repairAssetOrFaction', outcome: 'failure', narrative: 'No such asset to repair.' }) };
    const n = Math.max(1, increments | 0);
    const cost = (n * (n + 1)) / 2;
    if ((f.facCreds || 0) < cost) return { campaign: next, event: makeEvent({ turnNumber, factionId, factionName: f.name, action: 'repairAssetOrFaction', outcome: 'failure', narrative: `Not enough FacCreds to repair ${catalog.name}.` }) };
    f.facCreds -= cost;
    const healPer = f[asset.statType] || 1;
    asset.hp = Math.min(catalog.hp, asset.hp + healPer * n);
    const event = makeEvent({ turnNumber, factionId, factionName: f.name, action: 'repairAssetOrFaction', outcome: 'success', narrative: `${f.name} repairs ${catalog.name} for ${healPer * n} HP (${cost} FacCred(s)).` });
    return { campaign: next, event };
  }
  if ((f.facCreds || 0) < 1) return { campaign: next, event: makeEvent({ turnNumber, factionId, factionName: f.name, action: 'repairAssetOrFaction', outcome: 'failure', narrative: 'Not enough FacCreds to repair.' }) };
  f.facCreds -= 1;
  const stats = [f.force || 0, f.cunning || 0, f.wealth || 0];
  const heal = Math.round((Math.max(...stats) + Math.min(...stats)) / 2);
  const maxHp = computeMaxHp(f);
  f.hp = Math.min(maxHp, (f.hp || 0) + heal);
  const event = makeEvent({ turnNumber, factionId, factionName: f.name, action: 'repairAssetOrFaction', outcome: 'success', narrative: `${f.name} recovers ${heal} HP.` });
  return { campaign: next, event };
}

function computeMaxHp(f) {
  // Mirrors entities.js's computeFactionMaxHp without importing it (that
  // module imports data only, this avoids a domain<->domain cross-import
  // cycle risk) — same SWN_XP_TABLE-backed formula.
  const table = { 1: 1, 2: 2, 3: 4, 4: 6, 5: 9, 6: 12, 7: 16, 8: 20 };
  const hpFor = (v) => table[Math.max(1, Math.min(8, Math.round(Number(v) || 0)))] || 1;
  return 4 + hpFor(f.force) + hpFor(f.cunning) + hpFor(f.wealth);
}

/** Swap one asset for another catalog entry of the same stat track,
 *  paying the difference if the new one costs more. Refitted asset goes
 *  'assembling' again. */
export function refitAsset(campaign, { factionId, factionAssetId, newCatalogId, turnNumber } = {}) {
  const next = clone(campaign);
  const f = getEntity(next, factionId);
  const asset = f && activeAsset(f, factionAssetId);
  const oldCatalog = catalogFor(asset);
  const newCatalog = asset && (SWN_FACTION_ASSETS[asset.statType] || []).find((a) => a.id === newCatalogId);
  if (!f || f.type !== 'faction' || !asset || !oldCatalog || !newCatalog) {
    return { campaign: next, event: makeEvent({ turnNumber, factionId, factionName: f && f.name, action: 'refitAsset', outcome: 'failure', narrative: 'No such asset/refit target.' }) };
  }
  const diff = Math.max(0, newCatalog.cost - oldCatalog.cost);
  if ((f.facCreds || 0) < diff) return { campaign: next, event: makeEvent({ turnNumber, factionId, factionName: f.name, action: 'refitAsset', outcome: 'failure', narrative: `Not enough FacCreds to refit into ${newCatalog.name}.` }) };
  f.facCreds -= diff;
  asset.catalogId = newCatalogId;
  asset.hp = newCatalog.hp;
  asset.status = 'assembling';
  const event = makeEvent({ turnNumber, factionId, factionName: f.name, action: 'refitAsset', outcome: 'success', narrative: `${f.name} refits ${oldCatalog.name} into ${newCatalog.name}.` });
  return { campaign: next, event };
}

/** Plant a Base of Influence at a location where the faction already has
 *  some other asset. Contested by a Cunning check against every rival
 *  with assets there; a rival that beats the roll gets a flat 1d6 hit on
 *  the new Base (a simplified stand-in for a chosen targeted attack —
 *  see the module doc comment). */
export function expandInfluence(campaign, { factionId, locationId, hp, rng = Math.random, turnNumber } = {}) {
  const next = clone(campaign);
  const f = getEntity(next, factionId);
  const maxHp = f ? computeMaxHp(f) : 0;
  const budget = Math.max(1, Math.min(hp | 0 || 1, maxHp));
  if (!f || f.type !== 'faction' || (f.basesOfInfluence || []).some((b) => b.locationId === locationId) || (f.facCreds || 0) < budget) {
    return { campaign: next, event: makeEvent({ turnNumber, factionId, factionName: f && f.name, action: 'expandInfluence', outcome: 'failure', narrative: 'Could not expand influence there — already present, or insufficient FacCreds.' }) };
  }
  f.facCreds -= budget;
  const baseId = 'boi_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const base = { id: baseId, locationId, hp: budget, maxHp: budget };
  f.basesOfInfluence.push(base);
  const rolls = [];
  const own = rollD10(rng) + (f.cunning || 0);
  for (const rival of listEntities(next, 'faction')) {
    if (rival.id === factionId) continue;
    const hasPresence = (rival.factionAssets || []).some((a) => a.locationId === locationId) || rival.homeworldId === locationId;
    if (!hasPresence) continue;
    const rivalRoll = rollD10(rng) + (rival.cunning || 0);
    rolls.push(`${rival.name || 'rival'} ${rivalRoll} vs ${f.name} ${own}`);
    if (rivalRoll >= own) {
      const dmg = rollDiceExpr('1d6', rng).total;
      base.hp = Math.max(0, base.hp - dmg);
      f.hp = Math.max(0, (f.hp || 0) - dmg);
    }
  }
  if (base.hp <= 0) f.basesOfInfluence = f.basesOfInfluence.filter((b) => b.id !== baseId);
  const event = makeEvent({ turnNumber, factionId, factionName: f.name, action: 'expandInfluence', targets: [{ locationId }], rollsSummary: rolls.join('; '), outcome: base.hp > 0 ? 'success' : 'partial', narrative: `${f.name} expands influence to a new world${base.hp > 0 ? '' : ', but the new Base was thrown down before it could take hold'}.` });
  let result = { campaign: next, event };
  result.campaign = advanceGoalProgress(result.campaign, factionId, { expandInfluence: true });
  return result;
}

/** Move to a different homeworld — requires an existing Base of Influence
 *  there. Always a flat one-turn transit (busyUntilTurn), and swaps Base
 *  HP per SWN: the new homeworld's Base is set to the faction's max HP,
 *  the old homeworld's Base takes on whatever HP the new one had. */
export function changeHomeworld(campaign, { factionId, newLocationId, turnNumber } = {}) {
  const next = clone(campaign);
  const f = getEntity(next, factionId);
  const newBase = f && (f.basesOfInfluence || []).find((b) => b.locationId === newLocationId);
  if (!f || f.type !== 'faction' || !newBase) {
    return { campaign: next, event: makeEvent({ turnNumber, factionId, factionName: f && f.name, action: 'changeHomeworld', outcome: 'failure', narrative: 'No Base of Influence at the destination yet — Expand Influence there first.' }) };
  }
  const oldLocationId = f.homeworldId;
  const maxHp = computeMaxHp(f);
  const oldBaseHp = newBase.hp;
  newBase.hp = maxHp;
  if (oldLocationId) {
    let oldBase = f.basesOfInfluence.find((b) => b.locationId === oldLocationId);
    if (!oldBase) { oldBase = { id: 'boi_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), locationId: oldLocationId, hp: 0, maxHp }; f.basesOfInfluence.push(oldBase); }
    oldBase.hp = oldBaseHp;
  }
  f.homeworldId = newLocationId;
  f.busyUntilTurn = (turnNumber || 0) + 1;
  const event = makeEvent({ turnNumber, factionId, factionName: f.name, action: 'changeHomeworld', targets: [{ locationId: newLocationId }], outcome: 'success', narrative: `${f.name} relocates its homeworld — in transit until its next turn.` });
  return { campaign: next, event };
}

/** Single-turn approximation of Seize Planet: tallies total unstealthed
 *  rival HP at the location and reduces it by the attacker's active
 *  assets' expected damage (each asset that beats a flat defense roll of
 *  10 contributes its own attack dice). Continues via `seizeProgress`
 *  next turn if the pool isn't exhausted; on success, adds the location
 *  to `governedLocationIds` (Planetary Government, held per-world). */
export function seizePlanet(campaign, { factionId, locationId, rng = Math.random, turnNumber } = {}) {
  const next = clone(campaign);
  const f = getEntity(next, factionId);
  if (!f || f.type !== 'faction') return { campaign: next, event: makeEvent({ turnNumber, factionId, action: 'seizePlanet', outcome: 'failure', narrative: 'No such faction.' }) };
  const rivals = rivalAssetsAt(next, factionId, locationId);
  let remaining = f.seizeProgress && f.seizeProgress.locationId === locationId
    ? f.seizeProgress.remainingHp
    : rivals.reduce((sum, r) => sum + r.asset.hp, 0);
  if (remaining <= 0) {
    f.governedLocationIds = Array.from(new Set([...(f.governedLocationIds || []), locationId]));
    f.seizeProgress = null;
    const event = makeEvent({ turnNumber, factionId, factionName: f.name, action: 'seizePlanet', targets: [{ locationId }], outcome: 'success', narrative: `${f.name} completes its seizure — no organized resistance remained.` });
    let result = advanceGoalProgress(next, factionId, { seizePlanet: true });
    return { campaign: result, event };
  }
  const attackerAssets = (f.factionAssets || []).filter((a) => a.locationId === locationId && a.status === 'active');
  let dealt = 0; const rolls = [];
  for (const a of attackerAssets) {
    const catalog = catalogFor(a);
    if (!catalog || !catalog.attack) continue;
    const roll = rollD10(rng) + (f[a.statType] || 0);
    if (roll >= 10) { const dmg = rollDiceExpr(catalog.attack.dice, rng).total; dealt += dmg; rolls.push(`${catalog.name} ${roll} → ${dmg} dmg`); }
    else rolls.push(`${catalog.name} ${roll} → no effect`);
  }
  remaining = Math.max(0, remaining - dealt);
  const done = remaining <= 0;
  if (done) { f.governedLocationIds = Array.from(new Set([...(f.governedLocationIds || []), locationId])); f.seizeProgress = null; }
  else f.seizeProgress = { locationId, remainingHp: remaining };
  const event = makeEvent({ turnNumber, factionId, factionName: f.name, action: 'seizePlanet', targets: [{ locationId }], rollsSummary: rolls.join('; '), outcome: done ? 'success' : 'partial', narrative: `${f.name} presses its seizure of the planet — ${dealt} damage dealt, ${remaining} HP of resistance remain.` });
  let result = { campaign: next, event };
  if (done) result.campaign = advanceGoalProgress(result.campaign, factionId, { seizePlanet: true });
  return result;
}

/** Resolve one Attack between two factions' assets at a shared location.
 *  Attacker rolls 1d10 + its own asset's stat rating; defender rolls
 *  1d10 + the rating the attack's Attack line names. Damage on a win
 *  applies the attacker's Attack dice to the defending asset (redirected
 *  to a Base of Influence there if the hit would otherwise destroy the
 *  asset and a Base exists — SWN's own optional redirect, applied
 *  automatically rather than asked of the GM mid-resolution); a loss
 *  applies the defender's Counter dice back to the attacker, if it has
 *  one; a tie applies both. */
export function attack(campaign, { attackerId, attackerFactionAssetId, defenderId, defenderFactionAssetId, rng = Math.random, turnNumber } = {}) {
  const next = clone(campaign);
  const attackerFaction = getEntity(next, attackerId);
  const defenderFaction = getEntity(next, defenderId);
  const attackerAsset = attackerFaction && activeAsset(attackerFaction, attackerFactionAssetId);
  const defenderAsset = defenderFaction && activeAsset(defenderFaction, defenderFactionAssetId);
  const attackerCatalog = catalogFor(attackerAsset);
  const defenderCatalog = catalogFor(defenderAsset);
  if (!attackerFaction || !defenderFaction || !attackerAsset || !defenderAsset || !attackerCatalog || !attackerCatalog.attack) {
    return { campaign: next, event: makeEvent({ turnNumber, factionId: attackerId, factionName: attackerFaction && attackerFaction.name, action: 'attack', outcome: 'failure', narrative: 'Invalid attacker/defender/asset pairing.' }) };
  }
  const attackRoll = rollD10(rng) + (attackerFaction[attackerAsset.statType] || 0);
  const defenderStat = attackerCatalog.attack.vs;
  const defenseRoll = rollD10(rng) + (defenderFaction[defenderStat] || 0);
  const targets = [{ factionId: defenderId, factionName: defenderFaction.name, assetId: defenderFactionAssetId, locationId: defenderAsset.locationId }];
  let outcome; let narrative; let destroyedAssetId = null; let damage = 0;

  if (attackRoll > defenseRoll || attackRoll === defenseRoll) {
    const dmg = rollDiceExpr(attackerCatalog.attack.dice, rng);
    damage = dmg.total;
    const base = (defenderFaction.basesOfInfluence || []).find((b) => b.locationId === defenderAsset.locationId);
    if (base && damage >= defenderAsset.hp) {
      base.hp = Math.max(0, base.hp - damage);
      defenderFaction.hp = Math.max(0, (defenderFaction.hp || 0) - damage);
      if (base.hp <= 0) defenderFaction.basesOfInfluence = defenderFaction.basesOfInfluence.filter((b) => b.id !== base.id);
      narrative = `${attackerFaction.name}'s ${attackerCatalog.name} strikes through to ${defenderFaction.name}'s Base of Influence for ${damage} damage.`;
    } else {
      defenderAsset.hp = Math.max(0, defenderAsset.hp - damage);
      if (defenderAsset.hp <= 0) { destroyedAssetId = defenderAsset.id; defenderFaction.factionAssets = defenderFaction.factionAssets.filter((a) => a.id !== destroyedAssetId); }
      narrative = `${attackerFaction.name}'s ${attackerCatalog.name} hits ${defenderFaction.name}'s ${defenderCatalog ? defenderCatalog.name : 'asset'} for ${damage} damage${destroyedAssetId ? ' — destroyed!' : '.'}`;
    }
    outcome = 'success';
  }
  if (attackRoll < defenseRoll || attackRoll === defenseRoll) {
    if (defenderCatalog && defenderCatalog.counter) {
      const cdmg = rollDiceExpr(defenderCatalog.counter.dice, rng);
      attackerAsset.hp = Math.max(0, attackerAsset.hp - cdmg.total);
      if (attackerAsset.hp <= 0) attackerFaction.factionAssets = attackerFaction.factionAssets.filter((a) => a.id !== attackerFactionAssetId);
      narrative = (narrative ? narrative + ' ' : '') + `${defenderFaction.name}'s ${defenderCatalog.name} counterattacks for ${cdmg.total} damage${attackerAsset.hp <= 0 ? ' — destroyed!' : '.'}`;
    } else if (attackRoll < defenseRoll) {
      narrative = `${attackerFaction.name}'s attack fails to penetrate.`;
    }
    if (attackRoll < defenseRoll) outcome = 'failure';
  }

  const event = makeEvent({ turnNumber, factionId: attackerId, factionName: attackerFaction.name, action: 'attack', targets, rollsSummary: `Attack ${attackRoll} vs Defense ${defenseRoll}`, outcome, narrative });
  let resultCampaign = next;
  if (destroyedAssetId) resultCampaign = advanceGoalProgress(resultCampaign, attackerId, { statTypeDestroyed: defenderAsset.statType, count: 1 });
  if (damage) resultCampaign = advanceGoalProgress(resultCampaign, attackerId, { hpDamageDealt: damage });
  return { campaign: resultCampaign, event };
}

/** Resolve one asset's special ability. The small set of purely numeric,
 *  self-contained abilities (data/swnFactionData.js's
 *  SWN_AUTOMATIC_ASSET_ABILITIES) are rolled and applied here; every
 *  other asset just surfaces its ability text — `needsGmAdjudication:
 *  true` on the returned event tells the review UI to collect a free-text
 *  outcome from the GM before this draft is committed. */
export function useAssetAbility(campaign, { factionId, factionAssetId, rng = Math.random, turnNumber } = {}) {
  const next = clone(campaign);
  const f = getEntity(next, factionId);
  const asset = f && activeAsset(f, factionAssetId);
  const catalog = catalogFor(asset);
  if (!f || f.type !== 'faction' || !asset || !catalog) {
    return { campaign: next, event: makeEvent({ turnNumber, factionId, factionName: f && f.name, action: 'useAssetAbility', outcome: 'failure', narrative: 'No such asset.' }) };
  }
  const auto = SWN_AUTOMATIC_ASSET_ABILITIES[asset.catalogId];
  if (auto) {
    const roll = Math.floor(rng() * Number(auto.roll.match(/\d+$/)[0])) + 1;
    const result = auto.effect(roll);
    if (result.destroyed) { f.factionAssets = f.factionAssets.filter((a) => a.id !== factionAssetId); }
    else if (typeof result.facCreds === 'number') f.facCreds = Math.max(0, (f.facCreds || 0) + result.facCreds);
    const event = makeEvent({ turnNumber, factionId, factionName: f.name, action: 'useAssetAbility', rollsSummary: `${auto.roll} → ${roll}`, outcome: result.destroyed ? 'partial' : 'success', narrative: `${f.name} uses ${catalog.name}'s ability: ${result.destroyed ? 'the asset is lost.' : `${result.facCreds >= 0 ? 'gains' : 'loses'} ${Math.abs(result.facCreds || 0)} FacCred(s).`}` });
    return { campaign: next, event };
  }
  const event = makeEvent({ turnNumber, factionId, factionName: f.name, action: 'useAssetAbility', outcome: 'info', narrative: `${catalog.name}: ${catalog.special || 'No further mechanical text.'}` });
  event.needsGmAdjudication = true;
  return { campaign: next, event };
}

// --- propose / commit -------------------------------------------------

const ACTIONS = { attack, buyAsset, sellAsset, repairAssetOrFaction, refitAsset, expandInfluence, changeHomeworld, seizePlanet, useAssetAbility };

/** Which actions are currently plausible for this faction, given its own
 *  state — feeds the propose heuristic below. Not exhaustive precondition
 *  checking (the action functions themselves still validate/no-op) — just
 *  enough to avoid proposing something obviously impossible. */
function candidateActions(campaign, f) {
  const out = [];
  const activeAssets = (f.factionAssets || []).filter((a) => a.status === 'active');
  const damagedAssets = activeAssets.filter((a) => { const c = catalogFor(a); return c && a.hp < c.hp; });
  const cheapestAffordable = ['force', 'cunning', 'wealth'].some((s) => (SWN_FACTION_ASSETS[s] || []).some((a) => a.rating <= (f[s] || 0) && a.cost <= (f.facCreds || 0)));
  if (f.homeworldId && cheapestAffordable) out.push('buyAsset');
  if (activeAssets.length) out.push('sellAsset');
  if (damagedAssets.length || (f.hp || 0) < computeMaxHp(f)) out.push('repairAssetOrFaction');
  if (activeAssets.length) out.push('refitAsset');
  if (f.homeworldId && (f.facCreds || 0) >= 1) out.push('expandInfluence');
  if ((f.basesOfInfluence || []).length) out.push('changeHomeworld');
  const attackable = activeAssets.some((a) => rivalAssetsAt(campaign, f.id, a.locationId).length > 0);
  if (attackable) out.push('attack');
  if (activeAssets.some((a) => { const c = catalogFor(a); return c && c.hasAction; })) out.push('useAssetAbility');
  const seizeTargetable = activeAssets.some((a) => rivalAssetsAt(campaign, f.id, a.locationId).length > 0);
  if (seizeTargetable) out.push('seizePlanet');
  return out.length ? out : ['useAssetAbility'];
}

/** Weighted pick among plausible actions — favors whatever the faction's
 *  current goal counts toward, then falls back to a flat random choice.
 *  This is a heuristic "AI," not a claim of optimal play — the whole
 *  point of propose-then-confirm is that the GM can reject/regenerate a
 *  batch that doesn't read right. */
function pickActionHeuristic(campaign, f, goalId, rng) {
  const candidates = candidateActions(campaign, f);
  const goal = findSwnGoal(goalId);
  const weights = candidates.map((a) => {
    let w = 1;
    if (goal) {
      const c = goal.countable || {};
      if (a === 'attack' && (c.statTypeDestroyed || c.hpDamageDealt)) w += 3;
      if (a === 'expandInfluence' && c.expandInfluence) w += 3;
      if (a === 'seizePlanet' && c.seizePlanet) w += 3;
      if (a === 'repairAssetOrFaction' && !c.statTypeDestroyed) w += 0; // no bonus, still valid
    }
    return [a, w];
  });
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let roll = rng() * total;
  for (const [a, w] of weights) { if ((roll -= w) <= 0) return a; }
  return weights[0][0];
}

/** Fills in reasonable target/argument choices for a chosen action type —
 *  the "auto-pilot" half of propose-then-confirm. Picks the cheapest
 *  affordable asset to buy, the most damaged asset to repair, the first
 *  valid rival asset on a shared world to attack, etc. Returns args ready
 *  to pass straight to the matching action function. */
function autoArgs(campaign, f, actionType, rng) {
  const activeAssets = (f.factionAssets || []).filter((a) => a.status === 'active');
  switch (actionType) {
    case 'buyAsset': {
      for (const statType of ['force', 'cunning', 'wealth'].sort(() => rng() - 0.5)) {
        const options = (SWN_FACTION_ASSETS[statType] || []).filter((a) => a.rating <= (f[statType] || 0) && a.cost <= (f.facCreds || 0));
        if (options.length) { const pick = options[Math.floor(rng() * options.length)]; return { statType, catalogId: pick.id, locationId: f.homeworldId }; }
      }
      return null;
    }
    case 'sellAsset': { const a = activeAssets[Math.floor(rng() * activeAssets.length)]; return a ? { factionAssetId: a.id } : null; }
    case 'repairAssetOrFaction': {
      const damaged = activeAssets.filter((a) => { const c = catalogFor(a); return c && a.hp < c.hp; });
      if (damaged.length) return { factionAssetId: damaged[0].id, increments: 1 };
      return { factionAssetId: null };
    }
    case 'refitAsset': {
      const a = activeAssets[Math.floor(rng() * activeAssets.length)];
      if (!a) return null;
      const options = (SWN_FACTION_ASSETS[a.statType] || []).filter((o) => o.id !== a.catalogId && o.rating <= (f[a.statType] || 0));
      if (!options.length) return null;
      return { factionAssetId: a.id, newCatalogId: options[Math.floor(rng() * options.length)].id };
    }
    case 'expandInfluence': {
      const known = Array.from(locationsOf(f));
      const candidate = known[Math.floor(rng() * known.length)];
      if (!candidate) return null;
      return { locationId: candidate, hp: Math.min(4, f.facCreds || 1) };
    }
    case 'changeHomeworld': {
      const options = (f.basesOfInfluence || []).filter((b) => b.locationId !== f.homeworldId);
      if (!options.length) return null;
      return { newLocationId: options[Math.floor(rng() * options.length)].locationId };
    }
    case 'attack': {
      for (const a of activeAssets) {
        const rivals = rivalAssetsAt(campaign, f.id, a.locationId);
        if (rivals.length) { const r = rivals[Math.floor(rng() * rivals.length)]; return { attackerFactionAssetId: a.id, defenderId: r.faction.id, defenderFactionAssetId: r.asset.id }; }
      }
      return null;
    }
    case 'seizePlanet': {
      for (const a of activeAssets) {
        const rivals = rivalAssetsAt(campaign, f.id, a.locationId);
        if (rivals.length) return { locationId: a.locationId };
      }
      return null;
    }
    case 'useAssetAbility': {
      const withAbility = activeAssets.filter((a) => { const c = catalogFor(a); return c && c.hasAction; });
      const a = withAbility[Math.floor(rng() * withAbility.length)];
      return a ? { factionAssetId: a.id } : null;
    }
    default: return null;
  }
}

/** Computes one faction's full turn — upkeep, goal-pick-if-none, action
 *  choice+targets+dice — against a SCRATCH clone of `campaign`, returning
 *  a draft `{factionId, factionName, turnNumber, action, event,
 *  resultCampaign}` for review. Nothing is applied to `campaign` itself.
 *  Returns null for a missing/non-faction id, or a faction still `busy`
 *  from a Change Homeworld transit (busyUntilTurn) or with an unresolved
 *  Seize Planet (which takes priority over picking a fresh action). */
export function proposeFactionTurn(campaign, factionId, { rng = Math.random, turnNumber } = {}) {
  const faction = getEntity(campaign, factionId);
  if (!faction || faction.type !== 'faction') return null;
  const tn = turnNumber || (campaign.factionTurnNumber || 0) + 1;
  if (faction.busyUntilTurn && faction.busyUntilTurn > tn) {
    return { factionId, factionName: faction.name, turnNumber: tn, action: 'busy', event: makeEvent({ turnNumber: tn, factionId, factionName: faction.name, action: 'busy', outcome: 'info', narrative: `${faction.name} is still in transit.` }), resultCampaign: clone(campaign) };
  }
  let working = clone(campaign);
  working = payFactionUpkeep(working, factionId).campaign;
  working = pickGoalIfNone(working, factionId, { rng });
  const f = getEntity(working, factionId);

  if (f.seizeProgress) {
    const r = seizePlanet(working, { factionId, locationId: f.seizeProgress.locationId, rng, turnNumber: tn });
    return { factionId, factionName: f.name, turnNumber: tn, action: 'seizePlanet', event: r.event, resultCampaign: r.campaign };
  }

  const actionType = pickActionHeuristic(working, f, f.currentGoalId, rng);
  const args = autoArgs(working, f, actionType, rng);
  if (!args) {
    const event = makeEvent({ turnNumber: tn, factionId, factionName: f.name, action: 'none', outcome: 'info', narrative: `${f.name} has no viable action this turn.` });
    return { factionId, factionName: f.name, turnNumber: tn, action: 'none', event, resultCampaign: working };
  }
  const fn = ACTIONS[actionType];
  const r = fn(working, { factionId, ...args, rng, turnNumber: tn });
  return { factionId, factionName: f.name, turnNumber: tn, action: actionType, event: r.event, resultCampaign: r.campaign };
}

/** A committed draft's resultCampaign already has the event appended to
 *  factionLog (see below) and every effect applied — committing is just
 *  handing that snapshot back. Kept as a named function (rather than
 *  inlining `draft.resultCampaign` at every call site) so the "propose
 *  computes, commit applies" boundary stays explicit in the UI code. */
export function commitFactionTurn(draft) {
  return draft.resultCampaign;
}

// proposeFactionTurn above doesn't push to factionLog itself (it doesn't
// know yet whether the GM will accept it) — this wraps it so the
// returned resultCampaign is commit-ready (factionLog already appended),
// matching the "commit = hand back resultCampaign" contract above.
function proposeAndLog(campaign, factionId, opts) {
  const draft = proposeFactionTurn(campaign, factionId, opts);
  if (!draft) return null;
  pushLog(draft.resultCampaign, draft.event);
  return draft;
}

/** Proposes a full round: bumps factionTurnNumber once, rolls initiative,
 *  and proposes every faction in order, CHAINING each proposal against
 *  the previous faction's resultCampaign so later factions' drafts
 *  already reflect earlier ones in the same batch. Returns the array of
 *  drafts for review — nothing is committed. Per the module doc comment,
 *  a round's drafts are an all-or-nothing batch: commit the LAST draft's
 *  resultCampaign (it already carries every prior draft's effects) via
 *  commitFactionTurn(drafts[drafts.length-1]), or discard the whole
 *  batch and call this again for a fresh one. */
export function advanceFactionTurnRound(campaign, { rng = Math.random } = {}) {
  let working = startTurnRound(campaign);
  const turnNumber = working.factionTurnNumber;
  const factionIds = listEntities(working, 'faction').map((f) => f.id);
  const order = initiativeOrder(factionIds, rng);
  const drafts = [];
  for (const factionId of order) {
    const draft = proposeAndLog(working, factionId, { rng, turnNumber });
    if (!draft) continue;
    drafts.push(draft);
    working = draft.resultCampaign;
  }
  return drafts;
}

/** Step mode: propose (and log) exactly one faction's turn, without
 *  touching the round-wide factionTurnNumber machinery — a lighter-weight
 *  "just resolve this one faction right now" action. Still bumps the
 *  counter by one on commit, so Faction Log entries stay chronologically
 *  ordered regardless of whether they came from a step or a full round. */
export function proposeFactionStep(campaign, factionId, { rng = Math.random } = {}) {
  const turnNumber = (campaign.factionTurnNumber || 0) + 1;
  const draft = proposeAndLog(campaign, factionId, { rng, turnNumber });
  if (draft) draft.resultCampaign.factionTurnNumber = turnNumber;
  return draft;
}
