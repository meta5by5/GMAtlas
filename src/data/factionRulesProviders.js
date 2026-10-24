// factionRulesProviders.js — the SWN <-> GMAtlas Core provider registry
// (docs/adr/0032-gmatlas-core-faction-provider.md). One small indirection
// layer domain/factionTurnEngine.js reads through instead of importing
// data/swnFactionData.js directly, so a faction's catalog lookups (assets/
// tags/goals/maintenance/auto-abilities) resolve against whichever content
// provider is actually chosen for that faction.

import {
  SWN_FACTION_ASSETS, SWN_FACTION_TAGS, SWN_FACTION_GOALS, SWN_ASSET_MAINTENANCE,
  SWN_AUTOMATIC_ASSET_ABILITIES, findSwnAssetAnyStat, findSwnTag, findSwnGoal,
} from './swnFactionData.js';
import {
  GMATLAS_FACTION_ASSETS, GMATLAS_FACTION_TAGS, GMATLAS_FACTION_GOALS, GMATLAS_ASSET_MAINTENANCE,
  GMATLAS_AUTOMATIC_ASSET_ABILITIES, findGmatlasAssetAnyStat, findGmatlasTag, findGmatlasGoal,
} from './gmatlasFactionData.js';
import { resolveActiveProviderChoice } from './rulesConstitution.js';

export const FACTION_RULES_PROVIDERS = {
  swn: {
    id: 'swn',
    label: 'Stars Without Number',
    assets: SWN_FACTION_ASSETS,
    tags: SWN_FACTION_TAGS,
    goals: SWN_FACTION_GOALS,
    maintenance: SWN_ASSET_MAINTENANCE,
    autoAbilities: SWN_AUTOMATIC_ASSET_ABILITIES,
    findAssetAnyStat: findSwnAssetAnyStat,
    findTag: findSwnTag,
    findGoal: findSwnGoal,
  },
  gmatlascore: {
    id: 'gmatlascore',
    label: 'GMAtlas Core',
    assets: GMATLAS_FACTION_ASSETS,
    tags: GMATLAS_FACTION_TAGS,
    goals: GMATLAS_FACTION_GOALS,
    maintenance: GMATLAS_ASSET_MAINTENANCE,
    autoAbilities: GMATLAS_AUTOMATIC_ASSET_ABILITIES,
    findAssetAnyStat: findGmatlasAssetAnyStat,
    findTag: findGmatlasTag,
    findGoal: findGmatlasGoal,
  },
};

/** Resolution order: a faction's own override wins, then the profile's
 *  stored Rules Constitution -> Factions pick (honored as stored even if
 *  the book is no longer owned, so existing faction data never silently
 *  switches catalogs), then whatever that area resolves to by default —
 *  GMAtlas Core, since no Module for Profile carries faction rules of its
 *  own. store.js's one-time license migration writes an explicit 'swn'
 *  pick for every profile that had SWN activated before this model. */
export function factionProviderId(campaign, faction) {
  return (faction && faction.rulesProvider) ||
    (campaign && campaign.settings && campaign.settings.rulesProviderChoices && campaign.settings.rulesProviderChoices.factions) ||
    resolveActiveProviderChoice(campaign, 'factions') ||
    'gmatlascore';
}

export function factionProviderFor(campaign, faction) {
  return FACTION_RULES_PROVIDERS[factionProviderId(campaign, faction)] || FACTION_RULES_PROVIDERS.swn;
}
