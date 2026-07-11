// factionRulesProviders.js — the SWN <-> GMAtlas Core provider registry
// (docs/adr/0032-gmatlas-core-faction-provider.md). One small indirection
// layer domain/factionTurnEngine.js reads through instead of importing
// data/swnFactionData.js directly, so a faction's catalog lookups (assets/
// tags/goals/maintenance/auto-abilities) resolve against whichever content
// provider is actually chosen for that faction.

import * as swn from './swnFactionData.js';
import * as gmatlascore from './gmatlasFactionData.js';

export const FACTION_RULES_PROVIDERS = {
  swn: {
    id: 'swn',
    label: 'Stars Without Number',
    assets: swn.SWN_FACTION_ASSETS,
    tags: swn.SWN_FACTION_TAGS,
    goals: swn.SWN_FACTION_GOALS,
    maintenance: swn.SWN_ASSET_MAINTENANCE,
    autoAbilities: swn.SWN_AUTOMATIC_ASSET_ABILITIES,
    findAssetAnyStat: swn.findSwnAssetAnyStat,
    findTag: swn.findSwnTag,
    findGoal: swn.findSwnGoal,
  },
  gmatlascore: {
    id: 'gmatlascore',
    label: 'GMAtlas Core',
    assets: gmatlascore.GMATLAS_FACTION_ASSETS,
    tags: gmatlascore.GMATLAS_FACTION_TAGS,
    goals: gmatlascore.GMATLAS_FACTION_GOALS,
    maintenance: gmatlascore.GMATLAS_ASSET_MAINTENANCE,
    autoAbilities: gmatlascore.GMATLAS_AUTOMATIC_ASSET_ABILITIES,
    findAssetAnyStat: gmatlascore.findGmatlasAssetAnyStat,
    findTag: gmatlascore.findGmatlasTag,
    findGoal: gmatlascore.findGmatlasGoal,
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
