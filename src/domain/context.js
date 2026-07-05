// context.js — the WHO/WHERE/WHAT/WHY/HOW model and the "Shift Story" reducers.
//
// This is the manual control layer the design chat asked for: named actions that
// let the GM intentionally change the situation ("raise danger, advance thread,
// introduce NPC, reveal clue, add complication") instead of hunting through tabs.
//
// Every shift is a PURE function (context) -> { context, event }. The event is a
// human-readable timeline entry. Because they're pure they're trivially testable
// and reused by Mission Control buttons, Co-Pilot Quick-Apply, and Continue Story.

const clamp = (n, lo = 0, hi = 10) => Math.max(lo, Math.min(hi, n));

function ctxClone(context) {
  return {
    ...context,
    who: { ...context.who }, where: { ...context.where },
    what: { ...context.what }, why: { ...context.why }, how: { ...context.how },
  };
}

// A campaign saved before Narrative Trackers shipped won't have resources/
// reputation in its stored context.what at all — default to the neutral
// midpoint (5), not 0, so an old save doesn't suddenly read as "out of
// supply"/"reviled." Same "undefined means the old default" posture as
// statblock fields' rollMethod (see CLAUDE.md Known non-issues).
const numOr = (v, d) => (v == null ? d : v);

// Each reducer receives a fresh clone and an optional payload.
export const SHIFTS = {
  'Raise Threat': (c) => { c.what.threat = clamp((c.what.threat || 0) + 1); return `Threat raised to ${c.what.threat}/10`; },
  'Lower Threat': (c) => { c.what.threat = clamp((c.what.threat || 0) - 1); return `Threat lowered to ${c.what.threat}/10`; },
  'Deepen Mystery': (c) => { c.what.mystery = clamp((c.what.mystery || 0) + 1); return `Mystery deepened to ${c.what.mystery}/10`; },
  'Resolve Mystery': (c) => { c.what.mystery = clamp((c.what.mystery || 0) - 1); return `Mystery eased to ${c.what.mystery}/10`; },
  'Gain Resources': (c) => { c.what.resources = clamp(numOr(c.what.resources, 5) + 1); return `Resources up to ${c.what.resources}/10`; },
  'Spend Resources': (c) => { c.what.resources = clamp(numOr(c.what.resources, 5) - 1); return `Resources down to ${c.what.resources}/10`; },
  'Raise Reputation': (c) => { c.what.reputation = clamp(numOr(c.what.reputation, 5) + 1); return `Reputation up to ${c.what.reputation}/10`; },
  'Lower Reputation': (c) => { c.what.reputation = clamp(numOr(c.what.reputation, 5) - 1); return `Reputation down to ${c.what.reputation}/10`; },
  'Raise Stress': (c) => { c.what.stress = clamp(numOr(c.what.stress, 5) + 1); return `Stress up to ${c.what.stress}/10`; },
  'Ease Stress': (c) => { c.what.stress = clamp(numOr(c.what.stress, 5) - 1); return `Stress eased to ${c.what.stress}/10`; },
  'Reveal Clue': (c, p) => { c.what.situation = appendNote(c.what.situation, p || 'A clue surfaces that points at the current thread.'); return 'Clue revealed'; },
  'Complicate': (c, p) => { c.what.situation = appendNote(c.what.situation, p || 'A complication forces a harder choice.'); c.what.threat = clamp((c.what.threat || 0) + 1); return 'Complication introduced'; },
  'Reward': (c, p) => { c.what.situation = appendNote(c.what.situation, p || 'The party gains leverage or resources.'); return 'Reward granted'; },
  'Advance Time': (c) => { c.how.summary = nextPacing(c.how.summary); return `Time advanced — pacing now ${c.how.summary}`; },
  'Change Location': (c, p) => { if (p) c.where.summary = p; return `Location changed${p ? ` to ${p}` : ''}`; },
  'Introduce NPC': (c, p) => { if (p) c.who.summary = mergeSummary(c.who.summary, p); return `Introduced ${p || 'an NPC'}`; },
  'Set Objective': (c, p) => { if (p) c.why.summary = p; return `Objective set${p ? `: ${p}` : ''}`; },
};

export function listShifts() { return Object.keys(SHIFTS); }

/**
 * Apply a named shift to a context object.
 * @returns {{context: object, event: {label:string, at:string, kind:'shift'}}}
 */
export function applyShift(context, shiftName, payload) {
  const fn = SHIFTS[shiftName];
  if (!fn) return { context, event: null };
  const next = ctxClone(context);
  const label = fn(next, payload);
  return { context: next, event: { kind: 'shift', label, at: new Date().toISOString() } };
}

const PACING = ['Calm', 'Curious', 'Tense', 'Escalating', 'Dangerous', 'Aftermath'];
function nextPacing(current) {
  const i = PACING.indexOf(current);
  if (i === -1) return 'Tense';
  return PACING[Math.min(PACING.length - 1, i + 1)];
}

function appendNote(text, note) {
  const base = (text || '').trim();
  return base ? `${base}\n• ${note}` : `• ${note}`;
}
function mergeSummary(current, addition) {
  const base = (current || '').trim();
  if (!base) return addition;
  if (base.split(',').map((s) => s.trim()).includes(addition)) return base;
  return `${base}, ${addition}`;
}

/** Short label used in the context strip for each question. */
export function contextSummary(context, key) {
  const c = (context && context[key]) || {};
  if (key === 'what') {
    const firstLine = (c.situation || '').split('\n')[0];
    return firstLine || c.intent || '';
  }
  return c.summary || '';
}
