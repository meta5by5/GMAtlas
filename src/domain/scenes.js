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

  const pressure = threat >= 7 ? 'Everything feels exposed, watched, or already too late.'
    : threat >= 4 ? 'There is enough pressure that lingering here has a cost.'
    : mystery >= 6 ? 'The scene feels wrong in a way that invites investigation.'
    : 'For now, there is room to observe before danger closes in.';

  const lines = [
    `Scene ${number}: ${intent}`,
    ``,
    `Location: ${location}`,
    `Threat ${threat}/10 · Mystery ${mystery}/10`,
    ``,
    `Oracle spine: Action ${action} / Theme ${theme} / Descriptor ${descriptor} / Focus ${focus}`,
    ``,
    `Opening: The scene opens in a ${descriptor ? descriptor.toLowerCase() : 'quiet'} space. First impression — ${sensory || 'a low hum and stale air'}. ${pressure}`,
    ``,
    `Driver: ${sceneDriver || 'An unresolved thread pulls the party forward.'}`,
    `Clue: ${clue || 'A detail here connects to the current thread.'}`,
    `Complication: ${complication || 'Something makes the obvious choice costly.'}`,
    ``,
    `Decision point: weigh immediate safety, mission progress, and leverage over whoever is behind this.`,
    `Likely consequence: ${consequence || 'Pay the price — something is lost or complicated.'}`,
  ];
  if (what.situation) { lines.push('', `Current thread: ${what.situation.split('\n')[0]}`); }

  return {
    id: 'scn_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    number,
    createdAt: new Date().toISOString(),
    intent,
    summary: `${intent} at ${location}`,
    text: lines.join('\n'),
    memory: location,
    spine: { action, theme, descriptor, focus },
    consequence,
  };
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
