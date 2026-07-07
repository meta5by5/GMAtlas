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
      where: { summary: '', entityIds: [] },
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

    director: {},        // unified Story Director cascade state
    oracles: { overrides: {}, usage: {} },
    documents: { library: [], openTabs: [], activeTab: null, refOverrides: {} },

    // Party-wide resource trackers not tied to any one entity (credits,
    // custom clocks, timers) — the Party tab's member roster is instead a
    // live filter over entities (NPC + #character tag), not stored here.
    party: { trackers: [] },

    // A flat key/value turn sheet matching the 5PFH Planetfall campaign
    // turn tracker, plus a crew roster that references character/vehicle
    // entities by id rather than duplicating their stats.
    colony: { fields: {}, crew: [] },

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
      // Which oracle table set (data/genrePacks.js) is active — separate
      // from `genre` above, which stays a free-text flavor label a GM can
      // type anything into. An old campaign with no genrePack reads as
      // 'hostile' (findGenrePack's own fallback), so this needed no
      // migration step.
      genrePack: 'hostile',
      // Which Location economy-type list (data/economyTypes.js) is active
      // for the Merchant Rules Lens (docs/adr/0013) — only one model
      // operates at a time. An old campaign with no tradeEconomyModel reads
      // as 'hostile', matching genrePack's own fallback convention above.
      tradeEconomyModel: 'hostile',
      tone: '',
      statRuleset: 'starforged',
      cie: {},           // Campaign Intelligence Engine settings
      entityTemplates: {},
      // Bestiary statblock field templates, keyed by game system id —
      // overrides data/statblockTemplates.js defaults once a system is
      // edited (see domain/statblockTemplates.js). Empty = all defaults.
      statblockTemplates: {},
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
