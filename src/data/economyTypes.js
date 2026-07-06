// economyTypes.js — Location economy types for the Merchant Rules Lens
// (docs/adr/0013-trade-economy-types.md, extending ADR 0003/0004). A GM
// tags a Location with one of these labels (the ordinary freeform tag
// system in domain/entities.js — no new structured field) and
// domain/trade.js's priceAt() reads it to bias prices beyond the manual
// supply/demand dials, without requiring it: an untagged Location behaves
// exactly as before (bias 1.0).
//
// Two dials per type, not a Traveller-style Tech Level number: `scarcity`
// (0-10, how hard RAW goods are to come by locally) and `manufacturing`
// (0-10, local capacity to produce MANUFACTURED goods) — this deliberately
// avoids hardcoding a tech-level concept into Hostile's setting (per
// docs/adr/next-request.md, 2026-07-06: "avoid direct reference to tech
// level and build everything off a similar tech level but different
// scarcity and manufacturing capability"). Every Hostile world is assumed
// to sit at roughly the same rough tech band (see the Hostile references
// under assets/docs/) — what actually varies location to location is how
// much of anything there is, and how much of it can be built on-site.
//
// Exactly one model is active at a time (settings.tradeEconomyModel,
// schema.js) — "only one economy model operating," per the same request.
// `commodityBiasAt()` in domain/trade.js checks a Location's tag against
// BOTH models' types regardless of which is active, so switching models
// mid-campaign never orphans a tag a GM already set — "not game-breaking
// to change models during a campaign."
//
// The 'traveller' model's labels carry a "(Traveller-style)" suffix
// deliberately: no Traveller sourcebook exists in this repo (see ADR 0002/
// 0003's honesty note), and general trade-classification concepts like
// "Agricultural"/"Industrial"/"Rich"/"Poor" are common genre vocabulary,
// not this project's own invention — the suffix names the inspiration
// without claiming the mechanic transcribes any specific book's tables
// (the "bridge" pattern docs/adr/next-request.md asked for: prefer the
// setting-native model, but make a système's real-world inspiration
// legible when it's used instead). Content on both models is original,
// checked against Hostile's own world descriptions, and Hostile's lore
// wins any conflict between the two, per that same request.
export const ECONOMY_MODELS = [
  { id: 'hostile', label: 'Hostile (setting-native)' },
  { id: 'traveller', label: 'Traveller-style' },
];

export const ECONOMY_TYPES = [
  // --- Hostile (setting-native) ---
  { id: 'agricultural', label: 'Agricultural', model: 'hostile', scarcity: 2, manufacturing: 2,
    description: 'A hab-dome farmworld or aeroponics colony — food and water are abundant, but anything built has to ship in.' },
  { id: 'industrial', label: 'Industrial', model: 'hostile', scarcity: 4, manufacturing: 9,
    description: 'A fabrication/refinery hub — manufactured goods are cheap and plentiful, raw feedstock is imported.' },
  { id: 'extraction', label: 'Extraction Outpost', model: 'hostile', scarcity: 6, manufacturing: 3,
    description: 'A mining/drilling claim — ore and salvage flow out, everything else is scarce and marked up.' },
  { id: 'frontier-outpost', label: 'Frontier Outpost', model: 'hostile', scarcity: 8, manufacturing: 1,
    description: 'A small, barely-supplied colony at the edge of charted space — almost everything is scarce.' },
  { id: 'black-market', label: 'Black Market Hub', model: 'hostile', scarcity: 5, manufacturing: 5,
    description: 'An unregulated free port — availability is inconsistent by design, prices swing on what just came in.' },
  { id: 'corporate-enclave', label: 'Corporate Enclave', model: 'hostile', scarcity: 1, manufacturing: 8,
    description: 'A well-funded company town — both raw and manufactured goods are reliably stocked, at corporate markup.' },
  // --- Traveller-style (original content, no sourcebook — see header) ---
  { id: 'agricultural-traveller', label: 'Agricultural (Traveller-style)', model: 'traveller', scarcity: 2, manufacturing: 2,
    description: 'High food/organics output, low local fabrication capacity.' },
  { id: 'industrial-traveller', label: 'Industrial (Traveller-style)', model: 'traveller', scarcity: 3, manufacturing: 10,
    description: 'Heavy manufacturing capacity, raw materials mostly imported.' },
  { id: 'non-agricultural-traveller', label: 'Non-Agricultural (Traveller-style)', model: 'traveller', scarcity: 7, manufacturing: 6,
    description: 'Little local food/organics production; moderate fabrication capacity offsets some of the gap.' },
  { id: 'rich-traveller', label: 'Rich (Traveller-style)', model: 'traveller', scarcity: 1, manufacturing: 7,
    description: 'A wealthy world — both raw and manufactured goods are well-stocked.' },
  { id: 'poor-traveller', label: 'Poor (Traveller-style)', model: 'traveller', scarcity: 9, manufacturing: 1,
    description: 'An impoverished world — everything is scarce.' },
];

export function findEconomyType(id) {
  return ECONOMY_TYPES.find((t) => t.id === id) || null;
}

/** Every economy type belonging to one model, for a Settings reference list
 *  or a Location tag vocabulary suggestion — "only one model operating at a
 *  time" per docs/adr/0013. */
export function economyTypesForModel(modelId) {
  return ECONOMY_TYPES.filter((t) => t.model === modelId);
}
