# ADR 0040 — Story Dashboard (Phase 12)

## Status

**12a/12b implemented 2026-07-15 (same day as this ADR); 12f (full
consolidation — the 5 W tabs retired, Co-Pilot becomes the decision
sandbox, and the Focus-text bug fixed) implemented 2026-07-15/16,
superseding 12a's "additive, not a replacement" framing below — see 12f's
own section, and CLAUDE.md's "no two docs get to disagree" rule (the
later decision wins outright).** 12c (oracle-tailored dropdowns beyond
WHY) is **superseded by `docs/adr/0041-scene-operating-model.md`'s 13d**
(2026-07-16 — Phase 13, a much larger follow-up roadmap; see 0041 for
what's actually built vs. still proposed there). 12e (dead-export
housekeeping) remains proposed, not built. 12d (SHIFTS reachability gap)
is partially done — 12f relocated the 6 `WHAT_ACTIONS` chips into
Co-Pilot's Quick Apply, but the 8 *other* orphaned reducers named below
are still not surfaced anywhere.

Original request:
the 5-W workspace "is still missing a comprehensive and interactive
narrative-building GM guide that offers/suggests oracles and directive
story options while allowing the GM to adjust the options on the fly."
Four concrete directions were floated: consolidate the 5-W tabs into one
dashboard; randomly-generated scene-development steps; dropdowns that
surface tailored oracle suggestions; composing dropdown/textbox
selections into narrative prose, previewed and pasteable into the
Journal.

**This ADR records a deliberate exception to Article X** ("the workspace
changes, not the application" — one W-question at a time, the app's
governing UX principle since Phase 0). Asked directly whether to design
around that principle (strengthening the existing always-visible strip/
Co-Pilot instead of merging tabs) or genuinely reverse it, the answer was
explicit: **design a real merged dashboard**, despite the reversal. Per
this repo's own "no two docs get to disagree" rule (CLAUDE.md), that
makes this ADR the authority on the question going forward — a future
session should not flag the new `dashboard` view as contradicting Article
X once it's built; this decision supersedes that principle for this one
surface. Article X still governs the five individual W-tabs, which stay
exactly as they are — the dashboard is additive, not a replacement (see
Alternatives).

## Context

A full audit of `src/domain/*.js` against `src/ui/**/*.js` (grepping
every export for a UI caller) found the exact primitives this dashboard
needs already exist, several of them built and proven but scoped far
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
  `data/activities.js`'s `suggestRulesLens(activityId)` (HOW tab's
  `Activity` dropdown only) and this session's own Story Options/
  weighted-lens-draw (WHY tab only, `docs/adr/0039`). WHO and WHAT have
  no equivalent hook at all. WHERE's `storyInspirationBlock` (Site
  Concept/Adventure Seed buttons) are unconditional random generators,
  not selection-driven.
- **`domain/context.js`'s 17 `SHIFTS` reducers** — 8 are defined,
  tested, and completely unreachable from any UI control: `Deepen
  Mystery`, `Resolve Mystery`, `Gain Resources`, `Spend Resources`,
  `Raise Reputation`, `Lower Reputation`, `Raise Stress`, `Change
  Location`. (`Change Location` specifically: WHERE's Focus text is
  edited directly, `data-ctx="where.summary"` — a separate code path
  that never calls `applyShift`, so the shift reducer that would log a
  location-change timeline event is simply never invoked.)
- **`campaign.oracles.usage`** (tracked on every real roll,
  `session.js`'s `rollOracle`) is read in exactly one place — a tie-break
  inside `buildStoryOptions`'s ranking (`docs/adr/0039` Phase 2). Nothing
  surfaces it as a stat, and `generateScene`'s own table picks don't read
  it at all.
- **Five confirmed dead exports** (zero callers anywhere in `src/domain`,
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
  in the Journal drawer, and Site Concept/Adventure Seed also on WHERE) —
  confirmed NOT a gap, despite looking like an obvious one going in.

The dashboard's job is to turn the underused primitives above into one
coherent surface, not to invent new generation mechanics — everything
below composes existing, tested domain functions.

## Decision

### 12a — New `dashboard` view — **Implemented, then superseded by 12f**

*(Historical record of what 12a originally shipped as, 2026-07-15 — see
12f below for the current shape; kept here rather than rewritten in place
per this repo's "say so explicitly, don't silently overwrite" doc
discipline.)*

A 6th entry in `ui/workspace/index.js`'s `VIEWS` map, alongside `who`/
`where`/`what`/`why`/`how`, additive not a replacement — the five
focused tabs are byte-for-byte unchanged. **Deliberately not added to
`schema.js`'s `CONTEXT_QUESTIONS`** (considered, then rejected mid-
implementation): that array's own doc comment calls it "the canonical
WHO/WHERE/WHAT/WHY/HOW context — a first-class stored model," and
Dashboard has no persisted `context.dashboard` sub-object of its own —
it's a view mode reading the other 5, not a 6th question. Instead the
strip (`ui/shell.js`'s `render()`) appends one more `[data-question]`
button after the `CONTEXT_QUESTIONS.map(...)` loop, reusing the exact
same generic click handler with zero changes (it already just sets
`context.active` to whatever string) — Ctrl+Left/Right cycling
deliberately still only cycles the 5 real questions, unchanged; Dashboard
is a direct click for now. Did not change the default landing tab
(`context.active` still defaults to `'what'`) — a separate, easy call for
later if wanted.

**12f note**: every claim in the rest of this sub-section (the strip, the
five separate tabs, `context.active`-based routing) no longer describes
current behavior — the strip is gone and `context.active` is unused. This
paragraph is left as-is intentionally, as a record of the original,
lower-risk shape this shipped as before the direct follow-up request to
go further.

Layout, implemented as a header row + 2-column grid (simplified from the
original 3-column + bottom sketch above, since WHO/WHERE's digests read
naturally as one column rather than needing their own):
- **Header**: `currentLocationBanner`, WHAT's Threat/Mystery/Stress
  dials (the exact same `data-ctx-num` inputs WHAT's own tab uses — still
  directly editable here, zero new wiring), HOW's Activity `<select>`
  (same `data-ctx` select).
- **Left column**: `whoEntityPicker`, `locationFactionsBlock`,
  `locationConflictsBlock`, `nearbyLocationsBlock` — all reused verbatim.
- **Right column**: `storyOptionsBlock` in a new `selectable` mode (a
  checkbox per row, `limit: 10` instead of WHY's default 6) + the
  Narrative Composer (12b).

Every piece is a reused render function except `storyOptionsBlock`'s new
`selectable` param and the Composer itself — confirmed via a direct
Node smoke test (no browser needed, these are pure string-returning
functions): both a bare `defaultCampaign()` and a populated one render
without throwing, with every expected element present.

### 12b — Narrative Composer — **Implemented, with one deliberate
deviation from this ADR's original sketch**

New `domain/copilot.js` export, `composeNarrativeDraft(campaign,
{ selectedOptionIds })`, generalizing `recomposeSceneText`'s live-
recompose pattern and `buildSessionRecap`'s multi-signal-assembly pattern
into one reusable composer: WHERE's current location(s), WHO's in-scene
entities, WHAT's situation, whichever Story Option(s) are checked
(`selectedOptionIds` — new `selectedStoryOptionIds` ephemeral Set,
shell.js, same shape as `docs/adr/0039`'s `dismissedStoryOptionIds` but a
distinct concept: "include in the draft," not "used/not interested"),
and WHY's objective, joined into one paragraph. Returns the raw
`@[Name]`/`**bold**` markup verbatim — no stripping — since that's
exactly what both consumers already expect: `buildMentionEditorHTML`
(real mention badges in the preview) and `addNote` (auto-links `@[Name]`
on save, same as every other Journal entry); entity references are
re-wrapped in `@[Name]` on the way out so a name mentioned in WHO/WHERE's
own Focus text stays a real, clickable mention in the composed draft too.

**Deviation, found during implementation**: this ADR's original sketch
called for an *editable* mention-editor field. Building it surfaced a
real conflict — `composeNarrativeDraft` is recomputed fresh on every
render (same as `buildStoryOptions`), so a live `contenteditable` field
showing its output would have any hand-edit silently clobbered by the
next unrelated re-render (ticking a different checkbox, editing a WHO
field elsewhere). Shipped instead as a **read-only** live preview
(rendered via `buildMentionEditorHTML`, not a real `contenteditable`)
with "📋 Copy" and "＋ Send to Journal" — hand-polishing happens after
Send, in the Journal note itself (already a real, fully-editable field),
which still satisfies Article II (the GM has final say), just one step
later than the original sketch assumed.

### 12c — Oracle-tailored dropdowns beyond WHY — **superseded by `docs/adr/0041-scene-operating-model.md`'s 13d**

*(Left as historical record of the original sketch, per this repo's "say
so explicitly, don't silently overwrite" doc discipline — ADR 0041's 13d
is now the authority on this specific piece of work; don't build both.)*

Extends the two existing "selection → tailored oracle" hooks with the
same static-lookup-table architecture `GAMEPLAY_AREAS`/
`LENS_ORACLE_CATEGORIES` already use (data, not a new mechanism):
- WHAT's `Intent` dropdown (`Discovery`/`Travel`/`Social encounter`/...)
  gains an Intent → Oracle-category lookup, the same shape as
  `suggestRulesLens`'s Activity → provider lookup.
- The dashboard's own WHO/WHERE selections feed into the SAME
  `sceneContext`-weighted lens draw `docs/adr/0039` built for WHY
  (`drawSuggestionLenses`'s `sceneContext` param), just triggered from
  the dashboard instead of only WHY.

Changing a dropdown should visibly change which Oracle table gets
suggested next, closing the literal "dropdown selections that display
suggested oracles tailored to the selections" ask.

### 12d — Close the SHIFTS reachability gap

Surface the 8 orphaned reducers (`Deepen Mystery`, `Resolve Mystery`,
`Gain Resources`, `Spend Resources`, `Raise Reputation`, `Lower
Reputation`, `Raise Stress`, `Change Location`) as dashboard quick-action
chips, mirroring the existing `WHAT_ACTIONS` chip row exactly.
`context.js`'s `applyShift` already handles all 17 reducers uniformly —
this is a pure UI gap, zero domain changes needed.

### 12e — Dead-export housekeeping (decision point, not auto-resolved)

- **`getFactionDossier`** — the one orphan worth wiring up: a "📋 View
  Dossier" button on the Faction card, rendering what's already
  aggregated (member entities, governed locations, goal progress,
  allies/rivals, event history) instead of leaving it built-and-unused.
- **`relationshipCount`, `toggleEntityStatblockFieldAttribute`
  (entities.js layer), `setEntityTags`, `oraclePathsWithAnyTag`** — no
  clear use surfaced by this audit. Recommendation: remove them
  (CLAUDE.md's own "if you're certain something is unused, delete it"
  guidance) rather than build UI for something nobody asked for — but
  named explicitly here so a future pass doesn't have to re-derive that
  they're dead before deciding.

### 12f — Full consolidation: tabs retired, Co-Pilot becomes the decision sandbox, Focus-text bug fixed — **Implemented**

Direct follow-up feedback, two parts:

1. **Bug**: Story Options/the Narrative Composer weren't reflecting what
   was actually typed into WHO/WHERE's own Focus fields. Root cause:
   `gatherSceneContext`/`composeNarrativeDraft` only ever read parsed
   `@mentions` and specific structured entity fields
   (`faction.agenda`/`.fear`/`.need`, `npc.currentGoal`) out of Focus
   text — never the surrounding free prose. `composeNarrativeDraft`
   specifically synthesized its own generic sentences ("The scene is set
   at X.", "Y is present.") instead of using what the GM wrote. Fixed:
   `gatherSceneContext` now also returns `whoSummary`/`whereSummary` (the
   raw trimmed Focus text), and `composeNarrativeDraft` uses those
   directly instead of re-deriving a synthetic sentence — a strict
   simplification, not just a fix, since the entity list a synthetic
   sentence would summarize was itself always parsed from this same text.
2. **Design**: asked directly whether the 5 individual W tabs should stay
   alongside the Dashboard (12a's original "additive, not a replacement"
   framing) now that WHO/WHERE/WHAT/WHY/HOW's full editable content was
   being folded into open/collapsible Dashboard sections — answer:
   **retire them entirely**, and fold all suggestion/oracle-generating
   logic into the always-visible Co-Pilot panel as "an active decision
   sandbox." This is a genuine reversal of 12a's own decision, recorded
   here rather than silently overwritten (12a's section above is kept as
   historical record).

**What changed:**
- `ui/workspace/index.js`'s `VIEWS` map and the `who`/`where`/`what`/
  `why`/`how` top-level views are gone. `renderWorkspace(doc, ui)` (the
  `active` param dropped — there's only one view now) renders a single
  Story Dashboard: a header (location banner, Threat/Mystery/Stress/
  Resources/Reputation dials, Activity select) + 5 collapsible sections
  (one per former tab, same toggle-button convention `drawers/index.js`'s
  Bases of Influence already established) + the Narrative Composer,
  **moved to the workspace's top-right** (`.dashboard-composer-col`,
  `position: sticky`, direct request) instead of the bottom of a column.
  Section open/closed state is ephemeral (`ui.expandedDashboardSections`,
  default all open).
- `ui/copilotPanel.js` absorbs every suggestion-generating control that
  used to live on a W tab: the full (not condensed-to-3) Story Options
  list with its selection checkboxes, both Suggestion Lens pickers (blind
  "What Happens Next?" and scene-weighted "Suggest a Lens"), the Site
  Concept/Adventure Seed generators, the Activity → Rules Lens suggestion,
  "▶ Continue Story," and the 6 `WHAT_ACTIONS` shift chips. Every
  relocated control keeps its exact original `data-*` attribute/handler —
  this was a markup relocation, not new wiring, since shell.js's delegated
  handlers never cared which DOM location triggered them.
- `ui/shell.js`: the `<nav class="mc-strip">` element, its `render()`-time
  population, and the `[data-question]` click handler are deleted (nothing
  emits that attribute anymore). The Faction-Events-docked-in-WHERE jump
  and Ctrl+Left/Right (formerly both `context.active`-based) now target
  `expandedDashboardSections` instead — ephemeral, not persisted, since
  there's no longer a single "active tab" concept to store.
- `domain/copilot.js`'s `advise()` drops its `active === 'who'|'where'|
  'why'`-based `suggestedOraclePath` branches — with no "currently active
  W," the existing dial-based fallback chain (already the general-purpose
  default) is now the only path.
- `schema.js`'s `context.active` field is left untouched (harmless, now
  unused, same treatment as the already-noted "largely vestigial
  `context.who.entityIds`") — no migration needed, old saves load fine.
- `styles/cockpit.css`: the `.mc-strip`/`.mc-q`/`.mc-q-dashboard` rules
  and their responsive breakpoints are removed; the `.cockpit` grid's
  "strip" row/area is gone (breadcrumb now spans full width in that row);
  `.dashboard-grid`'s column ratio flips (left = wide, the 5 sections;
  right = narrow, the sticky Composer).

## Alternatives considered

See `docs/archive/adr/0040-story-dashboard.md` for two genuinely rejected
alternatives (strengthening the existing strip/Co-Pilot instead of
merging tabs; a literal step-by-step wizard) and a confirmed-still-
declined older item (a mechanized session-composition ratio). One more
alternative is kept here rather than in the companion, since it documents
current architecture's own history, not a rejected path:

- **Replace the five W-tabs with the dashboard entirely.** Originally
  rejected at 12a time — a dashboard grid has no room for a full rich-text
  Journal note editor, a deep entity inspector, or the Oracle drawer's
  whole tree without becoming unusable clutter. **Reconsidered and done
  anyway at 12f**, per direct follow-up request: the concern about clutter
  is addressed by making each W's content collapsible (open/closed per
  section) rather than by keeping a separate tab per W — the Journal,
  Entity Editor, and Oracle drawer were never W-tab content in the first
  place (they're tertiary-tier edge drawers, untouched by this decision)
  so the original worry doesn't actually apply to them.

## Consequences

- Nothing in 12a–12e changes existing behavior on WHO/WHERE/WHAT/WHY/HOW
  — every reused function (`locationSummaryHeader`, `locationFactionsBlock`,
  `locationConflictsBlock`, `buildStoryOptions`, `recomposeSceneText`-
  style composition, `drawSuggestionLenses`) is called exactly as it
  already is; the dashboard is a new consumer, not a modified producer.
- `composeNarrativeDraft` (12b) is the one genuinely new domain function
  in this roadmap; everything else in 12a–12d is either pure UI
  composition of existing render functions or small, mechanical wiring
  (12d) / lookup-table data (12c).
- This ADR is the recorded exception to Article X for the `dashboard`
  view specifically — CLAUDE.md is updated alongside this ADR to say so,
  per this repo's "no two docs get to disagree" discipline.
- 12a/12b landed the same day as this ADR; 12f landed the next day,
  reversing 12a's "additive" framing as described above — verified via
  442 domain tests (3 new: `gatherSceneContext`'s `whoSummary`/
  `whereSummary` fields, and a dedicated regression test asserting free
  Focus prose beyond an `@mention` reaches the composed draft — the exact
  bug being fixed) plus a direct Node smoke test of the new
  `renderWorkspace(doc, ui)`/`renderCopilot(doc, ui)` signatures against
  both a bare and a populated campaign, confirming: all 5 accordion
  sections render and toggle, the Composer contains raw WHO/WHERE Focus
  prose verbatim, Co-Pilot's full Story Options list renders with working
  checkboxes, and a checked option's text flows into the Composer (no
  browser automation available in this environment, same limitation noted
  throughout this session — this is the same "exercise the pure render
  function directly" substitute used elsewhere). `node scripts/build.js`
  stays clean (77 modules). 12c/12e remain roadmap only; 12d is partially
  done (see Status).

## Related packs / ADRs

`docs/adr/0009-situation-engine-revisited.md` (Suggestion Lenses, the
deferred "surface fear/need on Negotiate" idea Story Options already
realized), `docs/adr/0039-reference-library-release-hosting-and-story-
options.md` (Story Options, `gatherSceneContext`, `dismissedStoryOptionIds`
— the direct precedent 12a–12c extend), pack 50's Article X (superseded
for the `dashboard` view only, by this ADR).
