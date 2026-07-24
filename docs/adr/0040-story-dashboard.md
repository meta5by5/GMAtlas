# ADR 0040 — Story Dashboard (Phase 12)

## Status

Accepted and implemented. The Story Dashboard is the single workspace
view — `ui/workspace/index.js`'s `renderWorkspace(doc, ui)` renders one
consolidated surface (no `active` param, no per-question tabs): a header
(location banner, Threat/Mystery/Stress/Resources/Reputation dials,
Activity select), 5 collapsible sections (one per former WHO/WHERE/WHAT/
WHY/HOW question, open by default, same toggle-button convention
`drawers/index.js`'s Bases of Influence uses), and the Narrative Composer
in a sticky top-right column. Every suggestion/oracle-generating control
(Story Options, both Suggestion Lens pickers, the Site Concept/Adventure
Seed generators, the Activity → Rules Lens suggestion, "▶ Continue
Story," and the `WHAT_ACTIONS` shift chips) lives in the always-visible
Co-Pilot panel, not on any dashboard section.

Two items from the original roadmap remain open:
- **Oracle-tailored dropdowns beyond WHAT's Intent and WHO/WHERE-driven
  lens draws** are tracked by `docs/adr/0041-scene-operating-model.md`'s
  13d, not this ADR — don't build both.
- **8 of `context.js`'s 17 `SHIFTS` reducers** (`Deepen Mystery`,
  `Resolve Mystery`, `Gain Resources`, `Spend Resources`, `Raise
  Reputation`, `Lower Reputation`, `Raise Stress`, `Change Location`) are
  still not surfaced as UI controls anywhere (the 6 `WHAT_ACTIONS` chips
  already are, in Co-Pilot's Quick Apply). Planned, not yet built.
- **Dead-export housekeeping** (see Decision, below) is an open decision
  point — a recommendation, not yet acted on.

Original request:
the 5-W workspace "is still missing a comprehensive and interactive
narrative-building GM guide that offers/suggests oracles and directive
story options while allowing the GM to adjust the options on the fly."
Four concrete directions were floated: consolidate the 5-W tabs into one
dashboard; randomly-generated scene-development steps; dropdowns that
surface tailored oracle suggestions; composing dropdown/textbox
selections into narrative prose, previewed and pasteable into the
Journal. A direct follow-up went further: fold WHO/WHERE/WHAT/WHY/HOW's
full editable content into the dashboard itself and retire the separate
tabs, with all suggestion/oracle logic consolidated into Co-Pilot as "an
active decision sandbox."

**This ADR supersedes Article X** ("the workspace changes, not the
application" — one W-question at a time, the app's governing UX
principle since Phase 0) for the workspace surface specifically: per
direct instruction, the workspace is a single consolidated Dashboard
rather than one focused view at a time. Per this repo's own "no two docs
get to disagree" rule (`CLAUDE.md`), this ADR is the authority on the
question going forward — don't flag the `dashboard` view as contradicting
Article X, and don't go looking for a separate WHO/WHERE/WHAT/WHY/HOW tab
strip; it's gone.

## Context

A full audit of `src/domain/*.js` against `src/ui/**/*.js` (grepping
every export for a UI caller) found the exact primitives this dashboard
needed already existed, several of them built and proven but scoped far
narrower than they could be:

- **`domain/scenes.js`'s `recomposeSceneText(scene)`** — a working
  "structured fields → live-recomposed narrative text" mechanism (edit
  any of a Scene's 7 fields, its `text` re-derives immediately). Used in
  exactly two places (`generateScene`'s initial roll,
  `session.js`'s `updateSceneField` on every edit) and scoped only to the
  Scene object's own fields — never generalized to compose WHO/WHERE/
  WHAT/WHY/HOW's own field values into anything.
- **`domain/recap.js`'s `buildSessionRecap`/`formatSessionRecap`** — a
  working "assemble N structured signals into readable prose, explicit-
  save (never auto-written to the Journal)" mechanism. One fixed report
  shape (6 hardcoded components), not reusable for a different
  combination of signals.
- **"Selection → tailored oracle suggestion" hooks**: exactly two exist —
  `data/activities.js`'s `suggestRulesLens(activityId)` (the Activity
  dropdown only) and Story Options/weighted-lens-draw (`docs/adr/0039`).
  WHO and WHAT have no equivalent hook. WHERE's `storyInspirationBlock`
  (Site Concept/Adventure Seed buttons) are unconditional random
  generators, not selection-driven.
- **`domain/context.js`'s 17 `SHIFTS` reducers** — 8 are defined, tested,
  and not reachable from any UI control (listed under Status above).
  (`Change Location` specifically: WHERE's Focus text is edited directly,
  `data-ctx="where.summary"` — a separate code path that never calls
  `applyShift`, so the shift reducer that would log a location-change
  timeline event is simply never invoked.)
- **`campaign.oracles.usage`** (tracked on every real roll,
  `session.js`'s `rollOracle`) is read in exactly one place — a tie-break
  inside `buildStoryOptions`'s ranking (`docs/adr/0039` Phase 2). Nothing
  surfaces it as a stat, and `generateScene`'s own table picks don't read
  it at all.
- **Confirmed dead exports** (zero callers anywhere in `src/domain`,
  `src/ui`, or `tests`, checked by direct grep): `entities.js`'s
  `getFactionDossier` (a full faction-profile aggregator — member
  entities, governed locations, goal progress, allies/rivals, event
  history — already built and tested, never rendered),
  `relationshipCount`, `toggleEntityStatblockFieldAttribute` (a distinct,
  also-unwired sibling of the already-known-intentionally-unwired
  `statblocks.js` toggle functions CLAUDE.md's "Known non-issues"
  documents), `setEntityTags`; and `oracles.js`'s
  `oraclePathsWithAnyTag`.
- **`worldbuilding.js`'s three generators are already fully wired**
  (Creature Concept/Site Concept/Adventure Seed, each with a real button
  in the Journal drawer, and Site Concept/Adventure Seed also reachable
  from Co-Pilot) — confirmed not a gap, despite looking like an obvious
  one going in.

The dashboard's job is to turn the underused primitives above into one
coherent surface, not to invent new generation mechanics — everything
below composes existing, tested domain functions.

## Decision

**The Dashboard is the sole workspace view.** `ui/workspace/index.js`'s
`renderWorkspace(doc, ui)` has no `VIEWS` map and no `active` param — it
renders a header (location banner, Threat/Mystery/Stress/Resources/
Reputation dials, Activity select) followed by 5 collapsible sections
(one per former WHO/WHERE/WHAT/WHY/HOW tab, same toggle-button convention
`drawers/index.js`'s Bases of Influence uses; section open/closed state
is ephemeral, `ui.expandedDashboardSections`, default all open) and the
Narrative Composer in a sticky top-right column
(`.dashboard-composer-col`). The old concern that a dashboard grid has no
room for a full rich-text Journal editor, a deep entity inspector, or the
Oracle drawer's whole tree doesn't apply here — none of those were W-tab
content; they're tertiary-tier edge drawers, unaffected by this decision.
Clutter from folding five tabs' worth of content into one surface is
addressed by making each section collapsible.

**Narrative Composer.** `domain/copilot.js`'s `composeNarrativeDraft(campaign,
{ selectedOptionIds })` generalizes `recomposeSceneText`'s live-recompose
pattern and `buildSessionRecap`'s multi-signal-assembly pattern into one
reusable composer: WHERE's current location(s), WHO's in-scene entities
(read from the raw Focus text directly — `gatherSceneContext`'s
`whoSummary`/`whereSummary` fields — not re-derived through a synthetic
sentence), WHAT's situation, whichever Story Option(s) are checked
(`selectedOptionIds`, a `selectedStoryOptionIds` ephemeral Set in
shell.js), and WHY's objective, joined into one paragraph. Returns the
raw `@[Name]`/`**bold**` markup verbatim — no stripping — since that's
exactly what both consumers expect: `buildMentionEditorHTML` (real
mention badges in the preview) and `addNote` (auto-links `@[Name]` on
save, same as every other Journal entry). It's a **read-only** live
preview (rendered via `buildMentionEditorHTML`), not a real
`contenteditable` field — `composeNarrativeDraft` recomputes fresh on
every render (same as `buildStoryOptions`), so a live editable field
showing its output would have any hand-edit silently clobbered by the
next unrelated re-render (ticking a different checkbox, editing a WHO
field elsewhere). "📋 Copy" and "＋ Send to Journal" let the GM commit the
draft explicitly; hand-polishing happens after Send, in the Journal note
itself (a real, fully-editable field) — still satisfies Article II (the
GM has final say), one step later than composing it live would.

**Co-Pilot is the decision sandbox.** Every suggestion-generating control
lives in `ui/copilotPanel.js`: the full Story Options list with
selection checkboxes, both Suggestion Lens pickers (blind "What Happens
Next?" and scene-weighted "Suggest a Lens"), the Site Concept/Adventure
Seed generators, the Activity → Rules Lens suggestion, "▶ Continue
Story," and the 6 `WHAT_ACTIONS` shift chips. Every control keeps its
original `data-*` attribute/handler — shell.js's delegated handlers don't
care which DOM location triggered them, so this was markup relocation,
not new wiring.

**Supporting changes:**
- `ui/shell.js`: no `<nav class="mc-strip">` element and no
  `[data-question]` click handler — there's nothing to switch between.
  The Faction-Events-docked-in-WHERE jump and Ctrl+Left/Right target
  `expandedDashboardSections` (ephemeral, not persisted).
- `domain/copilot.js`'s `advise()` has no `active`-based
  `suggestedOraclePath` branches — the dial-based fallback chain (threat/
  stress/resources/mystery/default) is the only path.
- `schema.js`'s `context.active` field is left in the schema, unused
  (harmless — same treatment as the already-noted "largely vestigial
  `context.who.entityIds`"; no migration needed, old saves load fine).
- `styles/cockpit.css`: no `.mc-strip`/`.mc-q`/`.mc-q-dashboard` rules;
  `.dashboard-grid` is left = wide (the 5 sections), right = narrow (the
  sticky Composer).

**Dead-export housekeeping (open decision point):**
- **`getFactionDossier`** — the one orphan worth wiring up: a "📋 View
  Dossier" button on the Faction card, rendering what's already
  aggregated (member entities, governed locations, goal progress,
  allies/rivals, event history) instead of leaving it built-and-unused.
- **`relationshipCount`, `toggleEntityStatblockFieldAttribute`
  (entities.js layer), `setEntityTags`, `oraclePathsWithAnyTag`** — no
  clear use surfaced by this audit. Recommendation: remove them
  (CLAUDE.md's own "if you're certain something is unused, delete it"
  guidance) rather than build UI for something nobody asked for.

## Alternatives Considered

See `docs/archive/adr/0040-story-dashboard.md` (strengthening the
existing strip/Co-Pilot instead of merging tabs, a literal step-by-step
wizard, a mechanized session-composition ratio, an earlier
narrower/additive dashboard shape, and an earlier oracle-tailored-
dropdowns sketch now superseded by ADR 0041's 13d were each considered
and either rejected or superseded).

## Consequences

- Every reused function (`locationSummaryHeader`, `locationFactionsBlock`,
  `locationConflictsBlock`, `buildStoryOptions`, `drawSuggestionLenses`)
  is called exactly as it already was elsewhere — the dashboard composes
  existing, tested domain functions rather than introducing new ones,
  apart from `composeNarrativeDraft` itself.
- This ADR is the recorded exception to Article X for the workspace
  surface — `CLAUDE.md` says so directly, per this repo's "no two docs
  get to disagree" discipline.
- Verified via 450 domain tests (including `gatherSceneContext`'s
  `whoSummary`/`whereSummary` fields and a regression test asserting free
  Focus prose beyond an `@mention` reaches the composed draft) plus a
  direct Node smoke test of `renderWorkspace(doc, ui)`/`renderCopilot(doc,
  ui)` against both a bare and a populated campaign, confirming: all 5
  accordion sections render and toggle, the Composer contains raw
  WHO/WHERE Focus prose verbatim, Co-Pilot's full Story Options list
  renders with working checkboxes, and a checked option's text flows into
  the Composer (no browser automation available in this environment — the
  same "exercise the pure render function directly" substitute used
  elsewhere). `node scripts/build.js` stays clean.

## Related packs / ADRs

`docs/adr/0009-situation-engine-revisited.md` (Suggestion Lenses, the
"surface fear/need on Negotiate" idea Story Options realized),
`docs/adr/0039-reference-library-release-hosting-and-story-options.md`
(Story Options, `gatherSceneContext`, `dismissedStoryOptionIds` — the
direct precedent this ADR extends), `docs/adr/0041-scene-operating-
model.md` (13d is the authority for oracle-tailored dropdowns beyond what
this ADR built), pack 50's Article X (superseded for the workspace
surface by this ADR).
