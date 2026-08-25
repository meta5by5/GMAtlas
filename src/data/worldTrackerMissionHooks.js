// worldTrackerMissionHooks.js — sector-state/feature -> mission-type
// mapping (requirements/PLANETFALL_world_tracker.md, section 1.5: "Each
// sector state/feature combination suggests a mission type from the 14").
// The exact 14-mission-type table lives in the real Planetfall rulebook,
// not in this repo — this seeds ONLY the spec's own worked examples,
// clearly marked, as a starting point. Data, not code: replace/extend this
// array with the real table whenever it's transcribed; worldTracker.js's
// generateMissionHooks() just scans it, no logic here to touch.
//
// `signal` matches one of: 'unexplored' (a still-unexplored sector marked
// as a p.53 investigation site — see worldTracker.js's deriveSectorIcon/
// generateMissionHooks, NOT every unexplored sector), 'explored' (a
// revealed-but-not-yet-surveyed sector — direct request), or a
// SectorFeature `kind` ('alien_site' | 'enemy_camp' | 'resource_node' |
// 'milestone_site'). Each hook's `resolve` names which domain action
// generateMissionHooks' caller (shell.js's data-mission-hook-run handler)
// runs on top of the Journal log when the GM picks "Run this" — 'reveal'/
// 'survey' advance the sector's own state (naturally retiring that exact
// hook, since the signal that produced it no longer matches afterward);
// 'discover' marks the specific feature discovered (also retires its
// hook — see generateMissionHooks' own discovered-skip — while leaving
// the feature itself in place for ongoing tracking/migration).
export const WORLD_TRACKER_MISSION_HOOKS = [
  { signal: 'unexplored', missionType: 'Investigation', reason: 'Marked investigation site, not yet explored', resolve: 'reveal' },
  { signal: 'explored', missionType: 'Exploration Mission', reason: 'Sector explored, not yet surveyed', resolve: 'survey' },
  { signal: 'alien_site', missionType: 'Delve', reason: 'Alien site present', resolve: 'discover' },
  { signal: 'enemy_camp', missionType: 'Pitched Battle', reason: 'Enemy camp present', resolve: 'discover' },
  // Placeholders — real Planetfall mission types not yet transcribed here.
  { signal: 'resource_node', missionType: 'Salvage/Harvest', reason: 'Resource node present', resolve: 'discover' },
  { signal: 'milestone_site', missionType: 'Objective', reason: 'Milestone site present', resolve: 'discover' },
];
