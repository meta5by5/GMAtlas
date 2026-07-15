# ADR 0039 — Reference Library Release hosting, and WHY's Story Options

## Status

Accepted and implemented (code side). Two direct requests, landed together
because both were asked for in the same session and both close out
previously-deferred gaps:

**Part A**: "I need to restructure the Github repo to move the files in LFS
to GitHub Releases. LFS used up all available 10GB bandwidth." Diagnosed
first: `.github/workflows/deploy-pages.yml` checked out with `lfs: true`
on every push to `main`, pulling the full ~469MB of `assets/docs/*.pdf`
every single run — that's what exhausted the quota, not anything about the
PDFs themselves. I have no `gh` CLI or GitHub token in this environment, so
the actual Release creation/upload is a manual step the user still has to
do (walkthrough at the bottom) — this ADR covers the code side, which is
complete and safe to land before that happens.

**Part B**: "The 5-W's workspace is still missing a comprehensive and
interactive GM guide... intuitive oracle suggestions, cumulative
option-building based on who is involved, where they are located." WHO and
WHERE both got real upgrades earlier this session (entity pickers,
region-aware presence, a Location Story digest); WHY still had just a
free-text field, Threads, and Foreshadowing. Investigation found the
building blocks already existed but nothing combined them: `copilot.js`'s
`advise()` is a single first-match-wins priority chain over WHAT's own
dials, never reading entity data, Foreshadowing, or World Flags, and never
combining signals — not "cumulative." Suggestion Lenses (ADR 0009) are the
closest existing precedent for "intuitive oracle suggestions," but the
lens→oracle-category mapping is static and the initial draw is pure-random;
that ADR explicitly named "surface a faction's fear/need when Activity is
Negotiate" as a deferred idea, never built.

## Decision — Part A: Reference Library PDFs move to a GitHub Release

The "which URL serves this PDF" decision moves to **build time, per
machine**, with no change needed to any consumer of a manifest entry's
fetch target beyond reading a new field:

- New, **committed** `src/data/referenceLibraryManifest.js` — the
  permanent catalog of all 29 known PDFs (`file`/`title`/`ext`/
  `sizeBytes`/`releaseAsset`), unlike the existing gitignored, build-
  generated `src/data/docsManifest.js`. `file` stays the stable identity
  every campaign's `refOverrides`/tab-keys are keyed by (unchanged from
  before this ADR — never repoint it at a URL, or a saved title/tag
  override silently orphans).
- New `src/data/releaseConfig.js` — `REFERENCE_LIBRARY_RELEASE_TAG =
  'reference-library-v1'` and `releaseAssetUrl(filename)` (URL-encodes
  each segment; several filenames have spaces/parens).
- `scripts/build.js` rework: for each catalog entry, a new `isRealFile()`
  check (exists on disk AND isn't a Git LFS pointer-stub text file — reads
  the first ~40 bytes, rejects the standard `version https://git-lfs.
  github.com/spec/v1` signature) decides a NEW `src` field — the local
  relative path when real bytes are present (today's exact behavior, live
  `statSync` size), or `releaseAssetUrl(...)` otherwise (using the
  catalog's cached size). An extra local-only file not yet in the catalog
  is still picked up via a live directory scan (unchanged "drop a PDF in,
  rebuild, it shows up" convenience), just without a Release fallback
  until the catalog is updated for it.
- **Three call sites updated** to read the new `src` field instead of
  reusing `file` as the fetch target (`file`/`key` themselves are
  untouched everywhere): `documents.js`'s `resolveDocumentTab()` (the
  in-app iframe viewer), `ui/mechanicsScan.js` and `ui/tocScan.js` (PDF.js
  `getDocument()` calls) — both already guarded on `location.protocol ===
  'file:'` before attempting a scan; that guard is unchanged, still
  requires `npm run serve` either way, but the iframe viewer now works
  over a plain `file://` double-click even for a Release-hosted PDF
  (better than before, since iframe navigation to a remote origin doesn't
  need CORS the way a script-initiated fetch does).
- `deploy-pages.yml`: dropped `lfs: true` from checkout (CI now gets LFS
  pointer stubs at `assets/docs/*.pdf`, which `isRealFile()` correctly
  treats as absent → Release URL — this is the actual bandwidth fix).
  `assets/docs/` is no longer copied into the deployed `_site/` (dead
  weight once nothing points at a local copy there). The old "curl a local
  PDF path, expect `%PDF`" verification step now curls a real
  `releaseAssetUrl(...)` instead — soft-fails (a `::warning`, not a build-
  breaking error) until the Release actually exists, so an incomplete
  migration can't block every future deploy; tighten to a hard failure
  once the walkthrough below is done.
- **`.gitattributes`/git history untouched on purpose** — no `git rm`, no
  `git lfs migrate`, no force-push. The already-committed PDF blobs stay
  in history (a static storage cost, not a recurring bandwidth one); this
  alone fixes the bandwidth drain, since CI stops re-pulling them on every
  push. A storage-reclaiming history rewrite is a separate, genuinely
  destructive step, not recommended here, and not done.

### What still needs a human (I have no `gh` CLI or token here)

1. Create the release: `gh release create reference-library-v1 --title
   "Reference Library v1" --notes "PDF rulebooks hosted here instead of
   Git LFS — see docs/adr/0039."`
2. Upload all 29 PDFs: `gh release upload reference-library-v1
   assets/docs/*.pdf` (or the same via the web UI at
   `https://github.com/meta5by5/GMAtlas/releases/new` for anyone without
   `gh` set up).
3. Confirm one resolves: `curl -sfL "https://github.com/meta5by5/GMAtlas/
   releases/download/reference-library-v1/Hostile%20setting.pdf" | head -c4`
   should print `%PDF`.
4. Tell me it's live so the deploy workflow's soft warning can be
   tightened back to a hard failure.

## Decision — Part B: Story Options (WHY tab)

**`domain/copilot.js` gains two new pure, exported functions**, additive —
`advise()` itself is untouched, still backs the existing Co-Pilot panel:

- **`gatherSceneContext(campaign)`** — one read-only snapshot of what's
  actually in play, built entirely from EXISTING queries: `whoEntities`
  (NPCs/Factions @mentioned in WHO's Focus — `findMentions`, the same
  mechanism `getCurrentWhereLocations` already uses for WHERE, generalized
  to npc/faction types instead of location — deliberately NOT
  `context.who.entityIds`, confirmed largely vestigial since the WHO/WHERE
  redesign earlier this session moved the live "who/where is in the
  scene" source of truth to @mention-parsing), `whereLocations`
  (`getCurrentWhereLocations`), `factionsHere` (`factionsPresentAt`),
  `conflictsHere` (the same `locationId` match `locationConflictsBlock`
  already does), `openThreads`, `foreshadowing`, `worldFlags` (first time
  read outside the WHAT tab's own UI), `activity`, and the WHAT dials.
- **`buildStoryOptions(campaign, { limit = 6 })`** — turns that snapshot
  into a RANKED array of `{id, label, detail, source, entityId?,
  oracleGroup, oracleTable}`. Genuinely cumulative: a scene with an
  agenda-bearing faction present, an open Conflict here, AND an unpaid
  Foreshadowing plant gets three distinct options in the SAME call, not
  just the single highest-priority one `advise()` would pick. Every
  option names a real, already-used Oracle table (`data/tables.js` — the
  same groups Suggestion Lenses/Faction Conflict/Scene generation already
  draw from) so a GM can roll for inspiration on that specific angle — the
  UI does the actual rolling (`session.js`'s existing `rollOracle`), never
  this function. Weighted, not randomized: `activity === 'negotiate'`
  boosts an in-scene faction's fear/need option above its agenda option —
  ADR 0009's deferred idea, finally built, generalized to every in-scene
  faction rather than a single hardcoded one.
- **`drawSuggestionLenses` gains an opt-in `sceneContext` param**
  (`session.js`) — omitted (the existing WHAT-tab "What Happens Next?"
  call site), the draw is exactly as pure-random as it always was;
  supplied, a `boostedLensIdsFor()` lookup gives matching lens ids extra
  tickets in the sampling pool (still drawn without replacement). Proven
  correct via a 40-seed frequency test, not wired to a new UI trigger this
  session (see Phase 2 below) — kept because it was cheap, tested, and
  matches the shape the plan already committed to; not worth a second ADR
  round just to skip it.

**WHY tab** (`workspace/index.js`):
- New `whyEntityPicker` — the identical tag-listbox → select-to-mention
  pattern WHO/WHERE already use (`candidateListbox`, already generalized
  earlier this session), pooling NPCs/Factions/Conflicts. WHY had ZERO
  entity-selection UI before this (unlike WHO/WHERE) — the direct
  complaint this closes.
- New `storyOptionsBlock` — renders `buildStoryOptions()`'s ranked list as
  rows (label, detail, a 🔮 that rolls the linked table via the existing
  `rollOracle`, a "＋ Journal" that recomputes the option list — safe,
  since it's deterministic given current campaign state — and drops the
  chosen option's text into the session log via the existing `addNote`).
  Nothing here is ever applied automatically (Article II).

## Alternatives considered

- **Part A: a runtime fallback (try local, catch a failed fetch, retry the
  Release URL).** Rejected — the build-time decision is simpler, requires
  zero new runtime error-handling paths in three different consumers, and
  produces an accurate `docsManifest.js` a GM can inspect directly if
  something looks wrong.
- **Part A: overload `file` itself to sometimes be a URL.** Rejected after
  catching it mid-implementation — `refOverrides` and `data-doc-open="ref:
  ${key}"` tab keys are keyed by `file`; repointing it at a URL would
  silently orphan a campaign's saved title/tag override for that PDF the
  moment its local copy went missing. Kept `file` as pure identity, added
  `src` as the resolved fetch target instead.
- **Part A: a full LFS history rewrite to reclaim storage quota.**
  Rejected for now — destructive (force-push, rewritten SHAs), not needed
  to fix the actual reported problem (bandwidth, not storage), and
  reversible-fix-first is the safer default. Named as a possible separate
  future step, not scheduled.
- **Part B: a bring-your-own-PDF flow for non-owner visitors.** Considered
  earlier in the session, superseded by direct confirmation of the
  Release-hosted-but-low-key model — every visitor's Reference Library
  now resolves the same way, owner or not.
- **Part B: folding Story Options into `advise()` itself** (one bigger
  function instead of two new ones). Rejected — `advise()`'s single-
  observation shape is already wired to the Co-Pilot panel UI; changing
  its return shape would be a breaking change to that UI for no reason,
  when a second, additive function serves the actually-different "give me
  several ranked options" need cleanly.
- **Part B: a WHAT-tab or Co-Pilot-panel version of the same list in this
  same pass.** Deferred (Phase 2 below) — the direct complaint was
  specifically about WHY.

## Phase 2/3

**Done, same-day follow-up**: `drawSuggestionLenses`'s `sceneContext` param
is now wired to a real trigger — WHY gained its own "🎭 Suggest a Lens"
button (`whyLensSuggestBlock`, workspace/index.js), a second entry point
into the exact same lens-picker → `suggestNextWithLens` flow WHAT's
"What Happens Next?" already offers, just drawn with
`gatherSceneContext(campaign)` so a Conflict/faction/Negotiate-activity
currently in play gets matching lenses better odds — never a guarantee,
still a random draw, just no longer context-blind. `lensPickerHtml`
(workspace/index.js) was generalized to take `(open, draw, {intro})` as
plain params instead of always reading `ui.lensPickerOpen`/`ui.lensDraw`,
so both WHAT's and WHY's pickers reuse identical rendering with separate
ephemeral state (`whyLensPickerOpen`/`whyLensDraw`, shell.js) — picking a
lens closes whichever one was open and always calls the same, completely
unchanged `suggestNextWithLens`. WHAT's own "What Happens Next?" button
is untouched — same pure-random draw as always.

`buildStoryOptions` now also reads `campaign.oracles.usage` (already
tracked on every real roll via `session.js`'s `rollOracle`, previously
read by nothing at all — its own write-site comment says "drives Co-Pilot
suggestions later," this is that later) as a tie-break, not a ranking
override: two options with the exact same `weight` (e.g. a non-negotiating
faction's agenda and an open World Flag, both weight 5) now sort with the
one whose `oracleGroup` the GM rolls from more often ranked first. Never
outranks a higher-weighted option — Negotiate's fear/need-over-agenda
boost is completely unaffected by usage either way.

The Co-Pilot panel (`copilotPanel.js`, an always-visible `<aside>`, not
tab-scoped) gained a condensed "Story Options" card — the top 3 of the
same `buildStoryOptions()` list WHY shows in full, so a GM working any
tab sees the cumulative suggestion without switching to WHY. Reuses WHY's
own `data-story-option-roll`/`-journal` attributes verbatim — shell.js's
handlers already recompute `buildStoryOptions` and look an option up by
id, so they don't care which DOM location triggered them; zero new
wiring needed for this card, only a new render function
(`storyOptionsCard`) and ~5 lines of CSS.

**Not built this session**:
- Track which suggested options a GM actually used (accept/dismiss),
  mirroring the Conflict-escalation-suggestion dismissible-prompt pattern
  from ADR 0036, instead of the list being purely re-computed/stateless
  every render.

## Consequences

- A campaign that never touches any of Part B sees zero behavior change —
  every new block returns `''`/`[]` until there's something to show.
- Part A: any machine with the real PDFs on disk (a dev's own clone that's
  pulled LFS objects) is completely unaffected — `docsManifest.js` looks
  exactly as it did before this ADR. A machine without them (CI, a fresh
  clone) now gets a complete, correct Reference Library pointing at the
  Release instead of an incomplete/broken one.
- Verified: 7 new domain tests (440 total) — `releaseAssetUrl`'s encoding,
  `gatherSceneContext`'s shape (including the empty-campaign case),
  `buildStoryOptions`'s cumulative-ness/ranking/real-oracle-path
  invariant/limit/usage-tie-break, and `drawSuggestionLenses`'s weighting
  (a 40-seed frequency comparison) plus its exact-prior-behavior guarantee
  when unweighted. `node scripts/build.js` stays clean (77 modules). Part A was
  additionally proven end-to-end by hand: renamed a real PDF to simulate a
  missing file, wrote a synthetic LFS-pointer stub in its place, rebuilt,
  confirmed the manifest entry switched to the correct `releaseAssetUrl`
  with the catalog's cached size, then restored the real file and
  confirmed the manifest reverted exactly (same size, local path).
- I don't have a browser automation tool in this environment — Part B's
  UI is verified structurally (tests + build) only; a manual smoke pass
  in the running app (mention a faction in WHO, set a Location in WHERE,
  open the WHY tab, confirm Story Options lists it, click 🔮 and ＋
  Journal) is recommended before calling it fully done.

## Related packs / ADRs

`docs/adr/0007` (original Git LFS adoption for PDFs), `docs/adr/0014`
(PDF.js/`file://` constraints Part A's consumer-code changes had to
respect), `docs/adr/0009-situation-engine-revisited.md` (Suggestion
Lenses, and the specific deferred idea Part B finally builds),
`docs/adr/0038` (this session's earlier WHO/WHERE upgrade — the
@mention-parsing convention Part B's `gatherSceneContext` extends to WHY).
