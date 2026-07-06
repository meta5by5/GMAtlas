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
export const COMMODITIES = [
  { id: 'water', label: 'Water', basePrice: 5, category: 'raw' },
  { id: 'fuel', label: 'Fuel', basePrice: 10, category: 'raw' },
  { id: 'medical-supplies', label: 'Medical Supplies', basePrice: 25, category: 'manufactured' },
  { id: 'weapons', label: 'Weapons', basePrice: 40, category: 'manufactured' },
  { id: 'salvage', label: 'Salvage', basePrice: 15, category: 'raw' },
  { id: 'luxury-goods', label: 'Luxury Goods', basePrice: 60, category: 'manufactured' },
  { id: 'ore', label: 'Ore', basePrice: 12, category: 'raw' },
  { id: 'foodstuffs', label: 'Foodstuffs', basePrice: 8, category: 'raw' },
];

export function findCommodity(id) {
  return COMMODITIES.find((c) => c.id === id) || null;
}
