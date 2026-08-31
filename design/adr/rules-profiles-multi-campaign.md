# ADR: Rules Profiles + Multi-Campaign

## Status

Accepted.

## Context

GMAtlas persisted exactly one campaign document — the app's non-negotiable
rule #1 (see the Design Constitution). Ruleset choices (Genre Pack, Stat
System, Trade Economy Model, Rules Constitution provider choices, Game
System Activation, Party headline fields) lived directly on that document's
`settings`, and no module was ever hidden based on which ruleset was active
— Colony, World Tracker, Trade, Battlemap, Graph, and Faction Events were
always visible regardless of what a GM's table actually used.

Direct request: let a GM (1) keep several campaigns and switch between
them, (2) define a reusable "Rules Profile" — which modules are visible,
what fills the Storyboard's three positions (Composer/Navigator/Advisor),
and the ruleset — and (3) assign one profile to each campaign, so e.g. a
5PFH: Planetfall table can hide Battlemap/Graph/Trade/Faction Events (rules
that ruleset doesn't use) and put Colony/World Tracker/Party where
Composer/Navigator/Advisor normally sit, without a second install or a
manually-maintained settings checklist every session.

## Decision

**Multi-campaign, via a small registry separate from any one campaign's
document.** `store.js` now keeps an `appConfig` record (which campaigns
exist, which Rules Profiles exist, which campaign is active) under its own
IndexedDB key, alongside each campaign's own document under a
`campaign:<id>` key (+ `campaignBackup:<id>`). `store.get()`/`store.update()`
keep their exact prior call shape — they always operate on the ACTIVE
campaign — so none of the ~100 existing call sites needed to change.

**Rules Profile fields are overlaid at `store.get()` time, not duplicated
per campaign.** The six ruleset fields move to living only on the profile
(`profile.ruleset`). Rather than rewrite every domain/UI call site that
reads `doc.settings.statRuleset` etc., `store.get()` returns the active
campaign doc with those six `settings` keys spliced in from the active
profile on every call — everything that only *reads* them needed zero
changes. `store.update()`'s mutator still clones the RAW, un-overlaid
internal doc, so profile values are never baked back into a persisted
campaign record. Only the Settings controls that *write* those six fields
changed, to a new `store.updateProfile(id, fn)` instead of `store.update(fn)`.

**Module visibility is gated once, at the navigation-list level.**
`GATEABLE_MODULES` (`colony`, `world-tracker`, `trade`, `battlemap`,
`graph`, `faction-events` — Party and everything else always stays visible)
each get a `moduleEnabled` flag on the profile. `shell.js` computes the
edge-nav and header-nav lists fresh each render from the active profile
(`isModuleVisible`), rather than the previous static `EDGE_ORDER`/
`HEADER_ORDER` arrays. `openDrawerTab()`/`renderDrawer()`'s dispatch both
refuse a disabled id too, as defense in depth against a stale `openDrawers`
entry surviving a profile switch.

**Storyboard positions are content ids, resolved through the profile, with
any module assignable — not a fixed menu of three.** A profile's
`storyboardPositions` maps each of the three SLOT names — `composer`/
`navigator`/`advisor` — to a CONTENT id: either the corresponding built-in
(`dashboard`/`narrative`/`copilot` respectively) or any other `DRAWERS` id
(Colony, Party, Trade, ...). **Content ids are a namespace deliberately
kept separate from the slot names** — an early version of this feature
reused the same three strings for both, which was a real reported bug: a
freed built-in's own top-nav button (`data-drawer-open="composer"`) set
`activeDrawer = 'composer'`, and resolution couldn't tell "the Composer
SLOT, look up whatever fills it" from "the built-in Composer CONTENT,
render it directly" — once a profile reassigned the slot elsewhere (5PFH's
Composer → Colony), clicking the freed button kept showing Colony instead
of the actual built-in. `domain/rulesProfiles.js`'s
`resolvePositionContentId(profile, slot)` is the single place this
resolves: a stored value equal to the slot's own name is treated as
legacy/unset (normalized to that slot's built-in, so data written before
this fix — e.g. `{composer: 'composer', ...}` — still renders correctly
with no migration step needed), any other value passes through unresolved.
`src/ui/shell.js`'s `renderPositionContent()` is the one dispatcher that
can reach all three content sources — `composerBodyHtml`/
`navigatorBodyHtml` (`workspace/index.js`), `renderCopilot`
(`copilotPanel.js`), and `renderDrawer` (`drawers/index.js`) — without
creating a circular import between those files; `workspace/index.js` and
`drawers/index.js` never import each other. Whichever built-in content
(`dashboard`/`narrative`/`copilot`) is NOT currently occupying its own
position surfaces in the top header nav instead — as itself, a resolved
content id, never re-resolved through a slot mapping — so it stays
reachable ("move the current three to the top navigation").

`DRAWERS`/`DRAWER_META`/`drawerMeta` (the id → glyph/label registry) moved
out of `shell.js` into a new `src/ui/drawerMeta.js`, since the Settings >
Ruleset Profile Editor tab (`drawers/index.js`) needs the same registry to
build its Storyboard-position `<select>`s and module-enable checkboxes,
and `drawers/index.js` importing it directly from `shell.js` would be
circular (`shell.js` already imports `renderDrawer`/`settings` from
`drawers/index.js`).

**Settings splits Campaigns from the Ruleset Profile Editor, and the
editor works on a draft, not instant-apply.** Direct follow-up request:
campaign management (list/switch/rename/create, and reassigning an
existing campaign to a different profile — `reassignCampaignProfile`,
appConfig-only, never touches that campaign's own document) lives in its
own **Campaigns** tab; every field a profile owns (ruleset, Rules
Constitution, Game System Activation, visible modules, Storyboard
positions) lives in **Ruleset Profile Editor**, which selects a profile
and edits it as a whole. Edits there mutate an in-memory draft
(`shell.js`'s `profileDrafts`, one per profile id touched this session —
switching which profile you're editing never discards another profile's
unsaved edits) rather than committing per field; "Save Profile"
(`applyProfileDraft`, via the existing `store.updateProfile`) applies it —
and, since a profile is shared state, every campaign using it updates live
— and "Discard Changes" reverts the form to the last-saved value. A
one-click "apply this suggestion" action elsewhere in the app (the
Advisor's Activity → Rules Lens recommender) still commits instantly, by
design — it's a decisive single action outside the editor form, not a
field in a multi-field draft.

**A real build regression, and its lesson.** `scripts/build.js`'s
regex-based classic-script bundler does not support `import { X as Y }`
aliasing (or `export { X as Y }`) — using it (to dodge a name collision
between an imported domain function and a same-named store.js method)
produced syntactically invalid JS in the built bundle, which failed to
parse at all (a blank page, no console-visible source error since the
`<script>` tag itself never executed). Fixed by renaming the colliding
function instead of aliasing the import. `node --check` on the actual
*built* bundle — not just the source files — is the check that catches
this class of bug; a source-only sanity pass (or an ESM-based smoke test
importing straight from `src/`, which works fine since real ESM supports
aliasing) does not.

**Migration seeds exactly two profiles.** A pre-existing single campaign
(or a brand-new install) is wrapped, once, into a "Default" profile
carrying whatever its current six ruleset fields already were (everything
enabled, matching today's always-visible behavior) and a "5PFH" profile
cloned from Default with `trade`/`battlemap`/`graph`/`faction-events`
disabled and Composer/Navigator/Advisor repointed to `colony`/
`world-tracker`/`party` — `migrate.js`'s pure
`wrapLegacyCampaignIntoAppConfig()`, called from `store.js`'s `load()`.

## Consequences

- **Constitution rules #1/#2 amended in place** (not layered as a second
  "valid" option) to describe "one active document among several stored"
  and the new key scheme.
- `store.newCampaign()`'s behavior changed: it used to replace the current
  campaign outright; it now registers an additional one and switches to
  it. The Settings "New Campaign" button/confirm dialog was replaced with a
  bespoke inline title + Rules Profile form.
- A Rules Profile is shared across every campaign that picks it — editing
  one (ruleset, module visibility, or Storyboard positions) changes it
  everywhere it's used, by design; it is not per-campaign-duplicated state.
- Importing a campaign JSON still replaces the ACTIVE campaign's document
  in place (unchanged from before) rather than creating a new campaign —
  switch to (or create) the target campaign first if that's the goal.
- An existing campaign's profile assignment can be changed at any time
  (`reassignCampaignProfile`/`store.setCampaignProfile`) — appConfig-only,
  never touches that campaign's own document, so its data is never at
  risk; a module the new profile hides simply becomes unreachable via nav
  (its data stays intact, just not currently shown) until re-enabled.
- A Ruleset Profile Editor edit is provisional until Saved — closing
  Settings, switching campaigns, or navigating elsewhere in the app does
  NOT discard an unsaved draft (it's kept per profile id, in memory, for
  the rest of the session); only "Discard Changes" or a successful "Save
  Profile" clears it.
