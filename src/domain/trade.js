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
import { ECONOMY_TYPES } from '../data/economyTypes.js';
import { getEntity } from './entities.js';
import { addThread, listThreads } from './threads.js';
import { tablesWithOverrides, pick } from './oracles.js';

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

/** A 0.6x-1.4x price multiplier from a Location's tagged economy type, or
 *  exactly 1 (no change) if the Location carries no recognized economy-type
 *  tag — additive to the existing supply/demand dials, never a replacement.
 *  Raw commodities price off `scarcity` (scarce locally = pricier);
 *  manufactured commodities price off the inverse of `manufacturing` (weak
 *  local fabrication = pricier) — two dials instead of a literal tech
 *  level, per docs/adr/0013. */
export function economyBiasAt(location, commodityId) {
  const c = findCommodity(commodityId);
  const et = economyTypeForLocation(location);
  if (!c || !et) return 1;
  const dial = c.category === 'manufactured' ? (10 - et.manufacturing) : et.scarcity;
  return 0.6 + (Math.max(0, Math.min(10, dial)) / 10) * 0.8;
}

/** basePrice * demandFactor / supplyFactor * economyBias — pure and
 *  stateless. The supply/demand dials are 0-100 around a neutral midpoint
 *  of 50; each maps onto a 0.5x-1.5x multiplier, so a fresh market (50/50)
 *  with no tagged economy type prices at exactly basePrice. High demand or
 *  low supply raises the price; low demand or high supply lowers it — never
 *  below 1 (a price of 0 would make a commodity worthless to trade, which
 *  isn't a state this model needs). */
export function priceAt(location, commodityId) {
  const c = findCommodity(commodityId);
  if (!c || !location) return 0;
  const { supply, demand } = getMarket(location)[commodityId];
  const demandFactor = 0.5 + demand / 100;
  const supplyFactor = 0.5 + supply / 100;
  const bias = economyBiasAt(location, commodityId);
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
export function createContract(campaign, { name = '', type = '', patronId = '', originId = '', destinationId = '', payout = 0, segments = 4 } = {}) {
  const next = addThread(campaign, name || type || 'New contract', segments);
  const t = next.threads[next.threads.length - 1];
  Object.assign(t, {
    kind: 'contract',
    type: type || '',
    patronId: patronId || '',
    originId: originId || '',
    destinationId: destinationId || '',
    payout: Math.max(0, Math.round(Number(payout)) || 0),
  });
  const patron = patronId && getEntity(next, patronId);
  const origin = originId && getEntity(next, originId);
  const destination = destinationId && getEntity(next, destinationId);
  const details = [
    type && `Type: ${type}`,
    patron && `Patron: ${patron.name || 'Unnamed'}`,
    (origin || destination) && `Route: ${origin ? (origin.name || 'Unnamed') : '?'} → ${destination ? (destination.name || 'Unnamed') : '?'}`,
    `Payout: ${t.payout}`,
  ].filter(Boolean).join(' · ');
  addJournalEntry(next, `New contract: ${t.name}${details ? ' — ' + details : ''}`, 'Trade');
  return { campaign: next, id: t.id };
}

/** Patch a contract's trade-specific fields (type/patron/route/payout) —
 *  its clock/status/priority still go through threads.js's own mutators,
 *  since a contract's progress clock IS an ordinary Thread's. No-op on an
 *  id that isn't actually a contract. */
export function updateContract(campaign, id, patch = {}) {
  const next = clone(campaign);
  const t = (next.threads || []).find((x) => x.id === id);
  if (!t || t.kind !== 'contract') return next;
  if (patch.type !== undefined) t.type = patch.type;
  if (patch.patronId !== undefined) t.patronId = patch.patronId;
  if (patch.originId !== undefined) t.originId = patch.originId;
  if (patch.destinationId !== undefined) t.destinationId = patch.destinationId;
  if (patch.payout !== undefined) t.payout = Math.max(0, Math.round(Number(patch.payout)) || 0);
  return next;
}

/** If both origin and destination resolve to real Locations, price a
 *  commodity at each and pay out ten times the gap between them — a real
 *  price delta (buy low, sell high) turned into a contract's stakes,
 *  instead of a flat, hand-tuned number (ADR 0003's "reward is framed as
 *  the price delta... not a flat margin"). Falls back to a modest flat
 *  default when no route is picked yet (a GM can still roll a contract's
 *  type before deciding where it goes, and edit the payout once they do). */
function estimatePayout(campaign, originId, destinationId, commodityId) {
  const origin = getEntity(campaign, originId);
  const destination = getEntity(campaign, destinationId);
  const commodity = findCommodity(commodityId);
  if (origin && destination && origin.type === 'location' && destination.type === 'location' && commodity) {
    const delta = Math.abs(priceAt(destination, commodity.id) - priceAt(origin, commodity.id));
    return Math.max(20, delta * 10);
  }
  return 50;
}

/** Roll the "Contract Type" oracle table (Trade & Cargo group, ADR 0004's
 *  15-type taxonomy) and create a contract from the result in one action —
 *  the "Generate Contract" button, mirroring how generateNpc() rolls the
 *  Characters oracle chain into a new NPC. Pure/RNG-injectable like every
 *  other roll here; only tests pass a seeded rng. */
export function generateContract(campaign, { rng = Math.random, patronId = '', originId = '', destinationId = '', commodityId = '', segments = 4 } = {}) {
  const next = clone(campaign);
  const tables = tablesWithOverrides(next.oracles?.overrides, next.settings?.genrePack);
  const typeTable = (tables && tables['Trade & Cargo'] && tables['Trade & Cargo']['Contract Type']) || [];
  const type = typeTable.length ? pick(typeTable, rng) : 'Courier';
  const payout = estimatePayout(next, originId, destinationId, commodityId);
  return createContract(next, { name: `${type} contract`, type, patronId, originId, destinationId, payout, segments });
}
