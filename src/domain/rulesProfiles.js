// rulesProfiles.js — pure, DOM-free mutators for Rules Profiles and the
// campaign registry (design/adr/rules-profiles-multi-campaign.md). Every
// function takes a profile/appConfig object and returns a NEW one, same
// convention as every other domain/*.js module. Nothing here touches
// persistence — src/core/store.js is the only caller.

import { defaultCampaign, defaultRulesProfile, GATEABLE_MODULES } from '../core/schema.js';

// --- Rules Profiles --------------------------------------------------------

/** Add a new profile to appConfig.profiles, optionally cloning an existing
 *  one's ruleset/moduleEnabled/storyboardPositions as a starting point. */
export function createRulesProfile(appConfig, { name, cloneFromId } = {}, now = new Date().toISOString()) {
  const source = cloneFromId ? appConfig.profiles.find((p) => p.id === cloneFromId) : null;
  const profile = defaultRulesProfile(name || 'New Profile', now);
  if (source) {
    profile.storyboardPositions = { ...source.storyboardPositions };
    profile.moduleEnabled = { ...source.moduleEnabled };
    profile.ruleset = { ...source.ruleset, rulesProviderChoices: { ...source.ruleset.rulesProviderChoices }, gameSystemActivations: { ...source.ruleset.gameSystemActivations }, partyHeadlineFields: [...source.ruleset.partyHeadlineFields] };
  }
  return { ...appConfig, profiles: [...appConfig.profiles, profile] };
}

export function renameProfile(appConfig, profileId, name) {
  return updateProfileIn(appConfig, profileId, (p) => ({ ...p, name }));
}

export function updateProfileRuleset(profile, patch) {
  return { ...profile, ruleset: { ...profile.ruleset, ...patch }, updatedAt: new Date().toISOString() };
}

export function setModuleEnabled(profile, moduleId, enabled) {
  if (!GATEABLE_MODULES.includes(moduleId)) return profile;
  return { ...profile, moduleEnabled: { ...profile.moduleEnabled, [moduleId]: !!enabled }, updatedAt: new Date().toISOString() };
}

export function setStoryboardPosition(profile, slot, contentId) {
  if (!['composer', 'navigator', 'advisor'].includes(slot)) return profile;
  return { ...profile, storyboardPositions: { ...profile.storyboardPositions, [slot]: contentId }, updatedAt: new Date().toISOString() };
}

// The three Storyboard SLOT names (composer/navigator/advisor — fixed,
// always exactly these three) and the CONTENT id each slot points at when
// nothing else has been assigned there — a deliberately different
// namespace from the slot names themselves (see schema.js's
// defaultRulesProfile comment): 'dashboard' is the former WHO/WHERE/WHAT/
// WHY/HOW Dashboard, 'narrative' the narrative draft + pressure trackers,
// 'copilot' the Advisor/Co-Pilot. Keeping these distinct from the slot
// names is what lets a freed built-in (opened directly from the top nav
// once something else occupies its slot) render itself, instead of a
// bare 'composer'/'navigator'/'advisor' id being ambiguous between "the
// SLOT, resolve via the mapping" and "the built-in CONTENT, render as is."
export const BUILTIN_SLOT_CONTENT = { composer: 'dashboard', navigator: 'narrative', advisor: 'copilot' };

/** Resolve a Storyboard slot ('composer'/'navigator'/'advisor') to whatever
 *  content id currently fills it. A stored value equal to the slot's OWN
 *  name is legacy/malformed data (schema versions before content ids were
 *  a separate namespace, or manual tampering) — treated as "unset,"
 *  normalized to that slot's own built-in content, same as no value at
 *  all. Every other stored value (a real DRAWERS id, or a built-in content
 *  id assigned to a DIFFERENT slot than its own) passes through unchanged. */
export function resolvePositionContentId(profile, slot) {
  const raw = (profile && profile.storyboardPositions && profile.storyboardPositions[slot]) || BUILTIN_SLOT_CONTENT[slot];
  return raw === slot ? BUILTIN_SLOT_CONTENT[slot] : raw;
}

/** GATEABLE_MODULES ids can be hidden per-profile; everything else (Party,
 *  Guide, Cast, ...) is always visible regardless of profile. */
export function isModuleVisible(profile, moduleId) {
  if (!profile) return true;
  if (!GATEABLE_MODULES.includes(moduleId)) return true;
  return profile.moduleEnabled[moduleId] !== false;
}

/** The six ruleset fields store.get() splices onto a campaign doc's
 *  `settings` — the profile's overlay view. */
export function resolveOverlaySettings(profile) {
  return { ...profile.ruleset };
}

function updateProfileIn(appConfig, profileId, mutator) {
  return { ...appConfig, profiles: appConfig.profiles.map((p) => (p.id === profileId ? mutator(p) : p)) };
}

// --- Campaign registry -----------------------------------------------------

/** Register a new campaign entry + return its fresh document alongside the
 *  updated appConfig. Does NOT make it active — caller decides. */
export function createCampaign(appConfig, { title, profileId }, now = new Date().toISOString()) {
  const doc = defaultCampaign(now);
  if (title) doc.meta.title = title;
  const entry = { id: doc.meta.id, title: doc.meta.title, profileId, createdAt: now, updatedAt: now };
  return { appConfig: { ...appConfig, campaigns: [...appConfig.campaigns, entry] }, doc };
}

export function renameCampaignEntry(appConfig, campaignId, title) {
  const now = new Date().toISOString();
  return {
    ...appConfig,
    campaigns: appConfig.campaigns.map((c) => (c.id === campaignId ? { ...c, title, updatedAt: now } : c)),
  };
}

export function setActiveCampaign(appConfig, campaignId) {
  if (!appConfig.campaigns.some((c) => c.id === campaignId)) return appConfig;
  return { ...appConfig, activeCampaignId: campaignId };
}

/** Reassign an existing campaign to a different (already-registered) Rules
 *  Profile — an appConfig-only change, never touches the campaign's own
 *  document, so nothing about the campaign's data is at risk. */
export function reassignCampaignProfile(appConfig, campaignId, profileId) {
  if (!appConfig.profiles.some((p) => p.id === profileId)) return appConfig;
  const now = new Date().toISOString();
  return {
    ...appConfig,
    campaigns: appConfig.campaigns.map((c) => (c.id === campaignId ? { ...c, profileId, updatedAt: now } : c)),
  };
}

/** Commit a draft's edited slices (storyboardPositions/moduleEnabled/
 *  ruleset/crewTasks — the Ruleset Profile Editor's and Crew Tasks tab's
 *  shared "Save" action) onto whatever is currently stored for that
 *  profile id, preserving id/name/createdAt and stamping a fresh
 *  updatedAt. Never touches any campaign document. Turn Step Lists are no
 *  longer part of this draft (direct follow-up request — they're a
 *  standalone appConfig.turnStepLists inventory now, edited directly via
 *  store.updateAppConfig, not through the profile draft/Save/Discard
 *  flow — see domain/turnStepLists.js). */
export function applyProfileDraft(profile, draft) {
  return {
    ...profile,
    storyboardPositions: draft.storyboardPositions,
    moduleEnabled: draft.moduleEnabled,
    ruleset: draft.ruleset,
    crewTasks: draft.crewTasks,
    updatedAt: new Date().toISOString(),
  };
}

// --- Crew Tasks default backfill (design/adr/rules-profiles-multi-
// campaign.md, direct follow-up request) -----------------------------------
// NOTE: the equivalent Turn Step backfill used to live here
// (backfillDefaultTurnSteps) but Turn Step content is now a standalone,
// shared appConfig.turnStepLists inventory, not profile content — see
// domain/turnStepLists.js's backfillTurnStepListInventory instead (direct
// follow-up request: "create an inventory of Turn Step List profiles
// managed in Settings").

/** One-time, narrowly-scoped upgrade for an install that already has an
 *  appConfig (so wrapLegacyCampaignIntoAppConfig, migrate.js's first-boot
 *  path, won't run again): fills in the 5PFH Crew Tasks seed content ONLY
 *  for a profile named exactly "5PFH" whose crewTasks.tasks is still
 *  empty. Never touches a profile with ANY tasks already on it, even a
 *  single manually-added one, and never touches a profile with a
 *  different name — additive-default-only, same "never overwrites
 *  something already there" posture as every other lazily-defaulted field
 *  in this app (see schema.js's toolbarCollapsedByDefault comment). Called
 *  once from store.js's load(). */
export function backfillDefaultCrewTasks(appConfig, seedTasks) {
  const needsBackfill = appConfig.profiles.some((p) => p.name === '5PFH' && (!p.crewTasks || !p.crewTasks.tasks || p.crewTasks.tasks.length === 0));
  if (!needsBackfill) return appConfig;
  return {
    ...appConfig,
    profiles: appConfig.profiles.map((p) => {
      if (p.name !== '5PFH' || (p.crewTasks && p.crewTasks.tasks && p.crewTasks.tasks.length)) return p;
      return { ...p, crewTasks: { tasks: JSON.parse(JSON.stringify(seedTasks)) } };
    }),
  };
}

/** Grandfather step for the Campaign panel's Colony/Starship tab gating
 *  (direct follow-up request): fivepfh/planetfall Game System Activation
 *  now defaults to true for a BRAND NEW profile (schema.js's
 *  defaultRulesProfile), but an EXISTING profile predating this feature
 *  has no explicit fivepfh/planetfall key in its gameSystemActivations at
 *  all — left alone, both tabs would silently vanish for every campaign
 *  already using Colony. Any profile that currently has Colony visible
 *  (moduleEnabled.colony !== false) and no explicit value for either key
 *  gets both grandfathered to true, same "check the ORIGINAL value, only
 *  fires once" posture as migrate.js's own SWN grandfather step. Called
 *  once from store.js's load(), alongside the Turn Step List/Crew Tasks
 *  backfills. */
export function grandfatherCampaignPanelActivation(appConfig) {
  const needsGrandfathering = appConfig.profiles.some((p) => (
    p.moduleEnabled.colony !== false
    && (p.ruleset.gameSystemActivations.fivepfh === undefined || p.ruleset.gameSystemActivations.planetfall === undefined)
  ));
  if (!needsGrandfathering) return appConfig;
  return {
    ...appConfig,
    profiles: appConfig.profiles.map((p) => {
      if (p.moduleEnabled.colony === false) return p;
      const activations = p.ruleset.gameSystemActivations || {};
      if (activations.fivepfh !== undefined && activations.planetfall !== undefined) return p;
      return {
        ...p,
        ruleset: {
          ...p.ruleset,
          gameSystemActivations: {
            ...activations,
            fivepfh: activations.fivepfh === undefined ? true : activations.fivepfh,
            planetfall: activations.planetfall === undefined ? true : activations.planetfall,
          },
        },
      };
    }),
  };
}

/** Seeds the "D&D 5e (Storyboard)" campaign template (direct request,
 *  phase 2 of the D&D 5e work) for an install that already has an
 *  appConfig — a brand-new install gets it directly from
 *  migrate.js's wrapLegacyCampaignIntoAppConfig instead, same split every
 *  other seeded profile/list here already uses. Checked by exact NAME,
 *  same fragile-but-consistent convention backfillDefaultCrewTasks/
 *  backfillTurnStepListInventory already use for their own seeded
 *  content — a no-op once a profile with this name exists, so a GM who's
 *  since renamed or customized it never gets a duplicate. Called once
 *  from store.js's load(). */
export function backfillDnd5eStoryboardProfile(appConfig, now = new Date().toISOString()) {
  if (appConfig.profiles.some((p) => p.name === 'D&D 5e (Storyboard)')) return appConfig;
  return { ...appConfig, profiles: [...appConfig.profiles, dnd5eStoryboardProfile(now)] };
}

/** The actual "D&D 5e (Storyboard)" profile shape — every other module
 *  (Colony, World Tracker, Trade, Battlemap, Graph, Faction Events) off,
 *  Composer/Navigator/Advisor left at their untouched Storyboard defaults
 *  (dashboard/narrative/copilot) — shared between the backfill above and
 *  migrate.js's own first-install seeding so the two paths can never
 *  drift apart into two different-shaped profiles with the same name. */
export function dnd5eStoryboardProfile(now = new Date().toISOString()) {
  const profile = defaultRulesProfile('D&D 5e (Storyboard)', now);
  profile.moduleEnabled = GATEABLE_MODULES.reduce((acc, id) => { acc[id] = false; return acc; }, {});
  profile.ruleset = {
    ...profile.ruleset,
    // Direct request: "associating all of this to the 'Fantasy (D&D-style)'
    // genre pack... everything including the oracles must be independent
    // or a copy allocated to this version" — 'dnd5e' is its own genre pack
    // (data/genrePacks.js), forked from 'fantasy' at data/tables-dnd5e.js,
    // not a shared reference to the original.
    genrePack: 'dnd5e',
    statRuleset: 'dnd5e',
    gameSystemActivations: { swn: false, fivepfh: false, planetfall: false },
    partyHeadlineFields: ['Hit Points'],
  };
  return profile;
}

/** Phase A audit (A4): "hostile" stopped being a Genre Pack id — it's now
 *  a Game System inside the "sci-fi-generic" pack (data/genrePacks.js).
 *  migrate.js's own migrateDocument backfill rewrites a raw campaign
 *  document's (mostly inert, post-Rules-Profiles) settings.genrePack
 *  field; this is the matching backfill for the field that actually
 *  matters day to day — every EXISTING Rules Profile's own
 *  ruleset.genrePack, which store.get() overlays onto every campaign
 *  using that profile. Same idempotent, additive-only shape as this
 *  file's other backfills; genrePacks.js's own findGenrePack() alias is
 *  the belt-and-suspenders safety net if this somehow doesn't run before
 *  something reads a profile's genrePack. Called once from store.js's
 *  load(). */
export function backfillGenrePackRename(appConfig) {
  const needsBackfill = appConfig.profiles.some((p) => p.ruleset && p.ruleset.genrePack === 'hostile');
  if (!needsBackfill) return appConfig;
  return {
    ...appConfig,
    profiles: appConfig.profiles.map((p) => (
      p.ruleset && p.ruleset.genrePack === 'hostile'
        ? { ...p, ruleset: { ...p.ruleset, genrePack: 'sci-fi-generic' } }
        : p
    )),
  };
}
