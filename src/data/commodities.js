// commodities.js — the flat, swappable list of tradeable goods the Merchant
// Rules Lens's pricing engine (domain/trade.js) reads (ADR 0003/0004). Same
// posture as data/tables.js/data/rulesets.js: a genre pack can ship a
// different commodity list without touching domain/trade.js at all — this
// is content, not mechanism.
//
// `basePrice` is an abstract unit (credits, whatever the campaign calls
// money) — domain/trade.js's priceAt() multiplies it by a location's
// supply/demand dials, it never means anything on its own.
export const COMMODITIES = [
  { id: 'water', label: 'Water', basePrice: 5 },
  { id: 'fuel', label: 'Fuel', basePrice: 10 },
  { id: 'medical-supplies', label: 'Medical Supplies', basePrice: 25 },
  { id: 'weapons', label: 'Weapons', basePrice: 40 },
  { id: 'salvage', label: 'Salvage', basePrice: 15 },
  { id: 'luxury-goods', label: 'Luxury Goods', basePrice: 60 },
  { id: 'ore', label: 'Ore', basePrice: 12 },
  { id: 'foodstuffs', label: 'Foodstuffs', basePrice: 8 },
];

export function findCommodity(id) {
  return COMMODITIES.find((c) => c.id === id) || null;
}
