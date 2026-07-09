// hostileUwpTables.js — reference/decode tables for the Universal World
// Profile (UWP) format the HOSTILE Settings sourcebook uses for every
// named world/station in its gazetteer (docs/adr/0026-hostile-canon-
// locations.md). This is Cepheus Engine/Traveller-style hex-digit coding
// (0-9 then A-F for 10-15), transcribed directly from the sourcebook's
// own "World Data" chapter (assets/docs/Hostile setting.pdf, pp.38-49) —
// it's what the book itself uses, not a borrowed system needing an
// ADR-0010-style copyright bridge; Hostile is built on Cepheus Engine and
// names it as such throughout. Same posture as data/economyTypes.js: a
// small, citable reference table, shown read-only in Settings and used to
// populate a Location's World Profile dropdowns (ui/drawers/index.js's
// worldProfileSection). Tech Level is deliberately NOT a full digit table
// here — the sourcebook states human space is uniformly ~TL12, with
// variation expressed through Trade Codes instead — so `techLevel` on a
// Location entity stays a plain free-text field.

export const STARPORT_CLASSES = [
  { code: 'A', label: 'Excellent', description: 'Refined fuel, full shipyard (starships and non-starships), hundreds of berths, a high port in orbit.' },
  { code: 'B', label: 'Good', description: 'Refined fuel, shipyard for non-starships, good maintenance facilities, usually a high port.' },
  { code: 'C', label: 'Routine', description: 'Unrefined fuel, reasonable repairs possible, no shipyard, steady traffic.' },
  { code: 'D', label: 'Poor', description: 'Unrefined fuel only, no repair facilities, a handful of landing pads.' },
  { code: 'E', label: 'Frontier', description: 'No fuel, no repair capacity — a marked landing pad and a navigation beacon at best.' },
  { code: 'X', label: 'None', description: 'No starport and no facilities of any kind.' },
];

export const WORLD_SIZES = [
  { code: '0', label: '800 km (typically an asteroid)', description: 'Negligible surface gravity.' },
  { code: '1', label: '1,600 km', description: 'Surface gravity ~0.05G.' },
  { code: '2', label: '3,200 km', description: 'Surface gravity ~0.15G.' },
  { code: '3', label: '4,800 km', description: 'Surface gravity ~0.25G.' },
  { code: '4', label: '6,400 km', description: 'Surface gravity ~0.35G.' },
  { code: '5', label: '8,000 km', description: 'Surface gravity ~0.45G.' },
  { code: '6', label: '9,600 km', description: 'Surface gravity ~0.7G.' },
  { code: '7', label: '11,200 km', description: 'Surface gravity ~0.9G.' },
  { code: '8', label: '12,800 km', description: 'Surface gravity ~1.0G, Earth-like.' },
  { code: '9', label: '14,400 km', description: 'Surface gravity ~1.2G.' },
  { code: 'A', label: '16,000 km', description: 'Surface gravity ~1.5G.' },
  { code: 'B', label: '17,600 km', description: 'Surface gravity ~1.8G.' },
  { code: 'C', label: '19,200 km', description: 'Surface gravity ~2.0G.' },
  { code: 'D', label: '20,800 km', description: 'Surface gravity ~2.2G.' },
  { code: 'E', label: '22,400 km', description: 'Surface gravity ~2.3G.' },
  { code: 'F', label: '24,000 km', description: 'Surface gravity ~2.5G.' },
  { code: 'G', label: '25,600 km', description: 'Surface gravity ~2.6G.' },
  { code: 'SGG', label: 'Small Gas Giant', description: 'Neptune-scale gas giant.' },
  { code: 'LGG', label: 'Large Gas Giant', description: 'Jupiter-scale gas giant.' },
];

export const ATMOSPHERES = [
  { code: '0', label: 'None', description: 'Vacc suit required.' },
  { code: '1', label: 'Trace', description: 'Vacc suit required.' },
  { code: '2', label: 'Very Thin, Tainted', description: 'Surface mask required.' },
  { code: '3', label: 'Very Thin', description: 'Surface mask required.' },
  { code: '4', label: 'Thin, Tainted', description: '' },
  { code: '5', label: 'Thin', description: '' },
  { code: '6', label: 'Standard', description: '' },
  { code: '7', label: 'Standard, Tainted', description: 'Surface mask required.' },
  { code: '8', label: 'Dense', description: '' },
  { code: '9', label: 'Dense, Tainted', description: 'Surface mask required.' },
  { code: 'A', label: 'Exotic', description: 'Oxygen tanks and mask required.' },
  { code: 'B', label: 'Corrosive', description: 'Vacc suit required.' },
  { code: 'C', label: 'Insidious', description: 'Vacc suit required.' },
];

export const HYDROGRAPHICS = [
  { code: '0', label: '0%-5% (Desert world)', description: '' },
  { code: '1', label: '6%-15% (Dry world)', description: '' },
  { code: '2', label: '16%-25%', description: 'A few small seas.' },
  { code: '3', label: '26%-35%', description: 'Small seas and oceans.' },
  { code: '4', label: '36%-45% (Wet world)', description: '' },
  { code: '5', label: '46%-55%', description: 'Large oceans.' },
  { code: '6', label: '56%-65%', description: 'Large oceans.' },
  { code: '7', label: '66%-75% (Earth-like world)', description: '' },
  { code: '8', label: '76%-85% (Water world)', description: '' },
  { code: '9', label: '86%-95%', description: 'A few small islands and archipelagos.' },
  { code: 'A', label: '96%-100%', description: 'Almost entirely water.' },
];

export const POPULATIONS = [
  { code: '0', label: 'None', description: '0' },
  { code: '1', label: 'Few', description: '10+ (a tiny farmstead or single family)' },
  { code: '2', label: 'Hundreds', description: '100+ (a village)' },
  { code: '3', label: 'Thousands', description: '1,000+' },
  { code: '4', label: 'Tens of thousands', description: '10,000+ (small town)' },
  { code: '5', label: 'Hundreds of thousands', description: '100,000+ (average city)' },
  { code: '6', label: 'Millions', description: '1,000,000+ (large city)' },
  { code: '7', label: 'Tens of millions', description: '10,000,000+ (mega city)' },
  { code: '8', label: 'Hundreds of millions', description: '100,000,000+ (like the USA)' },
  { code: '9', label: 'Billions', description: '1,000,000,000+ (like present-day Earth)' },
  { code: 'A', label: 'Tens of billions', description: '10,000,000,000+' },
];

export const GOVERNMENTS = [
  { code: '0', label: 'None', description: '' },
  { code: '1', label: 'Company/Corporation', description: '' },
  { code: '2', label: 'Participating Democracy', description: '' },
  { code: '3', label: 'Self-Perpetuating Oligarchy', description: '' },
  { code: '4', label: 'Representative Democracy', description: '' },
  { code: '5', label: 'Feudal Technocracy', description: '' },
  { code: '6', label: 'Captive Government', description: '' },
  { code: '7', label: 'Balkanization', description: '' },
  { code: '8', label: 'Civil Service Bureaucracy', description: '' },
  { code: '9', label: 'Impersonal Bureaucracy', description: '' },
  { code: 'A', label: 'Charismatic Dictator', description: '' },
  { code: 'B', label: 'Non-Charismatic Leader', description: '' },
  { code: 'C', label: 'Charismatic Oligarchy', description: '' },
  { code: 'D', label: 'Religious Dictatorship', description: '' },
  { code: 'E', label: 'Religious Autocracy', description: '' },
  { code: 'F', label: 'Totalitarian Oligarchy', description: '' },
];

export const LAW_LEVELS = [
  { code: '0', label: 'No Law', description: 'No restrictions.' },
  { code: '1', label: 'Low Law', description: 'Poison gas, explosives, undetectable weapons, WMDs banned.' },
  { code: '2', label: 'Low Law', description: 'Portable energy weapons banned (except ship-mounted).' },
  { code: '3', label: 'Low Law', description: 'Heavy weapons banned.' },
  { code: '4', label: 'Medium Law', description: 'Light assault weapons and submachine guns banned.' },
  { code: '5', label: 'Medium Law', description: 'Personal concealable weapons banned.' },
  { code: '6', label: 'Medium Law', description: 'All firearms except shotguns/stunners banned; carrying weapons discouraged.' },
  { code: '7', label: 'High Law', description: 'Shotguns banned.' },
  { code: '8', label: 'High Law', description: 'All bladed weapons and stunners banned.' },
  { code: '9', label: 'High Law', description: 'Any weapon outside one’s residence banned.' },
  { code: 'A', label: 'Extreme Law', description: 'Any weapons at all banned.' },
];

// The presence of a government/military/mining-authority base, noted on
// the UWP after Tech Level.
export const BASES = [
  { code: 'USSC', label: 'United States Space Command', description: 'US military base.' },
  { code: 'JASDF', label: 'Japan Aerospace Defence Force', description: 'Japanese military base.' },
  { code: 'DRW', label: 'Deutsche Raumwaffe', description: 'German (Franco-German) military base.' },
  { code: 'MRA', label: 'Mining Regulatory Agency', description: 'Mining authority presence/base.' },
];

// Trade Codes glossary — broad economic labels derived from a world's UWP,
// telling a GM what's cheap/scarce there and how it fits the interstellar
// economy. A Location's `tradeCodes` field stores whichever of these
// `code`s apply (often several at once).
export const TRADE_CODES = [
  { code: 'agricultural', label: 'Agricultural', description: 'Produces a huge food surplus shipped out through the starport.' },
  { code: 'asteroid', label: 'Asteroid', description: 'Often a mining colony (ores/crystals); some are prisons, retreats or factories instead.' },
  { code: 'desert', label: 'Desert', description: 'Survival-first economy; water is the top resource, drilled or shipped in.' },
  { code: 'fluid-oceans', label: 'Fluid Oceans', description: 'Oceans of non-water liquid (methane, ethanol); petrochemical fuels exported.' },
  { code: 'garden', label: 'Garden', description: 'Almost Earth-like — temperate, wide oceans, fertile soils, diverse biosphere.' },
  { code: 'ice-capped', label: 'Ice-Capped', description: 'Liquid water oceans beneath an icy crust.' },
  { code: 'industrial', label: 'Industrial', description: 'Unbreathable atmosphere; a massive exporter of manufactured goods, needing raw material imports.' },
  { code: 'non-agricultural', label: 'Non-Agricultural', description: 'Cannot feed itself; imports food and textiles.' },
  { code: 'non-industrial', label: 'Non-Industrial', description: 'Too few people to support manufacturing; imports factory-made goods.' },
  { code: 'poor', label: 'Poor', description: 'A backwater with thin atmosphere and little water; economy struggles.' },
  { code: 'rich', label: 'Rich', description: 'A luxurious, self-sustaining world that still relies heavily on imports.' },
  { code: 'water-world', label: 'Water World', description: 'Aquaculture, fishing, seabed mining and oil drilling.' },
  { code: 'vacuum', label: 'Vacuum', description: 'No atmosphere; population lives in sealed habitats, exports mostly minerals.' },
];

export function findStarportClass(code) { return STARPORT_CLASSES.find((s) => s.code === code) || null; }
export function findWorldSize(code) { return WORLD_SIZES.find((s) => s.code === code) || null; }
export function findAtmosphere(code) { return ATMOSPHERES.find((s) => s.code === code) || null; }
export function findHydrographics(code) { return HYDROGRAPHICS.find((s) => s.code === code) || null; }
export function findPopulation(code) { return POPULATIONS.find((s) => s.code === code) || null; }
export function findGovernment(code) { return GOVERNMENTS.find((s) => s.code === code) || null; }
export function findLawLevel(code) { return LAW_LEVELS.find((s) => s.code === code) || null; }
export function findBase(code) { return BASES.find((s) => s.code === code) || null; }
export function findTradeCode(code) { return TRADE_CODES.find((s) => s.code === code) || null; }
