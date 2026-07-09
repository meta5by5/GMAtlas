// commodities.js — the flat, swappable list of tradeable goods the Merchant
// Rules Lens's pricing engine (domain/trade.js) reads (ADR 0003/0004). Same
// posture as data/tables.js/data/rulesets.js: a genre pack can ship a
// different commodity list without touching domain/trade.js at all — this
// is content, not mechanism.
//
// `basePrice` is an abstract unit (credits, whatever the campaign calls
// money) — domain/trade.js's priceAt() multiplies it by a location's
// supply/demand dials, it never means anything on its own.
//
// `category` (docs/adr/0013-trade-economy-types.md): 'raw' or
// 'manufactured' — which of a Location economy type's two dials
// (scarcity/manufacturing, data/economyTypes.js) prices this commodity
// against, once a GM tags a Location with an economy type. Purely
// additive: a commodity/Location with no economy type involved prices
// exactly as it always has.
//
// `resourceType` (docs/adr/0025-location-biome-trade.md): a finer axis
// than `category` — which of a Location's BIOME dials
// (data/biomes.js's `resourceScarcity`) this commodity prices against.
// Deliberately a second, independent dimension rather than replacing
// `category`: development level and biome are two different questions
// ("how built-up is this place" vs. "what does the environment itself
// have plenty or little of") that should be able to bias the same
// commodity differently and compound, not share one axis.
export const COMMODITIES = [
  { id: 'water', label: 'Water', basePrice: 5, category: 'raw', resourceType: 'water' },
  { id: 'fuel', label: 'Fuel', basePrice: 10, category: 'raw', resourceType: 'fuel' },
  { id: 'medical-supplies', label: 'Medical Supplies', basePrice: 25, category: 'manufactured', resourceType: 'tech' },
  { id: 'weapons', label: 'Weapons', basePrice: 40, category: 'manufactured', resourceType: 'tech' },
  { id: 'salvage', label: 'Salvage', basePrice: 15, category: 'raw', resourceType: 'ore' },
  { id: 'luxury-goods', label: 'Luxury Goods', basePrice: 60, category: 'manufactured', resourceType: 'luxury' },
  { id: 'ore', label: 'Ore', basePrice: 12, category: 'raw', resourceType: 'ore' },
  { id: 'foodstuffs', label: 'Foodstuffs', basePrice: 8, category: 'raw', resourceType: 'food' },
];

export function findCommodity(id) {
  return COMMODITIES.find((c) => c.id === id) || null;
}
