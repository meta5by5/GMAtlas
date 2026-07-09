// biomes.js — Location biomes for the Merchant Rules Lens's "smart
// exchange rates" (docs/adr/0025-location-biome-trade.md, extending ADR
// 0013). A GM sets a Location's `biome` field (a real dropdown field now
// — see entities.js's ensureLocationFields — not a tag to guess at) and
// domain/trade.js's biomeBiasAt() reads it to bias prices per commodity
// `resourceType` (data/commodities.js), independent of and compounding
// with the existing development-level bias (data/economyTypes.js):
// development level answers "how built-up is this place," biome answers
// "what does the environment itself have plenty or little of" — a
// Waterworld prices Water cheap regardless of whether it's also tagged
// Industrial, and vice versa.
//
// Same posture as economyTypes.js: `resourceScarcity` dials are 0-10,
// 0 = locally abundant/cheap here, 10 = scarce/expensive here — the exact
// direction convention `scarcity` already uses, so biomeBiasAt can reuse
// economyBiasAt's own `0.6 + (dial/10)*0.8` formula unchanged. Content is
// original per Location entity, not transcribed from any sourcebook, same
// as every other genre-pack table in this app (data/tables.js et al.) —
// `genrePack` keys each entry to one of data/genrePacks.js's three packs,
// mirroring how ECONOMY_TYPES keys each entry to a `model`.
export const BIOMES = [
  // --- hostile (sci-fi, default) ---
  { id: 'waterworld', label: 'Waterworld', genrePack: 'hostile',
    resourceScarcity: { water: 0, fuel: 6, food: 3, ore: 8, tech: 6, luxury: 6 },
    description: 'Oceans or ice caps cover nearly everything — water is free for the taking, but solid ground for mining or heavy industry is scarce.' },
  { id: 'desert', label: 'Desert / Arid', genrePack: 'hostile',
    resourceScarcity: { water: 9, fuel: 4, food: 7, ore: 3, tech: 5, luxury: 6 },
    description: 'Baked rock and dune fields — water is the one thing always in short supply; solar power and open-pit mining are not.' },
  { id: 'ice-arctic', label: 'Ice / Arctic', genrePack: 'hostile',
    resourceScarcity: { water: 2, fuel: 6, food: 8, ore: 5, tech: 6, luxury: 7 },
    description: 'Permafrost and glaciers — melt ice for water easily enough, but growing food and shipping anything else in is the hard part.' },
  { id: 'volcanic', label: 'Volcanic / Geothermal', genrePack: 'hostile',
    resourceScarcity: { water: 6, fuel: 2, food: 8, ore: 3, tech: 6, luxury: 7 },
    description: 'Active tectonics — geothermal power is essentially free, and the same activity keeps mineral veins near the surface; nothing organic grows easily.' },
  { id: 'forest-jungle', label: 'Forest / Jungle Biosphere', genrePack: 'hostile',
    resourceScarcity: { water: 3, fuel: 6, food: 2, ore: 6, tech: 6, luxury: 6 },
    description: 'A living, breathable biosphere — food and water are both close at hand; the same dense biomass makes bulk mining or heavy industry a slog.' },
  { id: 'orbital-station', label: 'Orbital Station / Zero-G', genrePack: 'hostile',
    resourceScarcity: { water: 7, fuel: 4, food: 8, ore: 7, tech: 3, luxury: 4 },
    description: 'Everything organic ships in from elsewhere, but fabrication bays and zero-g manufacturing are the whole point of the place.' },
  { id: 'barren-rock', label: 'Barren / Airless Rock', genrePack: 'hostile',
    resourceScarcity: { water: 9, fuel: 5, food: 9, ore: 2, tech: 6, luxury: 8 },
    description: 'No atmosphere, no biosphere — literally everything except what can be mined out of the rock itself has to be shipped in.' },

  // --- cyberpunk / shadowrun ---
  { id: 'megasprawl', label: 'Megasprawl', genrePack: 'cyberpunk',
    resourceScarcity: { water: 6, fuel: 4, food: 6, ore: 5, tech: 2, luxury: 4 },
    description: 'Endless city — tech and gear move fast and cheap through a dozen black and grey markets; clean water and real food cost more than the chrome does.' },
  { id: 'corporate-arcology', label: 'Corporate Arcology', genrePack: 'cyberpunk',
    resourceScarcity: { water: 2, fuel: 3, food: 2, ore: 6, tech: 1, luxury: 1 },
    description: 'A self-contained corporate tower-city — everything a resident needs is produced or imported on contract, at a price, including the luxuries.' },
  { id: 'undercity', label: 'Undercity / Below the Grid', genrePack: 'cyberpunk',
    resourceScarcity: { water: 7, fuel: 6, food: 7, ore: 4, tech: 5, luxury: 9 },
    description: 'Off the official grid entirely — scavenged ore and salvage are common enough, but reliable utilities and anything legitimate are not.' },
  { id: 'industrial-zone', label: 'Industrial Zone', genrePack: 'cyberpunk',
    resourceScarcity: { water: 5, fuel: 3, food: 6, ore: 3, tech: 3, luxury: 6 },
    description: 'Factories and refineries wall to wall — raw feedstock and manufactured tech both move cheap; nobody grows food here.' },
  { id: 'wastes', label: 'The Wastes (irradiated/toxic fringe)', genrePack: 'cyberpunk',
    resourceScarcity: { water: 8, fuel: 5, food: 9, ore: 4, tech: 7, luxury: 9 },
    description: 'Beyond the edge of the sprawl, where the corps stopped bothering to clean up — scrap is everywhere, everything else has to be carried in.' },
  { id: 'suburbs-sprawl-edge', label: 'Suburbs / Sprawl Edge', genrePack: 'cyberpunk',
    resourceScarcity: { water: 4, fuel: 5, food: 4, ore: 6, tech: 5, luxury: 5 },
    description: 'The quieter ring around a megasprawl core — nothing is scarce, nothing is cheap either; a genuinely average market.' },

  // --- fantasy (D&D-style) ---
  { id: 'deep-forest', label: 'Deep Forest', genrePack: 'fantasy',
    resourceScarcity: { water: 2, fuel: 3, food: 3, ore: 6, tech: 6, luxury: 7 },
    description: 'Game, timber, and fresh water are all close at hand; ore has to be hauled in from outside the treeline.' },
  { id: 'mountains', label: 'Mountains / Highlands', genrePack: 'fantasy',
    resourceScarcity: { water: 4, fuel: 5, food: 7, ore: 1, tech: 5, luxury: 6 },
    description: 'Rich veins run through the rock and the mines run deep, but growing anything at altitude is another matter.' },
  { id: 'coastal', label: 'Coastal / Port', genrePack: 'fantasy',
    resourceScarcity: { water: 1, fuel: 5, food: 3, ore: 6, tech: 4, luxury: 3 },
    description: 'A working harbor — fish and fresh water are never in short supply, and trade ships keep imported luxuries flowing.' },
  { id: 'swamp-marsh', label: 'Swamp / Marshland', genrePack: 'fantasy',
    resourceScarcity: { water: 1, fuel: 6, food: 5, ore: 7, tech: 6, luxury: 8 },
    description: 'Waterlogged and hard to build on — plenty of water, but solid ground for mining or real construction is scarce.' },
  { id: 'plains-farmland', label: 'Plains / Farmland', genrePack: 'fantasy',
    resourceScarcity: { water: 3, fuel: 5, food: 1, ore: 6, tech: 5, luxury: 6 },
    description: 'Open, fertile country under cultivation for miles — grain and livestock are the one thing this place never runs short of.' },
  { id: 'badlands-frontier', label: 'Badlands / Frontier', genrePack: 'fantasy',
    resourceScarcity: { water: 8, fuel: 5, food: 8, ore: 4, tech: 6, luxury: 8 },
    description: 'Rough, thinly-settled country at the edge of the map — everything is harder to come by out here.' },
];

export function findBiome(id) {
  return BIOMES.find((b) => b.id === id) || null;
}

/** Every biome belonging to one genre pack, for a Location's Biome
 *  dropdown or a Settings reference list — mirrors economyTypes.js's
 *  economyTypesForModel() exactly. */
export function biomesForGenrePack(genrePackId) {
  return BIOMES.filter((b) => b.genrePack === genrePackId);
}
