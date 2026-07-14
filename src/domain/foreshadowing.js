// foreshadowing.js — "I just planted this, remind me to pay it off."
// Scoped down from docs/design/GMAtlas_Scene_Story_Data_Model.md's fuller
// foreshadowing_planted/foreshadowing_payoffs_due concept (see
// docs/design/scene-story-integration-plan.md for the reconciliation):
// that spec's version links a plant to a specific scene/thread id in a
// pre-authored branching scene graph, which this app deliberately doesn't
// have. This is the same IDEA — a GM's own to-do list for setups made
// live during play — with no dependency on any scene/thread having a
// stable identity ahead of time. Pure, DOM-free, same clone-and-return
// discipline as every other domain module.

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

/** Plant one — {id, text, payoffNote, paidOff:false, plantedAt}. No-op on
 *  blank text. `payoffNote` (optional) is the GM's own private intended
 *  resolution — the spec's `payoff_planned`, kept as free text since this
 *  app has no scene-id to point it at. */
export function addForeshadowing(campaign, text, payoffNote = '') {
  const next = clone(campaign);
  const clean = String(text || '').trim();
  if (!clean) return next;
  next.foreshadowing = Array.isArray(next.foreshadowing) ? next.foreshadowing : [];
  next.foreshadowing.push({
    id: 'fs_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    text: clean,
    payoffNote: String(payoffNote || '').trim(),
    paidOff: false,
    paidOffNote: '',
    plantedAt: new Date().toISOString(),
    paidOffAt: null,
  });
  return next;
}

/** Marks one paid off IN PLACE — kept, not deleted, so a GM can look back
 *  at what actually got resolved and how (same "flag/append, don't
 *  delete" posture as this app's other permanent-history fields).
 *  `paidOffNote` (optional) is how it actually resolved, which may differ
 *  from the original `payoffNote` plan — improv play rarely goes exactly
 *  as planned. No-op on an unknown id or an already-paid-off entry. */
export function markForeshadowingPaidOff(campaign, id, paidOffNote = '') {
  const next = clone(campaign);
  const f = (next.foreshadowing || []).find((x) => x.id === id);
  if (!f || f.paidOff) return next;
  f.paidOff = true;
  f.paidOffNote = String(paidOffNote || '').trim();
  f.paidOffAt = new Date().toISOString();
  return next;
}

/** Removes one entirely — for a genuinely mistaken entry, not for "I
 *  changed my mind about paying it off" (that's markForeshadowingPaidOff,
 *  which keeps the record). Unlike Faction Conflict's irreversibleFacts,
 *  a planted foreshadowing note is a GM's own private to-do, not a
 *  campaign-canon fact, so removal is allowed. */
export function removeForeshadowing(campaign, id) {
  const next = clone(campaign);
  next.foreshadowing = (next.foreshadowing || []).filter((f) => f.id !== id);
  return next;
}

/** Every not-yet-paid-off plant, oldest first — "what have I set up that
 *  I haven't paid off," the spec's own highest-value framing. A derived
 *  read, not a stored flag. */
export function openForeshadowing(campaign) {
  return (campaign.foreshadowing || [])
    .filter((f) => !f.paidOff)
    .slice()
    .sort((a, b) => new Date(a.plantedAt) - new Date(b.plantedAt));
}
