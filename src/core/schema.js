// schema.js — the single source of truth for the Saga Atlas campaign document.
//
// One versioned document replaces the ~15 uncoordinated localStorage keys used
// by v0.53. Everything the user creates lives here, so a single serialize path
// is lossless by construction (see store.export / store.import).
//
// Pure data + pure functions only. No DOM, no localStorage. This file is safe
// to import in the browser AND in Node (tests).

export const APP_NAME = 'Saga Atlas';

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
      what:  { situation: '', intent: 'Discovery', threat: 2, mystery: 2 },
      why:   { summary: '', entityIds: [] },
      how:   { summary: 'Exploration' },
    },

    entities: { items: [], activeId: null, history: [] },
    scenes: [],          // was sceneLog
    journal: [],
    timeline: [],        // breadcrumbs: campaign > act > scene > beat
    threads: [],         // progress clocks (NEW): [{id,name,filled,segments,done}]

    director: {},        // unified Story Director cascade state
    oracles: { overrides: {}, usage: {} },
    documents: { library: [], openTabs: [] },

    settings: {
      genre: 'Hostile',  // genre-aware, not genre-locked
      tone: '',
      cie: {},           // Campaign Intelligence Engine settings
      entityTemplates: {},
      form: {},          // legacy Story Director form fields, preserved verbatim
      ui: { activeCenterTab: 'journal', activeLeftTab: 'entityList', oracleFilter: '', entityFilter: '' },
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
