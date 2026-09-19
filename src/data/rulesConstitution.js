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
    activationText: 'Show the Campaign panel\'s Starship tab (base 5PFH game).',
  },
  traveller: { label: 'Traveller', status: 'character ruleset authored (original content)', note: 'No sourcebook exists in assets/docs — confirmed by the 2026-07-03 ruleset library review. The character ruleset (data/rulesets.js) is original content inspired by classic Traveller\'s six characteristics and its 2d6-vs-8 task resolution (domain/dice.js\'s rollTraveller), not a transcription; still no Trade/Vehicle/NPC-generation content of its own beyond what Hostile/SWN already provide for those areas.', rulesetId: 'traveller', genrePackId: 'sci-fi-generic', get dedicatedRulesetId() { return this.rulesetId; } },
  // Direct request (Phase A audit, A4): "the Hostile (sci-fi, default)
  // Genre Pack becomes the Hostile Game System (not renamed as a pack —
  // restructured as a child entity)" — hostile is no longer its own entry
  // in data/genrePacks.js's GENRE_PACKS; it's a Game System (this entry)
  // whose genrePackId points at the new shared 'sci-fi-generic' pack
  // alongside starforged/fivepfh/traveller/swn/planetfall/gmatlascore.
  hostile: { label: 'Hostile', status: 'default genre', note: 'campaign.settings.genre default; the oracle tables in data/tables.js are Hostile-flavored.', genrePackId: 'sci-fi-generic', dedicatedRulesetId: null },
  swn: {
    label: 'Stars Without Number', status: 'faction/world/bestiary content authored (original content)', note: 'The SWN Revised Deluxe PDF now lives in assets/docs (2026-07-06) as reference material — the content below is still an original re-implementation of SWN\'s well-known CONCEPTS, not a transcription of its text/tables (docs/adr/0011-swn-cwn-content.md), EXCEPT the Faction Turn Engine (domain/factionTurnEngine.js, docs/adr/0031), which does transcribe SWN\'s real named assets/tags/goals in full and is why it alone sits behind the Game System Activation gate below. A "Stars Without Number" oracle group (data/tables.js) — Faction Action and World Tag. Faction depth (entities.js/domain/factions.js): Force/Cunning/Wealth stats plus a growing Assets list (the Faction card\'s Assets section, "Faction Asset" oracle table), and a stat-driven turn-resolution mini-game (resolveFactionTurn) layered onto the existing Pressure Track/Faction Turn automation. NPC deepening (domain/session.js\'s deepenNpc): Stereotype/Want/Complication tables roll onto an existing NPC\'s Overview. Bestiary styling: a Xenobestiary oracle group (Creature Origin/Method/Trait/Threat) and a Site Concept group (Feature/Danger/Wonder), both combinatorial "building block" generators in SWN\'s own well-documented style. Sector generation remains future work.',
    requiresActivation: true,
    activationText: 'Activate Stars Without Number faction content — I confirm I own a copy of Stars Without Number Revised (Deluxe Edition) and intend to use this transcribed content (data/swnFactionData.js) for my own personal GM reference, not for redistribution.',
    genrePackId: 'sci-fi-generic', dedicatedRulesetId: null,
  },
  gmatlascore: {
    label: 'GMAtlas Core', status: 'faction content authored (original, SWN-parallel mechanics)', note: 'A full parallel to the SWN Faction Turn Engine (docs/adr/0032-gmatlas-core-faction-provider.md, data/gmatlasFactionData.js): identical ratings/HP/cost/dice/difficulty formulas to SWN\'s own faction assets/tags/goals (mechanics and numbers aren\'t copyrightable expression) but every name and all flavor text is original writing. The ungated, safe-by-default provider — no Game System Activation needed.',
    genrePackId: 'sci-fi-generic', dedicatedRulesetId: null,
  },
  planetfall: {
    label: 'Planetfall (5PFH)', status: 'integrated', note: 'Colony drawer (domain/colony.js). Also gates the Campaign panel\'s Colony tab (direct follow-up request) — see fivepfh\'s own note above for why this reuses the Game System Activation mechanism as a plain feature toggle here.',
    requiresActivation: true,
    activationText: "Show the Campaign panel's Colony tab (Planetfall colony sim).",
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
    activationText: 'Activate Five Leagues from the Borderlands content — I confirm I own a copy of Five Leagues from the Borderlands (3rd Edition) and intend to use this transcribed content for my own personal GM reference, not for redistribution.',
    rulesetId: 'fiveleagues', genrePackId: 'fantasy', get dedicatedRulesetId() { return this.rulesetId; },
  },
};

// Canonical name for the registry above, per the Phase A audit's target
// model — same object, not a copy, so the two names can never drift apart.
// New code should prefer this name; RULES_PROVIDERS stays exported too
// since dozens of existing call sites already use it and a mass rename
// carries real risk for zero behavior change.
export const GAME_SYSTEMS = RULES_PROVIDERS;

/** Whether `systemId` (a RULES_PROVIDERS key) is usable right now. A
 *  provider with no `requiresActivation` flag is always activated — this
 *  gate exists only for content transcribed from a real, owned sourcebook
 *  (SWN's Faction Turn Engine today), because this app also deploys
 *  publicly (GitHub Pages), where "personal reference to a book you own"
 *  doesn't hold by default (docs/adr/0032). Deliberately a single function
 *  every call site goes through instead of reading `campaign.settings.
 *  gameSystemActivations` directly — the seam a real licensing check would
 *  replace this with later; nothing else in this app should assume a
 *  boolean flag is the permanent mechanism. */
export function isGameSystemActivated(campaign, systemId) {
  const provider = RULES_PROVIDERS[systemId];
  if (!provider || !provider.requiresActivation) return true;
  return !!(campaign && campaign.settings && campaign.settings.gameSystemActivations && campaign.settings.gameSystemActivations[systemId]);
}

// Verbatim from the gameplay-goals.md "Recommended Rules Constitution" table,
// with the narrative section's fuller provider lists preferred over the
// table's abbreviations where the two differ (e.g. NPC generation lists all
// three sources the narrative section named, not just the table's two).
export const GAMEPLAY_AREAS = [
  { id: 'story-structure', area: 'Story structure', providers: ['starforged'] },
  { id: 'exploration', area: 'Exploration', providers: ['starforged', 'traveller'] },
  { id: 'tactical-combat', area: 'Tactical combat', providers: ['fivepfh'] },
  { id: 'frontier-setting', area: 'Frontier setting', providers: ['hostile'] },
  { id: 'sector-generation', area: 'Sector generation', providers: ['swn'] },
  { id: 'world-generation', area: 'World generation', providers: ['swn', 'hostile'] },
  { id: 'trade', area: 'Trade', providers: ['traveller', 'hostile'] },
  { id: 'colony-management', area: 'Colony management', providers: ['planetfall'] },
  // The one gameplay area with two real, interchangeable providers today
  // (docs/adr/0032) — 'swn' listed first so an unset choice still defaults
  // to today's behavior for any campaign that predates this dropdown.
  { id: 'factions', area: 'Factions', providers: ['swn', 'gmatlascore'] },
  { id: 'npc-generation', area: 'NPC generation', providers: ['traveller', 'swn', 'hostile'] },
  { id: 'discovery', area: 'Discovery', providers: ['starforged'] },
  { id: 'horror', area: 'Horror', providers: ['hostile'] },
  { id: 'vehicle-rules', area: 'Vehicle rules', providers: ['traveller'] },
  { id: 'crew-relationships', area: 'Crew relationships', providers: ['starforged'] },
  { id: 'reputation-heat', area: 'Reputation & Heat', providers: ['hostile', 'traveller'] },
  { id: 'long-term-campaign-memory', area: 'Long-term campaign memory', providers: ['sagaatlas'] },
  { id: 'story-continuity', area: 'Story continuity', providers: ['sagaatlas'] },
  { id: 'rules-switching', area: 'Rules switching', providers: ['sagaatlas'] },
  { id: 'recommendation-engine', area: 'Recommendation engine', providers: ['sagaatlas'] },
];

export function providerLabel(id) {
  const p = RULES_PROVIDERS[id];
  return p ? p.label : id;
}

/** The GM's chosen provider for a gameplay area — `settings.
 *  rulesProviderChoices[areaId]` if explicitly set, else that area's own
 *  first-listed provider (preserves current behavior for a campaign that
 *  predates this dropdown, since `factions`'s own providers list keeps
 *  `'swn'` first). Only the `'factions'` area's resolved value actually
 *  changes app behavior right now (data/factionRulesProviders.js reads the
 *  same `settings.rulesProviderChoices.factions` key directly) — every
 *  other area is a recorded preference only (docs/adr/0032). */
export function resolveProviderChoice(settings, areaId) {
  const area = GAMEPLAY_AREAS.find((a) => a.id === areaId);
  if (!area) return null;
  const chosen = settings && settings.rulesProviderChoices && settings.rulesProviderChoices[areaId];
  return chosen || area.providers[0];
}

// The two ids that both mean "GMAtlas Core" today (see the sagaatlas entry's
// own comment above for why they're two records, not one) — used below to
// answer "does GMAtlas Core cover this gameplay area" without assuming
// either specific id.
const GMATLAS_CORE_IDS = ['gmatlascore', 'sagaatlas'];

/** Phase A audit (A3), the real "what does a GM's Rules Constitution choice
 *  actually resolve to during play" question `resolveProviderChoice` alone
 *  doesn't answer — that function returns the STORED/default choice
 *  regardless of whether the chosen Game System is actually usable right
 *  now. This layers the disable/fallback rule on top: a disabled Game
 *  System's own areas resolve to GMAtlas Core's ruleset if GMAtlas Core
 *  covers that specific area, else to `null` (no provider currently
 *  active) — resolved PER GAMEPLAY AREA, never a single global fallback
 *  flag, exactly as A3 specifies. The stored choice itself is never
 *  altered by this — re-enabling the Game System immediately restores it,
 *  since `resolveProviderChoice` (and thus this function) always reads
 *  the ORIGINAL stored value fresh, never a cached/rewritten one. */
export function resolveActiveProviderChoice(campaign, areaId) {
  const area = GAMEPLAY_AREAS.find((a) => a.id === areaId);
  if (!area) return null;
  const chosen = resolveProviderChoice(campaign && campaign.settings, areaId);
  if (isGameSystemActivated(campaign, chosen)) return chosen;
  const coreFallback = area.providers.find((p) => GMATLAS_CORE_IDS.includes(p));
  return coreFallback || null;
}
