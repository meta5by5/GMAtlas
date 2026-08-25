// worldTrackerMissionHooks.js — sector-state/feature -> mission-type
// mapping (requirements/PLANETFALL_world_tracker.md, section 1.5: "Each
// sector state/feature combination suggests a mission type from the 14").
// The exact 14-mission-type table lives in the real Planetfall rulebook,
// not in this repo — this seeds ONLY the spec's own worked examples,
// clearly marked, as a starting point. Data, not code: replace/extend this
// array with the real table whenever it's transcribed; worldTracker.js's
// generateMissionHooks() just scans it, no logic here to touch.
//
// `signal` matches one of: 'unexplored' (a still-unexplored sector) or a
// SectorFeature `kind` ('alien_site' | 'enemy_camp' | 'resource_node' |
// 'milestone_site').
export const WORLD_TRACKER_MISSION_HOOKS = [
  { signal: 'unexplored', missionType: 'Investigation', reason: 'Unexplored sector' },
  { signal: 'alien_site', missionType: 'Delve', reason: 'Alien site present' },
  { signal: 'enemy_camp', missionType: 'Pitched Battle', reason: 'Enemy camp present' },
  // Placeholders — real Planetfall mission types not yet transcribed here.
  { signal: 'resource_node', missionType: 'Salvage/Harvest', reason: 'Resource node present' },
  { signal: 'milestone_site', missionType: 'Objective', reason: 'Milestone site present' },
];
