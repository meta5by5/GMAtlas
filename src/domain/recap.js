// recap.js — Session Recap ("Narrative Recall"): a pure function composing
// "previously on..." from data the campaign already keeps, so a GM can
// re-orient in ten seconds instead of scrolling the whole Journal. First
// item of Phase 6 (Campaign Continuity) — see PROGRESS.md / pack 76.
//
// No new storage, no new mutation — this only reads. Six components, per
// pack 76's "Narrative Recall" spec: what happened last time, unresolved
// threads, the active objective, relevant entities, current pressure (a
// proxy for "pending consequences" until a formal Consequence Engine
// exists — see docs/adr/0001), and recommended next actions.

import { listThreads, threadUnderPressure } from './threads.js';
import { getEntity } from './entities.js';
import { advise } from './copilot.js';

const RECENT_JOURNAL_COUNT = 8;

/** Build a session recap from the current campaign state. Pure — reads
 *  only, returns a plain data object for the UI (or a future LLM prompt)
 *  to render however it likes. */
export function buildSessionRecap(campaign) {
  const journal = Array.isArray(campaign.journal) ? campaign.journal : [];
  // Exclude prior recaps saved as notes — otherwise a saved recap shows up
  // inside the next recap's own "last time" list, one level removed from
  // recapping itself.
  const lastTime = journal.filter((j) => j.source !== 'Session Recap').slice(-RECENT_JOURNAL_COUNT).reverse()
    .map((j) => ({ id: j.id, text: j.text, source: j.source, createdAt: j.createdAt, isHtml: !!j.isHtml }));

  const threads = listThreads(campaign);
  const openThreads = threads.filter((t) => !t.done)
    .map((t) => ({ id: t.id, name: t.name, filled: t.filled, segments: t.segments }));
  const hot = threadUnderPressure(campaign);

  const who = (campaign.context && campaign.context.who && campaign.context.who.entityIds) || [];
  const where = (campaign.context && campaign.context.where && campaign.context.where.entityIds) || [];
  const relevantEntities = [...new Set([...who, ...where])]
    .map((id) => getEntity(campaign, id))
    .filter(Boolean)
    .map((e) => ({ id: e.id, name: e.name, type: e.type }));

  const what = (campaign.context && campaign.context.what) || { threat: 0, mystery: 0 };
  const objective = (campaign.context && campaign.context.why && campaign.context.why.summary) || '';

  const advice = advise(campaign);

  return {
    lastTime,
    openThreads,
    threadUnderPressure: hot ? { id: hot.id, name: hot.name, filled: hot.filled, segments: hot.segments } : null,
    objective,
    pressure: { threat: what.threat || 0, mystery: what.mystery || 0 },
    relevantEntities,
    recommendedNext: {
      observation: advice.observation,
      suggestedOracle: advice.suggestedOracle,
      suggestedOraclePath: advice.suggestedOraclePath,
      quickActions: advice.quickActions,
    },
  };
}

/** Render a recap as one plain-text block — for the Journal's "Save as a
 *  note" action, or a future LLM prompt/export, without needing to know the
 *  UI's markup. */
export function formatSessionRecap(recap) {
  const lines = ['Previously on...'];
  if (recap.lastTime.length) {
    lines.push('', 'Last time:');
    for (const j of recap.lastTime) lines.push(`- ${stripHtml(j.text)}`);
  }
  if (recap.openThreads.length) {
    lines.push('', 'Open threads:');
    for (const t of recap.openThreads) lines.push(`- ${t.name} (${t.filled}/${t.segments})`);
  }
  if (recap.objective) lines.push('', `Objective: ${recap.objective}`);
  if (recap.relevantEntities.length) lines.push('', `Relevant: ${recap.relevantEntities.map((e) => e.name).join(', ')}`);
  lines.push('', `Pressure: threat ${recap.pressure.threat}/10, mystery ${recap.pressure.mystery}/10`);
  lines.push('', `Recommended: ${recap.recommendedNext.observation}`);
  return lines.join('\n');
}

function stripHtml(s) { return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
