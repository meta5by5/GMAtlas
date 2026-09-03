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
 *  ruleset/turnSteps/crewTasks — the Ruleset Profile Editor's, Turn Step
 *  tab's, and Crew Tasks tab's shared "Save" action) onto whatever is
 *  currently stored for that profile id, preserving id/name/createdAt and
 *  stamping a fresh updatedAt. Never touches any campaign document. */
export function applyProfileDraft(profile, draft) {
  return {
    ...profile,
    storyboardPositions: draft.storyboardPositions,
    moduleEnabled: draft.moduleEnabled,
    ruleset: draft.ruleset,
    turnSteps: draft.turnSteps,
    crewTasks: draft.crewTasks,
    updatedAt: new Date().toISOString(),
  };
}

// --- Turn Step default backfill (design/adr/rules-profiles-multi-
// campaign.md, direct follow-up request) -----------------------------------

/** One-time, narrowly-scoped upgrade for an install that already has an
 *  appConfig (so wrapLegacyCampaignIntoAppConfig, migrate.js's first-boot
 *  path, won't run again): fills in the 5PFH Turn Step seed content ONLY
 *  for a profile named exactly "5PFH" whose turnSteps.groups is still
 *  empty. Never touches a profile with ANY steps already on it, even a
 *  single manually-added one, and never touches a profile with a
 *  different name — additive-default-only, same "never overwrites
 *  something already there" posture as every other lazily-defaulted field
 *  in this app (see schema.js's toolbarCollapsedByDefault comment). Called
 *  once from store.js's load(). */
export function backfillDefaultTurnSteps(appConfig, seedGroups) {
  const needsBackfill = appConfig.profiles.some((p) => p.name === '5PFH' && (!p.turnSteps || !p.turnSteps.groups || p.turnSteps.groups.length === 0));
  if (!needsBackfill) return appConfig;
  return {
    ...appConfig,
    profiles: appConfig.profiles.map((p) => {
      if (p.name !== '5PFH' || (p.turnSteps && p.turnSteps.groups && p.turnSteps.groups.length)) return p;
      return { ...p, turnSteps: { groups: JSON.parse(JSON.stringify(seedGroups)) } };
    }),
  };
}

/** Same shape/posture as backfillDefaultTurnSteps immediately above — fills
 *  in the 5PFH Crew Tasks seed content ONLY for a profile named exactly
 *  "5PFH" whose crewTasks.tasks is still empty. Called once from
 *  store.js's load(), right alongside the Turn Step backfill. */
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
