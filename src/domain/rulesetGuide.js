// rulesetGuide.js — auto-seeds a default Guide Table of Contents entry per
// ruleset (direct follow-up request: "Create a guide ToC for each ruleset
// against the sourcebooks associated to that ruleset... store that guide
// as a default for the ruleset and add it automatically if the ruleset is
// enabled"). Mirrors toc.js's own "find-or-create by title, idempotent"
// shape exactly (same file split: this module orchestrates guide.js's
// already-exported mutators rather than guide.js growing a new dependency
// on ruleset data).

import { createGuideDoc, setGuideDocText } from './guide.js';
import { RULESET_GUIDE_DEFAULTS } from '../data/rulesetGuideDefaults.js';
import { findRuleset } from '../data/rulesets.js';

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

const GUIDE_ROOT_TITLE = 'Game System References';

function findGuideDoc(campaign, predicate) {
  return ((campaign.guide && campaign.guide.docs) || []).find(predicate);
}

/** Does a Guide child doc already exist for this ruleset (under the shared
 *  "Game System References" root)? Used by the "Load" button's click
 *  handler to decide whether to prompt before re-linking — a plain read,
 *  no mutation. */
export function rulesetGuideDocExists(campaign, rulesetId) {
  const parent = findGuideDoc(campaign, (d) => !d.parentId && d.title === GUIDE_ROOT_TITLE);
  if (!parent) return false;
  const label = findRuleset(rulesetId).label;
  return !!findGuideDoc(campaign, (d) => d.parentId === parent.id && d.title === label);
}

/** One `- @[title]` bullet per sourcebook — the SAME markdown-bullet +
 *  real-mention convention toc.js's buildTocText already established. The
 *  mention doesn't need the Document Library to already have that title —
 *  findDocumentTabByTitle (documents.js) resolves it the moment a real
 *  Reference Library entry with a matching title exists, which is exactly
 *  what clicking "Load" produces (see drawers/index.js's Load button and
 *  shell.js's own click handler) — this text never needs to be rewritten
 *  after the fact. */
function buildReferenceListText(sourcebooks) {
  return sourcebooks.map((sb) => `- @[${sb.title}]`).join('\n');
}

/** Seeds (or, with `force`, re-seeds) the default Guide ToC entry for one
 *  ruleset: find-or-create the shared "Game System References" root doc,
 *  find-or-create a child titled that ruleset's own label, write its body
 *  as the bulleted sourcebook list. No-ops silently for a ruleset with no
 *  default list (dnd5e's own deliberate no-sourcebook posture, hostile/swn
 *  which aren't RULESETS entries at all, or an unrecognized id).
 *
 *  Without `force`, this only ever fires ONCE per campaign per ruleset —
 *  tracked via campaign.guide.seededRulesets — so a GM who later deletes
 *  the entry keeps it deleted; it's a one-time courtesy, not an enforced
 *  invariant (direct instruction: "If the Guide entry was removed or
 *  missing, prompt the user to create one," not silently re-add it).
 *  `force: true` is for that exact prompt's own "yes, recreate it" branch,
 *  bypassing the seeded-once check since the GM just explicitly asked for
 *  it again. Preserves whatever Guide doc was active before this ran —
 *  createGuideDoc/setGuideDocText each make their own target doc active as
 *  a side effect, which would otherwise silently hijack a GM's current
 *  Guide view on every quiet background seed. */
export function ensureRulesetGuideDefault(campaign, rulesetId, { force = false } = {}) {
  const sourcebooks = RULESET_GUIDE_DEFAULTS[rulesetId];
  if (!sourcebooks || !sourcebooks.length) return campaign;
  const seeded = (campaign.guide && campaign.guide.seededRulesets) || [];
  if (!force && seeded.includes(rulesetId)) return campaign;

  const previousActiveId = campaign.guide && campaign.guide.activeId;
  let next = clone(campaign);
  let parent = findGuideDoc(next, (d) => !d.parentId && d.title === GUIDE_ROOT_TITLE);
  if (!parent) {
    const r = createGuideDoc(next, { title: GUIDE_ROOT_TITLE });
    next = r.campaign;
    parent = { id: r.id };
  }
  const label = findRuleset(rulesetId).label;
  let child = findGuideDoc(next, (d) => d.parentId === parent.id && d.title === label);
  if (!child) {
    const r = createGuideDoc(next, { title: label, parentId: parent.id });
    next = r.campaign;
    child = { id: r.id };
  }
  next = setGuideDocText(next, child.id, buildReferenceListText(sourcebooks));
  if (previousActiveId) next.guide.activeId = previousActiveId;
  if (!seeded.includes(rulesetId)) next.guide.seededRulesets = [...seeded, rulesetId];
  return next;
}
