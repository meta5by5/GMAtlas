import { LICENSES } from './licenses.js';

// rulesConstitution.js — the "Rules Constitution": which external ruleset
// (or GMAtlas Core) is the content provider for each gameplay area.
// Source: requirements/initial design inputs/gameplay-goals.md, reconciled in
// docs/adr/0002-rules-constitution.md.
//
// Settings now renders a real `<select>` per gameplay area (docs/adr/0032),
// not just a read-only table — but only the Factions row actually changes
// app behavior today (via data/factionRulesProviders.js); every other row
// just records the GM's stated preference for the still-future Phase 9
// Activity -> Rules Lens recommender. Deliberately data, not code — same
// "genre-aware, not genre-locked" posture as data/rulesets.js and
// data/statblockTemplates.js.

// `rulesetId` (where present) is the matching id in data/rulesets.js — the
// join key the Phase 9 Activity -> Rules Lens recommender uses to offer
// "apply as default stat ruleset". Only providers with an actual character
// ruleset built get one; SWN/Hostile/Planetfall/GMAtlas Core don't
// (see their status notes for why) — Traveller does now (2026-07-06,
// original content, no sourcebook — see its own note below).
//
// Rules-Constitution schema rework (Phase A audit): this object IS the
// "Game System" registry the audit's target model calls for — every entry
// already had id/label/status/note; two fields are added below to close
// the gap rather than duplicating this into a second, parallel registry
// that would need to be kept in sync forever:
//   genrePackId — which Genre Pack (data/genrePacks.js) this system
//     belongs to, for the RPE's own Genre-Pack-scoped default.
//   dedicatedRulesetId — its own Game System Ruleset (GSR), i.e. the SAME
//     join key `rulesetId` above already was — kept as an alias of
//     `rulesetId` (not a second, possibly-drifting field) since nothing
//     about what it POINTS AT changed, only its canonical name per this
//     audit. A GSR is constrained to enable functionality from only its
//     OWN Game System and GMAtlas Core — see data/rulesets.js's own note
//     on RULESETS for where that constraint is documented (no runtime
//     enforcement needed yet: nothing in a character template today
//     references another Game System's content at all).
// `enabled` (the audit's third requested field) is deliberately NOT a
// static property here — it's the per-CAMPAIGN/profile activation state
// that already exists (`campaign.settings.gameSystemActivations`,
// resolved through `isGameSystemActivated` below), not a single global
// on/off switch shared by every campaign. A system with no
// `requiresActivation` flag is always enabled everywhere, matching that
// function's own existing behavior — see A3's resolveActiveProviderChoice
// further down for what "disabled" actually resolves to during play.
export const RULES_PROVIDERS = {
  starforged: { label: 'Starforged', status: 'integrated', note: 'Character sheets (Phase 4); its oracle philosophy and Progress Track model shaped domain/oracles.js and domain/threads.js.', rulesetId: 'starforged', genrePackId: 'sci-fi-generic', get dedicatedRulesetId() { return this.rulesetId; } },
  fivepfh: {
    label: 'Five Parsecs From Home', status: 'integrated', note: 'Character sheets (Phase 4). Also gates the Campaign panel\'s Starship tab (direct follow-up request) — a different kind of gate than SWN\'s own below (a plain feature toggle, not a licensing confirmation), reusing the same mechanism rather than inventing a second one.', rulesetId: '5pfh', genrePackId: 'sci-fi-generic', get dedicatedRulesetId() { return this.rulesetId; },
    requiresActivation: true,
  },
  traveller: { label: 'Traveller', status: 'character ruleset authored (original content)', note: 'Stale as of the 2026-07-03 ruleset library review this note used to cite: real Traveller 2e PDFs now live under assets/docs/Traveller/ (found while mapping assets/docs/\'s real per-game subfolders for the Ruleset Guide ToC + "Load" sourcebook button feature). The character ruleset (data/rulesets.js) remains original content inspired by classic Traveller\'s six characteristics and its 2d6-vs-8 task resolution (domain/dice.js\'s rollTraveller), not a transcription; still no Trade/Vehicle/NPC-generation content of its own beyond what Hostile/SWN already provide for those areas.', rulesetId: 'traveller', genrePackId: 'sci-fi-generic', get dedicatedRulesetId() { return this.rulesetId; } },
  // Direct request (Phase A audit, A4): "the Hostile (sci-fi, default)
  // Genre Pack becomes the Hostile Game System (not renamed as a pack —
  // restructured as a child entity)" — hostile is no longer its own entry
  // in data/genrePacks.js's GENRE_PACKS; it's a Game System (this entry)
  // whose genrePackId points at the new shared 'sci-fi-generic' pack
  // alongside starforged/fivepfh/traveller/swn/planetfall/gmatlascore.
  hostile: { label: 'Hostile', status: 'default genre', note: 'The default sci-fi Genre Pack\'s oracle tables (data/tables.js) are Hostile-flavored.', genrePackId: 'sci-fi-generic', dedicatedRulesetId: null },
  swn: {
    label: 'Stars Without Number', status: 'faction/world/bestiary content authored (original content)', note: 'The SWN Revised Deluxe PDF now lives in assets/docs (2026-07-06) as reference material — the content below is still an original re-implementation of SWN\'s well-known CONCEPTS, not a transcription of its text/tables (docs/adr/0011-swn-cwn-content.md), EXCEPT the Faction Turn Engine (domain/factionTurnEngine.js, docs/adr/0031), which does transcribe SWN\'s real named assets/tags/goals in full and is why it alone sits behind the Game System Activation gate below. A "Stars Without Number" oracle group (data/tables.js) — Faction Action and World Tag. Faction depth (entities.js/domain/factions.js): Force/Cunning/Wealth stats plus a growing Assets list (the Faction card\'s Assets section, "Faction Asset" oracle table), and a stat-driven turn-resolution mini-game (resolveFactionTurn) layered onto the existing Pressure Track/Faction Turn automation. NPC deepening (domain/session.js\'s deepenNpc): Stereotype/Want/Complication tables roll onto an existing NPC\'s Overview. Bestiary styling: a Xenobestiary oracle group (Creature Origin/Method/Trait/Threat) and a Site Concept group (Feature/Danger/Wonder), both combinatorial "building block" generators in SWN\'s own well-documented style. Sector generation remains future work.',
    requiresActivation: true,
    genrePackId: 'sci-fi-generic', dedicatedRulesetId: null,
  },
  gmatlascore: {
    label: 'GMAtlas Core', status: 'faction content authored (original, SWN-parallel mechanics)', note: 'A full parallel to the SWN Faction Turn Engine (docs/adr/0032-gmatlas-core-faction-provider.md, data/gmatlasFactionData.js): identical ratings/HP/cost/dice/difficulty formulas to SWN\'s own faction assets/tags/goals (mechanics and numbers aren\'t copyrightable expression) but every name and all flavor text is original writing. The ungated, safe-by-default provider — no Game System Activation needed.',
    genrePackId: 'sci-fi-generic', dedicatedRulesetId: null,
  },
  planetfall: {
    label: 'Planetfall (Five Parsecs from Home)', status: 'integrated', note: 'Colony drawer (domain/colony.js). Also gates the Campaign panel\'s Colony tab (direct follow-up request) — see fivepfh\'s own note above for why this reuses the Game System Activation mechanism as a plain feature toggle here.',
    requiresActivation: true,
    genrePackId: 'sci-fi-generic', dedicatedRulesetId: null,
  },
  // A standalone game (Bug Hunt) plus 5PFH expansions — licensed on its
  // own (data/licenses.js) and usable without 5PFH itself in use.
  'fivepfh-compendium': {
    label: 'Five Parsecs From Home: Compendium (Bug Hunt)', status: 'content pack authored (owned-sourcebook transcription)',
    note: 'Contributes the Bug Hunt Lifeforms & Enemies content pack today (Rules Constitution -> Bestiary & enemies).',
    requiresActivation: true,
    genrePackId: 'sci-fi-generic', dedicatedRulesetId: null,
  },
  // Direct request (literal rename): "Saga Atlas itself" -> "GMAtlas Core".
  // NOTE: this key (sagaatlas) is a DIFFERENT provider than the
  // `gmatlascore` entry above (Factions' own original SWN-parallel
  // content) — the two now share an identical DISPLAY LABEL while
  // remaining separate records with separate ids/notes/gameplay-area
  // assignments. Both are "the platform itself, not a licensed ruleset",
  // and A3's own fallback rule ("falls back to GMAtlas Core's ruleset if
  // GMAtlas Core has coverage for that area") is implemented below by
  // checking whether EITHER id appears in a given area's own providers
  // list — deliberately not merged into one id, since that would change
  // GAMEPLAY_AREAS' own provider lists and any already-stored
  // `rulesProviderChoices.factions`/faction.rulesProvider value of
  // 'gmatlascore', a bigger migration than this pass takes on.
  sagaatlas: {
    label: 'GMAtlas Core', status: 'core', note: "Never delegated to a Rules Lens — campaign memory, continuity, rules switching, and recommendations are the platform's own job, not any single ruleset's.",
    genrePackId: 'sci-fi-generic', dedicatedRulesetId: null,
  },
  // Direct request (D&D 5e work): unlike swn (copyrighted, personal-use-
  // only, requiresActivation) the SRD 5.2.1 is Creative Commons
  // (CC-BY-4.0) — genuinely free to reuse with attribution, so this is
  // ungated like gmatlascore above, no ownership confirmation needed. The
  // license's own required attribution statement lives on the SRD
  // Monsters content pack itself (data/contentPacksManifest.js), not
  // duplicated here.
  dnd5e: {
    label: 'D&D 5e (SRD 5.2.1)', status: 'ruleset + content pack authored (CC-BY-4.0 SRD material)',
    note: 'Character sheets (data/rulesets.js\'s dnd5e characterTemplate, phase 1 of this work) are original content in this app\'s own format, not a transcription. The "D&D 5e SRD Monsters A-Z" content pack (330 creatures) DOES transcribe real SRD 5.2.1 stat-block text and numbers, which the license explicitly permits — see that pack\'s own listing under Settings → Content Packs/Licenses for the required attribution statement.',
    rulesetId: 'dnd5e', genrePackId: 'dnd5e', get dedicatedRulesetId() { return this.rulesetId; },
  },
  // Five Leagues from the Borderlands (assets/docs/5LFB) — unlike dnd5e
  // above (CC-BY-4.0, ungated), this is a purchased commercial PDF, same
  // licensing situation as swn's own transcribed content: gated behind an
  // ownership-confirmation Game System Activation, not free to redistribute.
  fiveleagues: {
    label: 'Five Leagues from the Borderlands', status: 'ruleset + content pack authored (owned-sourcebook transcription)',
    note: 'Character sheets (data/rulesets.js\'s fiveleagues characterTemplate) are original content in this app\'s own format, mirroring 5PFH\'s own field shape (its sister game, same publisher/designer). The Five Leagues Enemies content packs (core rulebook + Compendium) DO transcribe real Enemy Profile stat-block numbers and traits from the purchased PDF, which is why this system sits behind the Game System Activation gate below — same posture as swn. Also gates the Campaign panel\'s Warband tab.',
    requiresActivation: true,
    rulesetId: 'fiveleagues', genrePackId: 'fantasy', get dedicatedRulesetId() { return this.rulesetId; },
  },
};

// Canonical name for the registry above, per the Phase A audit's target
// model — same object, not a copy, so the two names can never drift apart.
// New code should prefer this name; RULES_PROVIDERS stays exported too
// since dozens of existing call sites already use it and a mass rename
// carries real risk for zero behavior change.
export const GAME_SYSTEMS = RULES_PROVIDERS;

// Supplements: books whose content only ever augments a parent Game
// System in USE (the Five Leagues Compendium's Origins and enemies are for
// Five Leagues characters). Licensing is separate and independent
// (data/licenses.js — owning a Compendium never requires owning its core
// book). A profile turns a supplement on per gameplay area, so a GM can
// take its Origins without its enemies. The 5PFH Compendium is a
// standalone game (Bug Hunt), so it's a RULES_PROVIDERS entry above, not
// one of these.
export const GAME_SYSTEM_SUPPLEMENTS = {
  fiveleagues: [
    { id: 'fiveleagues-compendium', label: 'Five Leagues from the Borderlands: Compendium' },
  ],
};

/** The supplement descriptor for `id`, with its `parentId` — or null. */
export function findSupplement(id) {
  for (const [parentId, list] of Object.entries(GAME_SYSTEM_SUPPLEMENTS)) {
    const s = list.find((x) => x.id === id);
    if (s) return { ...s, parentId };
  }
  return null;
}

/** The license granting a Game System/Supplement id (or a license id
 *  itself), or null for platform content with no license (GMAtlas Core). */
export function licenseFor(id) {
  return LICENSES.find((l) => l.id === id) || LICENSES.find((l) => l.systems.includes(id)) || null;
}

/** The license whose Load list includes a Reference Library `file`, or null. */
export function licenseForDoc(file) {
  return LICENSES.find((l) => l.docs.includes(file)) || null;
}

/** Licenses grouped under their product-line header, in registry order —
 *  what the Settings -> Licenses tab renders. */
export function licenseFamilies() {
  const out = [];
  for (const l of LICENSES) {
    let fam = out.find((f) => f.label === l.family);
    if (!fam) { fam = { label: l.family, licenses: [] }; out.push(fam); }
    fam.licenses.push(l);
  }
  return out;
}

// The Rules Constitution's gameplay areas (design/adr/licenses-and-rules-
// constitution.md; full feature map in design/rules-constitution-mapping.md).
// Trimmed to areas that actually switch functionality. A profile picks one
// provider per area; unset means "Module for Profile" — the module's own
// rules when it's listed as a provider here, else `fallback`. `providers`
// lists Game Systems (RULES_PROVIDERS keys) and Supplements
// (GAME_SYSTEM_SUPPLEMENTS ids) that can fill the area. `turnSteps` marks
// the areas that carry a Turn Step walkthrough (isTurnStepSystemActive).
export const GAMEPLAY_AREAS = [
  { id: 'campaign-turn', area: 'Campaign turn', providers: ['fivepfh', 'fiveleagues'], fallback: null, turnSteps: true },
  { id: 'colony-management', area: 'Colony management', providers: ['planetfall'], fallback: null, turnSteps: true },
  { id: 'character-creation', area: 'Character creation', providers: ['fiveleagues-compendium'], fallback: null },
  { id: 'bestiary', area: 'Bestiary & enemies', providers: ['fivepfh-compendium', 'fiveleagues-compendium'], fallback: null },
  { id: 'factions', area: 'Factions', providers: ['swn', 'gmatlascore'], fallback: 'gmatlascore' },
  { id: 'frontier-setting', area: 'Frontier setting', providers: ['hostile'], fallback: null },
];

export function providerLabel(id) {
  const p = RULES_PROVIDERS[id];
  if (p) return p.label;
  const s = findSupplement(id);
  return s ? s.label : id;
}

/** The genrePackId belonging to whichever RULES_PROVIDERS entry's own
 *  `rulesetId` matches (e.g. 'fiveleagues' -> the 'fiveleagues' Game
 *  System entry's genrePackId, 'fantasy') — null if no entry claims that
 *  ruleset id. Direct follow-up report: "The scifi oracles should not be
 *  visible to the fantasy (generic) genre and vice versa. I can see all
 *  the scifi oracles in the current campaign linked to Five Leagues
 *  ruleset" — root cause was that Settings' "Default ruleset" and "Genre
 *  Pack" dropdowns write two fully independent profile.ruleset fields
 *  (statRuleset/genrePack); picking a ruleset never touched genrePack, so
 *  an old/default genrePack value could easily linger. shell.js's own
 *  data-settings-stat-ruleset handler uses this to keep them in sync by
 *  default going forward — a GM can still override Genre Pack afterward
 *  for a deliberate mismatch, since this only fires on a ruleset CHANGE,
 *  not on every render. */
export function genrePackIdForRuleset(rulesetId) {
  const entry = Object.values(RULES_PROVIDERS).find((p) => p.rulesetId === rulesetId);
  return entry ? entry.genrePackId : null;
}

// data/rulesets.js's statRuleset ("Module for Profile") id space doesn't
// always spell a RULES_PROVIDERS id the same way — today's one known mismatch.
const STAT_RULESET_TO_PROVIDER_ID = { '5pfh': 'fivepfh' };

/** The Module for Profile as a RULES_PROVIDERS/area-provider id, or null. */
export function moduleProviderId(settings) {
  const raw = settings && settings.statRuleset;
  return raw ? (STAT_RULESET_TO_PROVIDER_ID[raw] || raw) : null;
}

/** Install-wide ownership (Settings -> Licenses, `appConfig.licenses`,
 *  spliced onto every doc's settings by store.js's overlay), looked up
 *  through the license that grants `id` (data/licenses.js). An open
 *  (CC-BY) license is always owned; platform content with no license
 *  (GMAtlas Core) always counts as owned. Each license stands alone — a
 *  Compendium never needs its core book owned. Owning turns nothing on by
 *  itself; the Module for Profile or a Rules Constitution pick does. */
export function isLicensed(settings, id) {
  const lic = licenseFor(id);
  if (!lic || lic.open) return true;
  return !!((settings && settings.licenses) || {})[lic.id];
}

function findArea(areaId) { return GAMEPLAY_AREAS.find((a) => a.id === areaId) || null; }

function isSystemInUse(settings, systemId) {
  if (!isLicensed(settings, systemId)) return false;
  if (moduleProviderId(settings) === systemId) return true;
  const choices = (settings && settings.rulesProviderChoices) || {};
  return GAMEPLAY_AREAS.some((a) => choices[a.id] === systemId && a.providers.includes(systemId));
}

/** Whether `id` is a pickable, currently-valid provider for `area` here: one
 *  of its listed providers, owned, and (a supplement) its parent in use. */
function isValidChoice(settings, area, id) {
  if (!id || !area.providers.includes(id) || !isLicensed(settings, id)) return false;
  const sup = findSupplement(id);
  return sup ? isSystemInUse(settings, sup.parentId) : true;
}

/** Whether a Game System is in use by this campaign's profile: owned AND
 *  either the Module for Profile or picked in some Rules Constitution area.
 *  Free/original systems (no requiresActivation) are always in use. Every
 *  "is X on" gate (Campaign-panel tabs, Navigator workflows, module
 *  trackers) goes through this. */
export function isGameSystemActivated(campaign, systemId) {
  const provider = RULES_PROVIDERS[systemId];
  if (!provider || !provider.requiresActivation) return true;
  return isSystemInUse(campaign && campaign.settings, systemId);
}

/** The dropdown VALUE for an area: the stored pick if still valid, else ''
 *  (= "Module for Profile"). */
export function resolveProviderChoice(settings, areaId) {
  const area = findArea(areaId);
  if (!area) return null;
  const chosen = settings && settings.rulesProviderChoices && settings.rulesProviderChoices[areaId];
  return isValidChoice(settings, area, chosen) ? chosen : '';
}

/** The provider actually in effect for an area: a valid pick, else the
 *  Module for Profile when it's one of the area's providers and owned, else
 *  the area's fallback (or null — nothing extra in effect). */
export function resolveActiveProviderChoice(campaign, areaId) {
  const settings = campaign && campaign.settings;
  const area = findArea(areaId);
  if (!area) return null;
  const chosen = resolveProviderChoice(settings, areaId);
  if (chosen) return chosen;
  const mod = moduleProviderId(settings);
  if (mod && area.providers.includes(mod) && isLicensed(settings, mod)) return mod;
  return area.fallback;
}

/** Whether a Game System/Supplement is actually designated in this
 *  campaign: owned, and either the Module for Profile or in effect for
 *  some Rules Constitution area. */
function isDesignated(settings, id) {
  if (!isLicensed(settings, id)) return false;
  if (moduleProviderId(settings) === id) return true;
  const campaign = { settings };
  return GAMEPLAY_AREAS.some((a) => resolveActiveProviderChoice(campaign, a.id) === id);
}

/** Whether a license's sourcebooks belong in this campaign's Docs
 *  library: owned, and one of its systems (or, for a license with no
 *  rules of its own, one of its `alsoWith` systems) is designated here.
 *  An open license (Starforged, Ironsworn, the SRD) is only listed in a
 *  campaign that actually designates it. */
export function isLicenseInUse(settings, licenseId) {
  const lic = LICENSES.find((l) => l.id === licenseId);
  if (!lic || !isLicensed(settings, lic.id)) return false;
  return [...lic.systems, ...(lic.alsoWith || [])].some((id) => isDesignated(settings, id));
}

/** Whether a Reference Library `file` belongs in this campaign's Docs
 *  library. A file no license lists (an old flat-path catalog entry, an
 *  uncatalogued local file) never does. */
export function isReferenceDocInUse(settings, file) {
  const lic = licenseForDoc(file);
  return !!lic && isLicenseInUse(settings, lic.id);
}

/** Whether a game system's Turn Step walkthrough (Campaign-panel tab,
 *  its Crew Tasks, its Navigator workflow card) shows in this campaign:
 *  only when that system is what a `turnSteps` gameplay area actually
 *  resolves to — the area's pick, or the Module for Profile by default.
 *  Being in use for some other area (SWN for Factions, a Compendium for
 *  Bestiary) never brings Turn Steps along. */
export function isTurnStepSystemActive(campaign, systemId) {
  return GAMEPLAY_AREAS.some((a) => a.turnSteps && resolveActiveProviderChoice(campaign, a.id) === systemId);
}

/** Whether a content/data pack (data/contentPacksManifest.js) belongs to
 *  this campaign — the same test as its sourcebooks in the Docs library:
 *  the license for the pack's supplement (or else its game system) is
 *  owned AND designated in the campaign's profile. Drives Settings ->
 *  Campaigns -> Source Data. */
export function isPackInUse(settings, pack) {
  const lic = pack && licenseFor(pack.supplement || pack.ruleset);
  return !!lic && isLicenseInUse(settings, lic.id);
}

/** Whether a supplement is turned on for one specific gameplay area. */
export function isSupplementInUse(campaign, supplementId, areaId) {
  return resolveActiveProviderChoice(campaign, areaId) === supplementId;
}

/** The extra (non-module) provider ids an area's dropdown offers after its
 *  first "Module for Profile" option: owned, valid now, minus the module. */
export function rulesConstitutionOptionIds(settings, areaId) {
  const area = findArea(areaId);
  if (!area) return [];
  const mod = moduleProviderId(settings);
  return area.providers.filter((id) => id !== mod && isValidChoice(settings, area, id));
}

/** Available Packs / Statblock Templates scope: untagged entries, the active
 *  Genre Pack's own, the Module for Profile's own, and anything some Rules
 *  Constitution area currently has in effect. */
export function matchesEnabledModule(rulesetTag, settings) {
  if (rulesetTag == null) return true;
  if (rulesetTag === (settings && settings.genrePack)) return true;
  if (rulesetTag === moduleProviderId(settings)) return true;
  const campaign = { settings };
  return GAMEPLAY_AREAS.some((area) => resolveActiveProviderChoice(campaign, area.id) === rulesetTag);
}
