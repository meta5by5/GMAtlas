// schema.js — the single source of truth for the Saga Atlas campaign document.
//
// One versioned document replaces the ~15 uncoordinated localStorage keys used
// by v0.53. Everything the user creates lives here, so a single serialize path
// is lossless by construction (see store.export / store.import).
//
// Pure data + pure functions only. No DOM, no localStorage. This file is safe
// to import in the browser AND in Node (tests).

export const APP_NAME = 'GMAtlas';

// Bump this whenever the shape changes; add a matching step in migrate.js.
export const SCHEMA_VERSION = 1;

// Modules a Rules Profile can hide entirely (design/adr/rules-profiles-
// multi-campaign.md). Party is deliberately NOT here — it stays always-
// reachable regardless of profile, same as Guide/Oracle/Cast/Journal/etc.
export const GATEABLE_MODULES = ['colony', 'world-tracker', 'trade', 'battlemap', 'graph', 'faction-events'];

// The canonical WHO / WHERE / WHAT / WHY / HOW context — a first-class stored
// model, not something re-derived on every render (that was a v0.53 weakness).
export const CONTEXT_QUESTIONS = ['who', 'where', 'what', 'why', 'how'];

let _id = 0;
function uid(prefix = 'id') {
  _id += 1;
  return `${prefix}_${Date.now().toString(36)}_${(_id).toString(36)}`;
}

/** A brand-new, empty campaign document. */
export function defaultCampaign(now = new Date().toISOString()) {
  return {
    schemaVersion: SCHEMA_VERSION,
    app: APP_NAME,

    meta: {
      id: uid('camp'),
      title: 'New Campaign',
      createdAt: now,
      updatedAt: now,
    },

    // The heart of the cockpit. `active` drives which workspace view renders.
    context: {
      active: 'what',
      who:   { summary: '', entityIds: [] },
      // siteDescription/surroundings (direct follow-up request — reintroduces
      // the legacy Story Director's locationType/surroundings pair as
      // first-class fields, mapped to their own Oracle tables) replace the
      // long-unreachable `summary` ("Focus") field's role in
      // composeNarrativeDraft's WHERE contribution; summary/entityIds stay
      // declared per migration rule 5 even though nothing writes them
      // anymore (getCurrentWhereLocations reads scene.locationIds instead).
      where: { summary: '', entityIds: [], siteDescription: '', surroundings: '' },
      // threat/mystery are scene-immediate pressure; resources/reputation/
      // stress (Phase 6, pack 18's Narrative Trackers) are slower campaign-
      // level dials that persist across scenes the same way — nothing here
      // resets any of the five per scene, they're all just GM-set gauges the
      // Co-Pilot reads. Default to a neutral midpoint (5/10), not 0, since
      // a fresh campaign hasn't already run out of supply, goodwill, or calm.
      what:  { situation: '', intent: 'Discovery', threat: 2, mystery: 2, resources: 5, reputation: 5, stress: 5 },
      why:   { summary: '', entityIds: [] },
      // activity: '' means "not set" — an old campaign predating Phase 9
      // reads the same as a fresh one that hasn't picked an Activity yet,
      // no migration needed (same posture as resources/reputation above).
      how:   { summary: 'Exploration', activity: '' },
    },

    entities: { items: [], activeId: null, history: [] },
    scenes: [],          // was sceneLog
    journal: [],
    timeline: [],        // breadcrumbs: campaign > act > scene > beat
    threads: [],         // progress clocks (NEW): [{id,name,filled,segments,done}]

    // Foreshadowing tracking (docs/design/scene-story-integration-plan.md):
    // "I just planted this, remind me to pay it off" — a GM's own
    // lightweight to-do list for setups made live during play, not a
    // pre-authored branching-scene concept (this app deliberately has
    // none). domain/foreshadowing.js. Additive/lazy-init like
    // factionEvents/missions above — no migrate.js step needed.
    foreshadowing: [],

    // World State Flags (docs/design/scene-story-integration-plan.md): a
    // lightweight ledger of individual facts ("does the party know X"),
    // separate from any one entity's own fields — domain/worldFlags.js.
    // Additive/lazy-init, same posture as the section above.
    worldFlags: [],

    // SWN Faction Turn Engine (docs/adr/0031-swn-faction-turn-engine.md,
    // renamed "Faction Events" in its location-pairing follow-up): a
    // campaign-wide, reverse-chronological feed of every committed
    // faction-turn action (attacks, purchases, goal progress, ...), each
    // entry a Faction-Location pair — `locationId` where it happened,
    // `coLocatedFactions` (every other faction present there, tagged
    // ally/rival/neutral), `witnessed` (whether it happened where the
    // party currently is, per WHERE's own Focus @mentions). The Faction
    // Events panel reads this unfiltered (or filtered by faction/
    // location); a Faction's own inspector card filters to just that
    // faction's events. `factionTurnNumber` increments once per full
    // round (domain/factionTurnEngine.js's startTurnRound). Additive/
    // lazy-init like battlemaps/gallery above — no migrate.js step needed
    // for an old campaign missing these keys.
    factionEvents: [],
    factionTurnNumber: 0,

    // Living Faction Engine Phase C (domain/missions.js): a persisted,
    // trackable job — distinct from generateMission()'s older one-shot
    // journal-note path (still there, unchanged, for a GM who just wants
    // flavor text). Optionally sourced from a faction
    // (`sourceFactionId`) so a hot faction's activity can become
    // something the party can actually accept/decline/resolve, not just
    // Co-Pilot narration. Additive/lazy-init like factionEvents above —
    // no migrate.js step needed.
    missions: [],

    director: {},        // unified Story Director cascade state
    oracles: { overrides: {}, usage: {} },
    documents: { library: [], openTabs: [], activeTab: null, refOverrides: {} },

    // Gallery (Phase 11, docs/adr/0021-gallery.md): a tagged image
    // collection, separate from Documents (rulebooks/notes) — an entity's
    // thumbnail (entity.thumbnailId, set lazily, not part of the entity
    // default shape below) points at one of these images.
    gallery: { images: [] },

    // Planetfall Grid Battlemap (Phase 11, docs/adr/0023-planetfall-grid-
    // battlemap.md): named maps, each an optional background (a Gallery
    // image id — see gallery above) plus freeform-placed icons (kind:
    // 'annotation', from data/battlemapIcons.js, or kind: 'token', linking
    // a real Party/NPC entity). x/y are 0-1 fractions of the rendered
    // canvas, not pixels, so a map reads correctly regardless of the
    // browser window it's opened in. Additive/lazy-init like every other
    // section here — an old campaign missing this key just gets the
    // default `{ maps: [], activeId: null }` filled in by withDefaults(),
    // no migrate.js step needed.
    battlemaps: { maps: [], activeId: null },

    // Strategic sector/world map (requirements/PLANETFALL_world_tracker.md)
    // — a fixed 6x6 grid of sectors (5PFH Planetfall p.52+, sized by the
    // rulebook's own two-d6 mechanic), distinct from battlemaps above
    // (that's the TACTICAL miniatures grid; this is the strategic colony/
    // exploration map). `sectors` is sparse, keyed "x,y" (1-6 each) — a
    // coordinate with no entry yet reads as a synthesized default
    // unexplored sector (domain/worldTracker.js's getSector()), same
    // additive-lazy-init posture as everywhere else in this file. Campaign
    // Turn / Campaign Milestones are deliberately NOT duplicated here —
    // they already exist as colony.fields.campaignTurn/campaignMilestones
    // (same 5PFH Planetfall ruleset); worldTracker.js reads/writes those
    // directly via colony.js's own helpers instead of keeping a second,
    // driftable counter.
    worldTracker: { gridSize: 6, sectors: {}, homeBaseSector: null, notes: '' },

    // Party-wide resource trackers not tied to any one entity (credits,
    // custom clocks, timers) — the Party tab's member roster is instead a
    // live filter over entities (NPC + #character tag), not stored here.
    party: { trackers: [] },

    // A flat key/value turn sheet matching the 5PFH Planetfall campaign
    // turn tracker, plus a crew roster that references character/vehicle
    // entities by id rather than duplicating their stats, plus an
    // Encounters log (up to 10 rows — matches the 5PFH Planetfall
    // Encounters table) each with a free-text note and an optional
    // reference to a Lifeform entity.
    colony: { fields: {}, crew: [], encounters: [] },

    // A tree of freeform reference documents (docs/adr/0017-multi-doc-
    // guide-tree.md) — each a table of contents with @mentions/@[Doc]
    // pointers into the Cast and Document Library. `docs` is populated
    // lazily by domain/guide.js's ensureGuide() (same seed-then-lazy-init
    // posture as ensureOracles/ensureFactionFields elsewhere in this repo)
    // rather than here, so an old campaign's single `{text}` shape
    // migrates losslessly into the first root doc the first time it's read.
    guide: { docs: [], activeId: null },

    settings: {
      genre: 'Hostile',  // genre-aware, not genre-locked
      // genrePack/tradeEconomyModel/statRuleset/rulesProviderChoices/
      // gameSystemActivations/partyHeadlineFields below are INERT as of
      // the Rules Profile feature (design/adr/rules-profiles-multi-
      // campaign.md) — a Rules Profile now owns these, and store.get()
      // overlays the active profile's values onto this object on every
      // read, shadowing whatever's persisted here. Kept declared (not
      // removed) only so an old exported campaign JSON stays losslessly
      // importable per migration rule 5 — same "preserved but inert"
      // posture as `director`/`form` below. Never read these fields
      // directly; read them off the active profile (store.getActiveProfile()
      // or the overlaid doc.settings, which is the same thing).
      genrePack: 'hostile',
      tradeEconomyModel: 'hostile',
      tone: '',
      statRuleset: 'starforged',
      cie: {},           // Campaign Intelligence Engine settings
      entityTemplates: {},
      // Bestiary statblock field templates, keyed by game system id —
      // overrides data/statblockTemplates.js defaults once a system is
      // edited (see domain/statblockTemplates.js). Empty = all defaults.
      statblockTemplates: {},
      // Whether a rich-text field's formatting toolbar starts collapsed
      // (UX batch, default flipped true in docs/adr/0032 for a denser
      // mobile-friendly out-of-the-box layout) — a per-GM display
      // preference, not campaign content. A toolbar's actual shown/hidden
      // state also depends on any per-field override the GM has made this
      // session (ui.collapsedToolbars, ephemeral — see mentionEditor.js's
      // toolbarCollapsed()). Additive default only — an existing campaign
      // that already saved an explicit value (including a prior `false`)
      // is untouched; this only changes a brand-new campaign's default.
      toolbarCollapsedByDefault: true,
      // Rules Constitution (docs/adr/0032): the GM's chosen provider per
      // gameplay area (data/rulesConstitution.js's GAMEPLAY_AREAS ids),
      // e.g. { factions: 'gmatlascore' }. An unset area key falls back to
      // that area's own first-listed provider (resolveProviderChoice) —
      // only `factions` actually changes app behavior today
      // (data/factionRulesProviders.js reads this same key); every other
      // area is a recorded preference for the still-future Phase 9 Rules
      // Lens recommender.
      rulesProviderChoices: {},
      // Game System Activation gate (docs/adr/0032): whether a
      // `requiresActivation` provider (RULES_PROVIDERS.swn today — its
      // Faction Turn Engine transcribes real SWN content) is usable. A
      // fresh campaign starts every gated system OFF (GMAtlas Core is the
      // effective default) since this app deploys publicly; migrate.js
      // grandfathers this to `true` for a campaign that already has real
      // SWN faction-turn data, so nothing already built breaks.
      gameSystemActivations: { swn: false },
      // Living Faction Engine Phase B: a scene is the closest proxy this
      // app has for "a unit of party activity has passed" —
      // scenesSinceLastRound increments once per scene generated
      // (domain/session.js's continueStory/suggestNextWithLens);
      // factionTurnEngine.js's isFactionRoundDue() compares it against
      // scenesPerRound to surface a Co-Pilot nudge. Purely a reminder —
      // never auto-advances a faction turn (Article II).
      factionPacing: { scenesPerRound: 3, scenesSinceLastRound: 0 },
      // Which track-field names "headline" on a collapsed Party Roster
      // member row as small right-aligned counters (direct request — "GM
      // picks per-ruleset which fields surface"), matched case-insensitively
      // against a member's own statblock track field keys wherever they're
      // found (Character Sheet or Bestiary groups alike). Defaults to the
      // two named in the request; a GM on a ruleset with differently-named
      // resources (5PFH's Luck/XP) edits this list in Settings.
      partyHeadlineFields: ['Health', 'Momentum'],
      form: {},          // legacy Story Director form fields, preserved verbatim
      ui: { activeCenterTab: 'journal', activeLeftTab: 'entityList', oracleFilter: '', entityFilter: '', docFilter: '', docTagFilter: [] },
    },

    drawers: {
      widths: { journal: 450, oracle: 350, entities: 520, graph: 600, documents: 400, settings: 360 },
      open: [],
    },

    // Anything a migration could not confidently map lands here so the
    // transformation provably drops nothing. Inspected by tests.
    _legacy: {},
  };
}

// A Rules Profile bundles: which of GATEABLE_MODULES are visible, what
// fills the Storyboard's three positions, and the six ruleset fields that
// used to live directly on a campaign's `settings` (see the comment on
// defaultCampaign().settings.genrePack above). Shared across every campaign
// that picks it — editing a profile changes it everywhere it's used, by
// design (design/adr/rules-profiles-multi-campaign.md).
export function defaultRulesProfile(name = 'Default', now = new Date().toISOString()) {
  return {
    id: uid('profile'),
    name,
    createdAt: now,
    updatedAt: now,
    // Values are CONTENT ids, a deliberately separate namespace from this
    // object's own keys (the three fixed SLOT names) — 'dashboard'/
    // 'narrative'/'copilot' mean "this position's own built-in content"
    // (the former Dashboard/Narrative/Advisor); any other DRAWERS id
    // (colony, world-tracker, party, trade, …) is equally valid here.
    // Content ids must never equal a slot name (domain/rulesProfiles.js's
    // resolvePositionContentId treats that as legacy/unset data) — this is
    // what lets a freed built-in, opened directly from the top nav once
    // something else occupies its slot, render itself instead of being
    // mistaken for a reference back to whatever now fills that slot.
    storyboardPositions: { composer: 'dashboard', navigator: 'narrative', advisor: 'copilot' },
    moduleEnabled: GATEABLE_MODULES.reduce((acc, id) => { acc[id] = true; return acc; }, {}),
    ruleset: {
      genrePack: 'hostile',
      tradeEconomyModel: 'hostile',
      statRuleset: 'starforged',
      rulesProviderChoices: {},
      gameSystemActivations: { swn: false },
      partyHeadlineFields: ['Health', 'Momentum'],
    },
  };
}

// The app-level registry: which campaigns exist (a lightweight index, not
// full documents — each campaign's actual document lives under its own
// store.js key), which Rules Profiles exist, and which campaign is active.
// Separate from any one campaign document since a profile is shared across
// campaigns and a campaign list obviously can't live inside one campaign.
export function defaultAppConfig() {
  return { activeCampaignId: null, campaigns: [], profiles: [] };
}

/** Deep-merge a partial document onto defaults so old/partial docs stay valid. */
export function withDefaults(partial, now) {
  const base = defaultCampaign(now);
  return deepMerge(base, partial || {});
}

export function deepMerge(target, source) {
  if (!isObject(target) || !isObject(source)) return source === undefined ? target : source;
  const out = Array.isArray(target) ? target.slice() : { ...target };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    if (isObject(sv) && isObject(out[key])) out[key] = deepMerge(out[key], sv);
    else out[key] = sv;
  }
  return out;
}

export function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
