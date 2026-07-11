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

/** Resolution order: a faction's own override wins, then the campaign's
 *  default choice (Settings -> Rules Constitution -> Factions), then
 *  `'swn'` — unchanged default so an existing campaign/test behaves
 *  exactly as before this provider indirection existed. Callers that also
 *  need to respect the Game System Activation gate (rulesConstitution.js's
 *  `isGameSystemActivated`) do that check separately, at the UI selection
 *  point — this function always resolves whatever is actually stored,
 *  gated or not, so already-existing campaign data never silently changes
 *  which catalog it reads from. */
export function factionProviderId(campaign, faction) {
  return (faction && faction.rulesProvider) ||
    (campaign && campaign.settings && campaign.settings.rulesProviderChoices && campaign.settings.rulesProviderChoices.factions) ||
    'swn';
}

export function factionProviderFor(campaign, faction) {
  return FACTION_RULES_PROVIDERS[factionProviderId(campaign, faction)] || FACTION_RULES_PROVIDERS.swn;
}
