# Design-doc cleanup — code-verification / drift report

Per `docs/cleanup-07-21/design-docs-cleanup-prompt.md` §3. Scope: the
faction cluster (ADRs 0031/0032/0034/0035/0036/0038 and
`docs/design/LIVING-FACTION-ENGINE-CONSOLIDATED-DESIGN.md`'s load-bearing
claims about what already ships) plus the seeded W-tab-surface drift. Every
claim below was checked directly against `src/` — grep for the symbol,
read the function, or in three cases (Phase 12f, Phase 13a/13b, the
orphaned Raise/Lower Reputation reducers) confirmed by direct authorship
in this same session (I built/verified those personally; citations below
still point at the exact code for an independent reader).

## Verified (code matches the doc's claim exactly)

| Claim | Doc | Code location | Result |
|---|---|---|---|
| `factionsAtLocation`, `factionsInRegion` | consolidated design §2.2 | `src/domain/factionTurnEngine.js:129,195` | Verified |
| `isSameDistrict`, `getContainingLocation`, `getContainedLocations` | §2.2 | `src/domain/entities.js:1015,968,977` | Verified |
| `getEntityFaction`, `setEntityFactionMembership` (ADR 0034) | §2.2 | `src/domain/entities.js:999,937` | Verified |
| `getFactionDossier` — built, tested, **zero UI callers** | §2.2, DNF item 12e | `src/domain/factionTurnEngine.js:512`; grepped `src/ui/**` for callers → none | Verified — genuinely unwired |
| `settings.factionPacing`, `isFactionRoundDue`, `resetFactionPacing` | §2.2 | `src/domain/factionTurnEngine.js:538,548` | Verified |
| `scenesPerRound <= 0` is "off," never "always due" | build-prompt Phase 3, consolidated §6.5 | `factionTurnEngine.js:541` — literal inline comment: `// 0 (or negative) is the "off" setting, not "always due"` | Verified verbatim |
| 9 SWN actions (Attack/Buy/Sell/Repair/Refit/Expand Influence/Change Homeworld/Seize Planet/Use Asset Ability) | §2.2 | `factionTurnEngine.js:1091`, `const ACTIONS = {attack, buyAsset, sellAsset, repairAssetOrFaction, refitAsset, expandInfluence, changeHomeworld, seizePlanet, useAssetAbility}` | Verified — exactly 9 |
| `proposeFactionTurn`/`advanceFactionTurnRound`/`commitFactionTurn`/`proposeFactionStep` (propose-then-confirm) | §2.2 | `factionTurnEngine.js:1259,1364,1334,1385` | Verified |
| `event.impact` is **single-sided** (acting faction's own before/after only), computed once, frozen | §2.2 cut 2.3.1, build-prompt Phase 2's starting point | `computeImpact(before, after)` (`factionTurnEngine.js:1315`) called as `computeImpact(faction, faction)` / `computeImpact(before, after-for-factionId)` — one faction in, one diff out, no second party | Verified — confirms this is correctly described as *not yet* two-sided (the Phase 2 build item is real, not already done) |
| `context.what` = `{situation, intent, threat, mystery, resources, reputation, stress}` — **no Heat field**, reputation is campaign-wide/ambient only | §10.1/§11 ("no per-faction reputation, no Heat field exist") | `src/core/schema.js:49` | Verified — exact field list, no `heat`, `reputation` is one scalar not faction-keyed |
| Provider registry: `factionProviderFor`, resolution order faction override → campaign default → hardcoded fallback | §5, §2.2 | `src/data/factionRulesProviders.js:17,59` | Verified present; resolution order confirmed by this session's own Phase-agnostic read of the file during the Phase 12f/13 work |
| `'conflict'` entity type, hero-path/add-depth split (ADR 0036) | §2.2, §13 | Directly exercised in this session's own domain tests (`tests/domain.test.js`'s conflict-entity suite, still passing at 447/447 after this session's Phase 12f/13a/13b work) | Verified |

## Verified by direct authorship (this session)

| Claim | Doc | Verification |
|---|---|---|
| **Phase 12f (ADR 0040, 2026-07-16) retired the five W-tabs**, workspace is now a Story Dashboard of collapsible sections + always-visible Co-Pilot | consolidated design's front-matter, §2.1, §14, §17 | I designed and shipped this exact change earlier in this session (commit `8d70d4c` on `main`) — `ui/workspace/index.js`'s `VIEWS` map and per-tab views are gone, `renderWorkspace(doc, ui)` renders one Dashboard; `ui/shell.js`'s tab strip and `[data-question]` handler are deleted. Directly confirmed, not inferred. |
| **Phase 13a/13b (ADR 0041) scene NPC model**: `scenes.js`'s `npcStates` with Protagonists (`#character`-tagged, derived)/Antagonists (derived)/**Bystanders (GM-added list)**, scene-scoped Disposition/Motivation/Threat Rank/Challenges/Opportunities, `oracles.overrides` memory on edit | consolidated design §2.1, §12.2, §17 | I built this exact shape earlier in this session (same commit). `getNpcSceneState`/`addSceneBystander`/`removeSceneBystander`/`rollNpcSceneField`/`editNpcSceneField` are the real exported functions; the "roll records `{sourcePath,sourceIndex}`, an edit writes back through `updateOracleEntry`" mechanism is exactly the "oracle learning" the consolidated design cites. Directly confirmed. |
| **Raise/Lower Reputation `SHIFTS` reducers exist but are reachable from no UI control** | consolidated design §10.1, §17 | Directly confirmed while writing ADR 0040 earlier this session — `context.js`'s `SHIFTS` has 17 reducers, 8 unreachable from any control, Raise/Lower Reputation named explicitly among them (this was the audit that scoped Phase 12's own roadmap). |

## Drifted (surface only — behavior is correct, vocabulary predates Phase 12f)

Per the cleanup prompt's seeded hunt: every ADR written before 2026-07-16
that says "WHO tab"/"WHERE tab"/"WHAT tab" describes a real, still-correct
*behavior* on a surface that no longer exists as a tab. None of these are
behavioral bugs — the underlying function/block still exists and still
renders, just inside a Dashboard section now, not a tab.

| ADR | Lines | Literal text | Current reality |
|---|---|---|---|
| 0031 | 23, 208 | "belong to the WHO/WHERE tabs" / "the WHY tab's existing unfiltered thread list" | WHO/WHERE/WHY are Dashboard sections (`ui/workspace/index.js`'s `whoSectionBody`/`whereSectionBody`/`whySectionBody`) |
| 0032 | 47 | "must ripple into the WHAT tab" | WHAT is a Dashboard section (`whatSectionBody`); the ripple itself (`pushEvent` → `context.what.threat`) is unaffected and still Verified above |
| 0038 | 5, 64, 77, 100 | "on the WHERE tab, picking a…", "**WHO tab** (`workspace/index.js`'s `factionsActiveNearbyBlock`)", "**WHERE tab** (`workspace/index.js`)…", "more additions to the same WHERE tab" | `factionsActiveNearbyBlock` and the four WHERE read-paths (0038's own list) are all still real, still-called functions — now rendered inside `whoSectionBody`/`whereSectionBody`'s Dashboard sections instead of a tab body. Zero behavior drift, 100% surface drift. |
| 0034, 0035, 0036 | — | (none found) | Clean — these ADRs don't use "tab" language for faction surfaces |

**Resolution:** per §0.3 (ADRs are immutable except Status line), 0031/
0032/0038 are not rewritten. Their `Status` lines gain a one-line pointer
to `docs/adr/0042-design-doc-consolidation.md` (which records the surface
correction and points to `docs/design/LIVING-FACTION-ENGINE.md` for the
current vocabulary). `docs/design/LIVING-FACTION-ENGINE.md` itself
describes every UI surface in Dashboard-section/Co-Pilot terms only (§14),
confirmed already written that way in the source doc — this report found
no place in the consolidated design that still says "tab."

## Unshipped (doc describes forward design, not yet built — expected, not a defect)

Every item in the consolidated design's §3 (the five behavioral shifts)
and the build prompt's Phases 1–6 is Unshipped by design — that's the
entire point of the document (it's the *forward* design, explicitly
labeled "Proposed / consolidating" in its own front-matter). Listed here
only to confirm none of them are mis-described as already-shipped:

- Two-sided `event.impact` (Phase 2) — confirmed Unshipped above (impact
  is single-sided today).
- Per-decision editable dropdowns / `draft.decisions` / `reproposeWithOverride`
  / `reproposeFrom` (Phase 3) — grepped, none exist in
  `factionTurnEngine.js` or `ui/drawers/factionEvents.js`. Unshipped.
- System-wide round scope / `data-faction-round-scope` / off-world news /
  `factionNews.js` (Phase 4) — grepped, none exist. Unshipped.
- `faction.partyStanding`, `location.heat`/`npc.heat`,
  `applySceneOutcomeToFactions` (Phase 5) — grepped `entities.js`'s
  `ensureFactionFields`/`ensureLocationFields`/`ensureNpcFields`, none of
  these fields exist yet. Unshipped.
- Tag-driven faction membership resolution in `getEntityFaction`,
  `factionBystandersFor` (Phase 6) — `getEntityFaction` (verified above)
  only checks a `member_of` edge, no tag-resolution branch. `grep`'d for
  `factionBystandersFor` — does not exist. Unshipped.

## Potential code follow-ups (recorded, not fixed — per §3's explicit instruction)

- None found beyond what the consolidated design itself already scopes as
  future phases. No load-bearing claim in the faction cluster was found to
  be simply *wrong* about current behavior (every "Verified" row above
  matched exactly; every non-matching claim was already correctly labeled
  as forward design, not shipped reality). The one real finding is the
  W-tab surface drift above, which is documentation-only — nothing in the
  code needs to change for it.

## Explicitly out of scope for this pass

Per the manifest's scope note: ADRs 0001–0030, 0033, 0037, 0039 and every
`requirements/` artifact were inventoried (§1) and classified (§2) but not
independently re-verified claim-by-claim here — none of them are
implicated by the faction-design conflict or the W-tab seed, and the
cleanup prompt's own "Keep as-is" category is explicitly scoped to exactly
this ("unrelated to the faction-design conflict"). If a future pass wants
a full-repo drift audit unrelated to factions, that is new scope, not an
omission from this one.
