// trade.js — Merchant Rules Lens (ADR 0003, refined by ADR 0004): a
// contract-driven trade minigame built on top of a per-Location commodity
// pricing engine, not a second product. Two things share this module
// because ADR 0004 makes the second the primary loop and the first its
// engine:
//
//   1. Pricing: a Location entity gains an optional `market` — a per-
//      commodity {supply, demand} dial pair (0-100, GM-set, not a live
//      simulation) — and priceAt() turns that into a live price. buy()/
//      sell() move goods into/out of a party-wide cargo manifest and nudge
//      the local market's supply dial the direction a real transaction
//      would, so two Locations' prices are never forced to agree — that
//      divergence is the entire "plan a purchase and transport" loop.
//   2. Contracts: "a contract is a Thread with a few extra fields," not a
//      new state machine — see createContract/generateContract below. This
//      reuses domain/threads.js's clock, 7-state lifecycle, and Co-Pilot
//      surfacing entirely; the thread mutators there (advanceThread,
//      setThreadStatus, setThreadPriority, removeThread) already work on a
//      contract unchanged, since it lives in the same campaign.threads
//      array as any other thread and only carries a few extra optional
//      properties (kind: 'contract', type, patronId, originId,
//      destinationId, payout).
//
// Pure, DOM-free, clone-and-return — same shape as every other domain
// module (colony.js/party.js's ensure() pattern, threads.js's clock).

import { COMMODITIES, findCommodity } from '../data/commodities.js';
import { ECONOMY_TYPES, findEconomyType } from '../data/economyTypes.js';
import { findBiome } from '../data/biomes.js';
import { getEntity } from './entities.js';
import { addThread, listThreads } from './threads.js';
import { tablesWithOverrides, pick } from './oracles.js';
import { gatherSceneContext } from './copilot.js';
import { QUEST_REWARD_RULES, DEFAULT_QUEST_REWARD, VOW_RANKS, VOW_PROGRESS_BOXES } from '../data/questRewards.js';
import { QUEST_BRIEFS } from '../data/questOracles.js';
import { findGenrePack } from '../data/genrePacks.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

function ensureTrade(campaign) {
  if (!campaign.trade || typeof campaign.trade !== 'object') campaign.trade = { manifest: [] };
  if (!Array.isArray(campaign.trade.manifest)) campaign.trade.manifest = [];
  return campaign.trade;
}

const clampDial = (n) => Math.max(0, Math.min(100, Number(n) || 0));

function ensureMarketDial(location, commodityId) {
  if (!location.market || typeof location.market !== 'object') location.market = {};
  if (!location.market[commodityId]) location.market[commodityId] = { supply: 50, demand: 50 };
  return location.market[commodityId];
}

/** A Location's market, read-only and fully populated — every known
 *  commodity defaults to a neutral 50/50 dial (a fresh market has no
 *  reason to already read as scarce or oversupplied) whether or not it's
 *  been touched yet, same "undefined means the neutral default" posture as
 *  the Narrative Trackers and a statblock field's rollMethod. */
export function getMarket(location) {
  const stored = (location && location.market) || {};
  const out = {};
  for (const c of COMMODITIES) {
    const d = stored[c.id] || {};
    out[c.id] = { supply: clampDial(d.supply ?? 50), demand: clampDial(d.demand ?? 50) };
  }
  return out;
}

/** GM-set market dial (supply or demand, 0-100) for one commodity at one
 *  Location. No-op on an unknown location/commodity/field. */
export function setMarketDial(campaign, locationId, commodityId, field, value) {
  const next = clone(campaign);
  const loc = getEntity(next, locationId);
  if (!loc || loc.type !== 'location' || !findCommodity(commodityId) || (field !== 'supply' && field !== 'demand')) return next;
  const dial = ensureMarketDial(loc, commodityId);
  dial[field] = clampDial(value);
  return next;
}

/** The economy type a Location's tags name, if any — checked against BOTH
 *  models regardless of which is currently active (docs/adr/0013), so
 *  switching settings.tradeEconomyModel never orphans a tag a GM already
 *  set on an existing Location. A plain tag match (case-insensitive), not
 *  a separate structured field — Locations already have a freeform tag
 *  system (entities.js); this reuses it rather than adding a new one. */
function economyTypeForLocation(location) {
  const tags = new Set((location && location.tags || []).map((t) => t.toLowerCase()));
  return ECONOMY_TYPES.find((t) => tags.has(t.label.toLowerCase())) || null;
}

// Shared by economyBiasAt/developmentLevelBiasAt and biomeBiasAt below —
// the same "0-10 scarcity dial -> a 0.6x-1.4x price multiplier" mapping,
// just fed from two different dial sources (docs/adr/0025).
function biasFromDial(dial) {
  return 0.6 + (Math.max(0, Math.min(10, dial)) / 10) * 0.8;
}

/** A 0.6x-1.4x price multiplier from a Location's tagged economy type, or
 *  exactly 1 (no change) if the Location carries no recognized economy-type
 *  tag — additive to the existing supply/demand dials, never a replacement.
 *  Raw commodities price off `scarcity` (scarce locally = pricier);
 *  manufactured commodities price off the inverse of `manufacturing` (weak
 *  local fabrication = pricier) — two dials instead of a literal tech
 *  level, per docs/adr/0013. Kept exactly as it was (still exported, still
 *  the tag-scan path) — developmentLevelBiasAt below wraps it as a
 *  fallback rather than replacing it, so a Location tagged before ADR 0025
 *  added a real `developmentLevel` field keeps pricing unchanged. */
export function economyBiasAt(location, commodityId) {
  const c = findCommodity(commodityId);
  const et = economyTypeForLocation(location);
  if (!c || !et) return 1;
  const dial = c.category === 'manufactured' ? (10 - et.manufacturing) : et.scarcity;
  return biasFromDial(dial);
}

/** Development level bias (docs/adr/0025-location-biome-trade.md) —
 *  prefers a Location's real `developmentLevel` field if set (a GM-picked
 *  dropdown now, entities.js's ensureLocationFields), falling back to the
 *  pre-existing tag-scan (economyTypeForLocation, same as economyBiasAt
 *  above) when it isn't. This is what priceAt() actually calls now;
 *  economyBiasAt stays as the narrower tag-only piece this wraps. */
export function developmentLevelBiasAt(location, commodityId) {
  const c = findCommodity(commodityId);
  const et = (location && location.developmentLevel && findEconomyType(location.developmentLevel)) || economyTypeForLocation(location);
  if (!c || !et) return 1;
  const dial = c.category === 'manufactured' ? (10 - et.manufacturing) : et.scarcity;
  return biasFromDial(dial);
}

/** A second, independent 0.6x-1.4x price multiplier from a Location's
 *  biome (data/biomes.js) — compounds with developmentLevelBiasAt rather
 *  than replacing it: development level answers "how built-up is this
 *  place," biome answers "what does the environment itself have plenty or
 *  little of." Reads the commodity's finer `resourceType` (water/fuel/
 *  food/ore/tech/luxury), not the coarser raw/manufactured `category`
 *  developmentLevelBiasAt uses, so the two can genuinely diverge on the
 *  same commodity (a Waterworld prices Water cheap regardless of whether
 *  it's also tagged/set Industrial). Exactly 1 (no change) if the
 *  Location has no biome set or the commodity has no resourceType. */
export function biomeBiasAt(location, commodityId) {
  const c = findCommodity(commodityId);
  const biome = location && location.biome && findBiome(location.biome);
  if (!c || !biome || !c.resourceType) return 1;
  const dial = biome.resourceScarcity[c.resourceType];
  if (dial === undefined) return 1;
  return biasFromDial(dial);
}

/** basePrice * demandFactor / supplyFactor * developmentLevelBias *
 *  biomeBias — pure and stateless. The supply/demand dials are 0-100
 *  around a neutral midpoint of 50; each maps onto a 0.5x-1.5x multiplier,
 *  so a fresh market (50/50) with neither bias set prices at exactly
 *  basePrice. High demand or low supply raises the price; low demand or
 *  high supply lowers it — never below 1 (a price of 0 would make a
 *  commodity worthless to trade, which isn't a state this model needs). */
export function priceAt(location, commodityId) {
  const c = findCommodity(commodityId);
  if (!c || !location) return 0;
  const { supply, demand } = getMarket(location)[commodityId];
  const demandFactor = 0.5 + demand / 100;
  const supplyFactor = 0.5 + supply / 100;
  const bias = developmentLevelBiasAt(location, commodityId) * biomeBiasAt(location, commodityId);
  return Math.max(1, Math.round((c.basePrice * demandFactor * bias) / supplyFactor));
}

/** The party's shared cargo manifest — {commodityId, qty} rows. Not tied
 *  to any one Vehicle/Asset entity (a party may have several transports);
 *  cargo CAPACITY, by contrast, lives on the Vehicle Stats statblock kind
 *  as an ordinary field (see data/statblockTemplates.js), not here. */
export function listCargoManifest(campaign) {
  return (campaign.trade && campaign.trade.manifest) || [];
}

/** Buy `qty` of a commodity at a Location: adds it to the party's cargo
 *  manifest and drains that Location's supply dial by the same amount
 *  (buying scarce goods scarcer raises the NEXT price there) — the
 *  mechanic that keeps two Locations' prices from ever settling into
 *  agreement. No-op if the location/commodity don't resolve. */
export function buyCommodity(campaign, locationId, commodityId, qty = 1) {
  const next = clone(campaign);
  const loc = getEntity(next, locationId);
  if (!loc || loc.type !== 'location' || !findCommodity(commodityId)) return next;
  const amount = Math.max(1, Math.round(Number(qty)) || 1);
  const dial = ensureMarketDial(loc, commodityId);
  dial.supply = clampDial(dial.supply - amount);
  const trade = ensureTrade(next);
  const row = trade.manifest.find((m) => m.commodityId === commodityId);
  if (row) row.qty += amount; else trade.manifest.push({ commodityId, qty: amount });
  return next;
}

/** Sell up to `qty` of a commodity (clamped to what the party actually
 *  has) at a Location: removes it from the manifest and floods that
 *  Location's supply dial by the same amount (lowering the next price
 *  there). No-op if the location/commodity don't resolve, or the party
 *  isn't carrying any of that commodity at all. */
export function sellCommodity(campaign, locationId, commodityId, qty = 1) {
  const next = clone(campaign);
  const loc = getEntity(next, locationId);
  if (!loc || loc.type !== 'location' || !findCommodity(commodityId)) return next;
  const trade = ensureTrade(next);
  const row = trade.manifest.find((m) => m.commodityId === commodityId);
  const have = row ? row.qty : 0;
  if (have <= 0) return next;
  const amount = Math.max(1, Math.min(have, Math.round(Number(qty)) || 1));
  row.qty -= amount;
  if (row.qty <= 0) trade.manifest = trade.manifest.filter((m) => m.commodityId !== commodityId);
  const dial = ensureMarketDial(loc, commodityId);
  dial.supply = clampDial(dial.supply + amount);
  return next;
}

/** Every open (and closed) contract — Threads carrying `kind: 'contract'`.
 *  Ordinary Threads (kind unset) are excluded, so the Trade drawer's
 *  contract board doesn't also list every unrelated WHY-question thread. */
export function listContracts(campaign) {
  return listThreads(campaign).filter((t) => t.kind === 'contract');
}

function addJournalEntry(campaign, text, source) {
  if (!Array.isArray(campaign.journal)) campaign.journal = [];
  campaign.journal.push({
    id: 'j' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    createdAt: new Date().toISOString(),
    source: source || 'Trade',
    text,
    isHtml: false,
  });
}

/** A contract is a Thread with a few extra reference fields (ADR 0004) —
 *  patronId/originId/destinationId point at existing NPC/Location entities
 *  ("reference by id, don't duplicate stats," the same pattern colony.js's
 *  crew roster already uses) and are all optional, since a GM may roll a
 *  contract's type before deciding who's offering it or where it goes.
 *  Delegates the actual clock/lifecycle creation to addThread — a contract
 *  gets the exact same 7-state lifecycle, priority dial, and Co-Pilot
 *  surfacing as any other thread, then this just patches the trade-specific
 *  fields onto the thread addThread just pushed (always the last one).
 *  Also logs a Journal entry (type/patron/route/payout, resolved to entity
 *  names where set) the same way generateNpc()/rollOracle() already record
 *  what they created — a contract is exactly the kind of session event a
 *  returning GM should see in "Previously on..." without having to dig
 *  through the Trade drawer's contract board to reconstruct it. */
export function createContract(campaign, { name = '', type = '', patronId = '', originId = '', destinationId = '', payout = 0, payoutUnit = '', segments = 4, description = '', conflict = '', opportunity = '' } = {}) {
  const next = addThread(campaign, name || type || 'New contract', segments);
  const t = next.threads[next.threads.length - 1];
  Object.assign(t, {
    kind: 'contract',
    type: type || '',
    patronId: patronId || '',
    originId: originId || '',
    destinationId: destinationId || '',
    payout: Math.max(0, Math.round(Number(payout)) || 0),
    // The payout's currency/reward unit ('credits', 'gold marks', 'Cr',
    // 'gp', 'XP'…) — set by generateContract from the stat ruleset; blank
    // for a hand-made contract or a trade-route payout.
    payoutUnit: payoutUnit || '',
    // Free-text flavor fields (UX batch) — same "opt-in, no roll-up
    // mechanic" posture as Faction's HQ/Leadership/Agenda: what the job
    // actually is, what's working against the party, and what upside
    // exists beyond the flat payout.
    description: description || '',
    conflict: conflict || '',
    opportunity: opportunity || '',
  });
  const patron = patronId && getEntity(next, patronId);
  const origin = originId && getEntity(next, originId);
  const destination = destinationId && getEntity(next, destinationId);
  const details = [
    type && `Type: ${type}`,
    patron && `Patron: ${patron.name || 'Unnamed'}`,
    (origin || destination) && `Route: ${origin ? (origin.name || 'Unnamed') : '?'} → ${destination ? (destination.name || 'Unnamed') : '?'}`,
    `Payout: ${t.payout}${t.payoutUnit ? ' ' + t.payoutUnit : ''}`,
  ].filter(Boolean).join(' · ');
  addJournalEntry(next, `New contract: ${t.name}${details ? ' — ' + details : ''}`, 'Trade');
  return { campaign: next, id: t.id };
}

/** Patch a contract's trade-specific fields (type/patron/route/payout/
 *  description/conflict/opportunity) — its clock/status/priority still
 *  go through threads.js's own mutators, since a contract's progress
 *  clock IS an ordinary Thread's. No-op on an id that isn't actually a
 *  contract. */
export function updateContract(campaign, id, patch = {}) {
  const next = clone(campaign);
  const t = (next.threads || []).find((x) => x.id === id);
  if (!t || t.kind !== 'contract') return next;
  if (patch.type !== undefined) t.type = patch.type;
  if (patch.patronId !== undefined) t.patronId = patch.patronId;
  if (patch.originId !== undefined) t.originId = patch.originId;
  if (patch.destinationId !== undefined) t.destinationId = patch.destinationId;
  if (patch.payout !== undefined) t.payout = Math.max(0, Math.round(Number(patch.payout)) || 0);
  if (patch.payoutUnit !== undefined) t.payoutUnit = String(patch.payoutUnit || '');
  if (patch.description !== undefined) t.description = patch.description;
  if (patch.conflict !== undefined) t.conflict = patch.conflict;
  if (patch.opportunity !== undefined) t.opportunity = patch.opportunity;
  return next;
}

/** If both origin and destination resolve to real Locations, price a
 *  commodity at each and pay out ten times the gap between them — a real
 *  price delta (buy low, sell high) turned into a contract's stakes,
 *  instead of a flat, hand-tuned number (ADR 0003's "reward is framed as
 *  the price delta... not a flat margin"). Null when there's no priced
 *  route yet — generateContract then uses the game system's own reward
 *  (rollQuestReward) instead. */
function estimateRoutePayout(campaign, originId, destinationId, commodityId) {
  const origin = getEntity(campaign, originId);
  const destination = getEntity(campaign, destinationId);
  const commodity = findCommodity(commodityId);
  if (origin && destination && origin.type === 'location' && destination.type === 'location' && commodity) {
    const delta = Math.abs(priceAt(destination, commodity.id) - priceAt(origin, commodity.id));
    return Math.max(20, delta * 10);
  }
  return null;
}

/** A generated quest's reward and progress clock, in the stat ruleset's
 *  own terms (data/questRewards.js): a few credits for Five Parsecs, gold
 *  marks for Five Leagues, thousands of Cr for Traveller, a gp purse for
 *  D&D 5e — or, for Starforged/Ironsworn, a sworn vow of a rolled rank
 *  whose reward is that rank's experience on a 10-box progress track.
 *  Returns {payout, unit, segments, rank} (rank is null except for a vow). */
export function rollQuestReward(statRuleset, rng = Math.random) {
  const rule = QUEST_REWARD_RULES[statRuleset] || DEFAULT_QUEST_REWARD;
  if (rule.vow) {
    const rank = pick(VOW_RANKS, rng);
    return { payout: rank.xp, unit: 'XP', segments: VOW_PROGRESS_BOXES, rank };
  }
  let total = 0;
  if (rule.dice) for (let i = 0; i < rule.dice.count; i++) total += 1 + Math.floor(rng() * rule.dice.sides);
  return { payout: total * (rule.multiplier || 1) + (rule.bonus || 0), unit: rule.unit || '', segments: rule.segments || 4, rank: null };
}

function capitalizeFirst(s) {
  const text = String(s || '');
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

/** A generated quest's Description, Conflict and Opportunity: an oracle roll
 *  for each, tied to what's actually in play via copilot.js's
 *  gatherSceneContext — the current location, a present faction or bystander
 *  as patron (when the caller didn't pick one), scene antagonists, a rival
 *  faction, a Conflict here, open threads/foreshadowing, and any dial far
 *  enough from its default to matter. An empty scene just reads as the
 *  rolls. Returns {patronId, description, conflict, opportunity}. */
function seedQuestFields(campaign, { job, opposition, benefit, reward, patronId, rng }) {
  const ctx = gatherSceneContext(campaign);
  const scenes = campaign.scenes || [];
  const scene = scenes[scenes.length - 1] || {};
  const sentences = (parts) => parts.filter(Boolean).map((p) => String(p).replace(/[.\s]+$/, '')).join('. ') + '.';
  const named = (list) => list.filter((e) => e && e.name);
  const sceneActors = (ids) => named((ids || []).map((id) => getEntity(campaign, id)));
  const pickOne = (list) => (list.length ? pick(list, rng) : null);

  const factions = named(ctx.factionsHere);
  const patron = patronId
    ? getEntity(campaign, patronId)
    : pickOne([...factions, ...sceneActors(scene.bystanderIds)]);
  const patronName = patron && patron.name;
  const where = (named(ctx.whereLocations)[0] || {}).name;

  let description = capitalizeFirst(job);
  if (patronName) description = `${patronName}${where ? ` at ${where}` : ''} hires the party to ${job}`;
  else if (where) description = `Word at ${where}: someone is needed to ${job}`;

  const foe = pickOne(sceneActors(scene.antagonistIds));
  const rival = pickOne(factions.filter((f) => !patron || f.id !== patron.id));
  const clash = pickOne(named(ctx.conflictsHere));
  const conflict = sentences([
    foe && `${foe.name} is already in the way`,
    rival && `${rival.name} has its own stake in the outcome`,
    capitalizeFirst(opposition),
    clash && `This runs straight into ${clash.name}`,
    ctx.threat >= 7 && 'Danger here is already high, so trouble comes early',
  ]);

  const lead = benefit ? `${patronName || 'The patron'} ${benefit}` : capitalizeFirst(reward);
  const lines = [
    ...named(ctx.openThreads).map((t) => `It could also move "${t.name}" forward`),
    ...ctx.foreshadowing.filter((f) => f.text).map((f) => `It's a chance to pay off: ${f.text}`),
  ];
  const opportunity = sentences([
    lead,
    pickOne(lines),
    ctx.resources <= 3 && 'The pay would ease the party\'s short supplies',
    ctx.reputation <= 3 && 'A clean finish would mend the party\'s standing',
  ]);

  return { patronId: patron ? patron.id : '', description: sentences([description]), conflict, opportunity };
}

/** Generates a whole quest/contract in one action — the 🎲 Generate button
 *  (Navigator's Quests/Contracts, and the Trade/Party copies of the same
 *  section). Type comes from Quests > Quest Type (falling back to Trade &
 *  Cargo > Contract Type); Description, Conflict and Opportunity are seeded
 *  from the oracles and the current scene (seedQuestFields), the job itself
 *  matching the Type via QUEST_BRIEFS. The reward and clock follow the stat
 *  ruleset (rollQuestReward), unless a priced trade route is given.
 *  genrePack/statRuleset default to the campaign's own settings; a caller
 *  inside store.update() (which hands over the raw doc, without the Rules
 *  Profile's overlay) passes store.get()'s instead. Pure/RNG-injectable like
 *  every other roll here; only tests pass a seeded rng. */
export function generateContract(campaign, { rng = Math.random, patronId = '', originId = '', destinationId = '', commodityId = '', segments, genrePack, statRuleset } = {}) {
  const next = clone(campaign);
  const settings = next.settings || {};
  genrePack = genrePack || settings.genrePack;
  statRuleset = statRuleset || settings.statRuleset;
  const tables = tablesWithOverrides(next.oracles?.overrides, genrePack) || {};
  const roll = (...paths) => {
    for (const [cat, name] of paths) {
      const t = tables[cat] && tables[cat][name];
      if (Array.isArray(t) && t.length) return String(pick(t, rng));
    }
    return '';
  };
  const type = roll(['Quests', 'Quest Type'], ['Trade & Cargo', 'Contract Type']) || 'Courier';
  const brief = (QUEST_BRIEFS[findGenrePack(genrePack).id] || {})[type];
  const seeded = seedQuestFields(next, {
    job: brief || roll(['Missions', 'Mission Type']),
    opposition: roll(['Quests', 'Opposition'], ['Adventure', 'Complication'], ['Miscellaneous', 'Story Complication']),
    benefit: roll(['Missions', 'Patron Benefit']),
    reward: roll(['Missions', 'Reward']),
    patronId, rng,
  });
  const reward = rollQuestReward(statRuleset, rng);
  const routePayout = estimateRoutePayout(next, originId, destinationId, commodityId);
  const noun = genrePack === 'fantasy' || genrePack === 'dnd5e' ? 'quest' : 'contract';
  const name = reward.rank ? `${reward.rank.label} ${type} vow` : `${type} ${noun}`;
  return createContract(next, {
    name, type, originId, destinationId, ...seeded,
    payout: routePayout != null ? routePayout : reward.payout,
    payoutUnit: routePayout != null ? '' : reward.unit,
    segments: segments != null ? segments : reward.segments,
  });
}
