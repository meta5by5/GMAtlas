// scenes.js — scene generation as pure functions. Adapted from v0.53's
// generateNextScene/mission/world seeds, but driven by the unified campaign
// model (context + settings.form) instead of reading the DOM.

import { getTable, pick } from './oracles.js';

function safePick(tables, rng, ...path) {
  const t = getTable(tables, ...path);
  return Array.isArray(t) && t.length ? pick(t, rng) : null;
}

/** Generate the next scene from current context. Returns a scene object.
 *  `lensCategories` (docs/adr/0009-situation-engine-revisited.md, Decision
 *  item 3), if given a non-empty array of [group, table] Oracle paths,
 *  rolls the scene's Driver line from a random one of those categories
 *  instead of the generic Plot Engine > Scene Driver — the "filtered
 *  toward the chosen lens's mapped categories" suggestNextWithLens()
 *  (session.js) needs. Omitted/empty preserves this function's exact
 *  original behavior (used by the ordinary, lens-less Continue Story). */
export function generateScene(campaign, tables, rng = Math.random, lensCategories = null) {
  const what = campaign.context.what || {};
  const where = campaign.context.where || {};
  const form = campaign.settings.form || {};
  const number = (campaign.scenes?.length || 0) + 1;

  const action = safePick(tables, rng, 'Core Oracles', 'Action');
  const theme = safePick(tables, rng, 'Core Oracles', 'Theme');
  const descriptor = safePick(tables, rng, 'Core Oracles', 'Descriptor');
  const focus = safePick(tables, rng, 'Core Oracles', 'Focus');
  const sensory = safePick(tables, rng, 'Location Themes', 'Sensory Detail');
  const clue = safePick(tables, rng, 'Miscellaneous', 'Story Clue');
  const complication = safePick(tables, rng, 'Miscellaneous', 'Story Complication');
  const sceneDriver = (lensCategories && lensCategories.length)
    ? safePick(tables, rng, ...lensCategories[Math.floor(rng() * lensCategories.length)])
    : safePick(tables, rng, 'Plot Engine', 'Scene Driver');
  const consequence = safePick(tables, rng, 'Miscellaneous', 'Pay the Price');

  const threat = what.threat || 0;
  const mystery = what.mystery || 0;
  const location = where.summary || [form.locationType, form.surroundings].filter(Boolean).join(' — ') || 'the current location';
  const intent = what.intent || 'Discovery';

  // "Opening" is stored as the FULL sentence, computed once here from its
  // oracle-rolled ingredients (descriptor, sensory detail, a threat/mystery
  // mood aside) — not re-derived from those pieces on every recompose. A
  // GM editing the Opening field is editing the actual line shown, not a
  // fragment nested inside a fixed template (a real gap the first version
  // of this split left: only the sensory detail was ever editable).
  const pressure = pressureLine(threat, mystery);
  const opening = `The scene opens in a ${descriptor ? descriptor.toLowerCase() : 'quiet'} space. First impression — ${sensory || 'a low hum and stale air'}. ${pressure}`;

  const scene = {
    id: 'scn_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    number,
    createdAt: new Date().toISOString(),
    intent,
    summary: `${intent} at ${location}`,
    memory: location,
    threat,
    mystery,
    spine: { action, theme, descriptor, focus },
    opening,
    driver: sceneDriver || 'An unresolved thread pulls the party forward.',
    clue: clue || 'A detail here connects to the current thread.',
    complication: complication || 'Something makes the obvious choice costly.',
    consequence: consequence || 'Pay the price — something is lost or complicated.',
    situationLine: what.situation ? what.situation.split('\n')[0] : '',
  };
  scene.text = recomposeSceneText(scene);
  return scene;
}

// Threat/Mystery mood aside for a fresh roll's Opening line — a one-time
// ingredient at generation (see generateScene above), not recomputed on
// every recompose, since Opening is a real, freely-editable field once
// rolled, not re-derived from threat/mystery on every edit.
function pressureLine(threat, mystery) {
  return threat >= 7 ? 'Everything feels exposed, watched, or already too late.'
    : threat >= 4 ? 'There is enough pressure that lingering here has a cost.'
    : mystery >= 6 ? 'The scene feels wrong in a way that invites investigation.'
    : 'For now, there is room to observe before danger closes in.';
}

/** Rebuilds a scene's `text` blob from its CURRENT field values — the same
 *  line-by-line shape generateScene() originally composed, just driven by
 *  whatever the fields hold now instead of a fresh oracle roll. This is
 *  what makes the split Latest Scene fields (ui/workspace/index.js) and the
 *  combined `text` view stay in sync: fields are the source of truth,
 *  `text` is a derived, one-directional view of them (session.js's
 *  updateSceneField calls this after every field edit) — not a second,
 *  independently-editable copy. Pure; safe to call from a UI-driven edit. */
export function recomposeSceneText(scene) {
  const { number, intent, memory: location, threat = 0, mystery = 0, spine = {}, opening, driver, clue, complication, consequence, situationLine } = scene;
  const { action, theme, descriptor, focus } = spine;

  const lines = [
    `Scene ${number}: ${intent}`,
    ``,
    `Location: ${location}`,
    `Threat ${threat}/10 · Mystery ${mystery}/10`,
    ``,
    `Oracle spine: Action ${action} / Theme ${theme} / Descriptor ${descriptor} / Focus ${focus}`,
    ``,
    `Opening: ${opening}`,
    ``,
    `Driver: ${driver}`,
    `Clue: ${clue}`,
    `Complication: ${complication}`,
    ``,
    `Decision point: weigh immediate safety, mission progress, and leverage over whoever is behind this.`,
    `Likely consequence: ${consequence}`,
  ];
  if (situationLine) { lines.push('', `Current thread: ${situationLine}`); }
  return lines.join('\n');
}

export function generateMissionSeed(campaign, tables, rng = Math.random) {
  const p = (...a) => safePick(tables, rng, ...a);
  return [
    'Mission Seed',
    '',
    `Mission: ${p('Missions', 'Mission Type')}`,
    `Patron: ${p('Missions', 'Patron')}`,
    `Complication: ${p('Missions', 'Twist')}`,
    `Opposition: ${p('Factions', 'Faction Type')} trying to ${p('Factions', 'Project')}`,
    `Reward: ${p('Missions', 'Reward')}`,
  ].filter((l) => !/: null$/.test(l)).join('\n');
}

export function generateWorldSeed(campaign, tables, rng = Math.random) {
  const p = (...a) => safePick(tables, rng, ...a);
  return [
    'World / Colony Seed',
    '',
    `Planetary Class: ${p('Planets', 'Planetary Class')}`,
    `Planet Trait: ${p('Planets', 'Planet Traits')}`,
    `Settlement: ${p('Settlements', 'Settlement Type')}`,
    `Authority: ${p('Settlements', 'Authority')}`,
    `Dominant Faction: ${p('Factions', 'Faction Type')}`,
    `Planetside Peril: ${p('Planets', 'Planetside Peril')}`,
  ].filter((l) => !/: null$/.test(l)).join('\n');
}
