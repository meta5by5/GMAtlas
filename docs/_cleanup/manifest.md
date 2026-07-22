# Design-doc cleanup — discovery manifest

Built per `docs/cleanup-07-21/design-docs-cleanup-prompt.md` §1. One row
per artifact: path, size, last commit date, one-line guess. Class assigned
per §2 (see `docs/_cleanup/REPORT.md` for the disposition each row ended
at). Scope note up front, since it governs every "Keep as-is" below: the
cleanup prompt's own §2 defines "Keep as-is" as "unrelated to the
**faction-design conflict**" — every conflict/example/seed item in §3/§4 of
the prompt is faction- or W-tab-surface-related. This pass therefore gives
every artifact a manifest row and a class, but reserves deep §3 code-
verification for the faction cluster and the W-tab drift surface; every
other ADR/doc gets a one-line "not implicated by this consolidation" note
rather than a full independent re-audit of an unrelated subsystem.

## ADRs (`docs/adr/`) — immutable history, Status-line-only edits permitted

| # | Path | Size | Last commit | Title | Class |
|---|---|---|---|---|---|
| 0001 | docs/adr/0001-adopt-design-constitution.md | 9.7K | 2026-07-03 | Adopt the Design Constitution | ADR — Keep as-is (not faction) |
| 0002 | docs/adr/0002-rules-constitution.md | 8.0K | 2026-07-05 | Adopt the Rules Constitution | ADR — Keep as-is (not faction) |
| 0003 | docs/adr/0003-trade-logistics.md | 9.6K | 2026-07-06 | Trade & Logistics minigame | ADR — Keep as-is (not faction) |
| 0004 | docs/adr/0004-merchant-rules-lens.md | 13.2K | 2026-07-06 | Merchant Rules Lens | ADR — Keep as-is (not faction) |
| 0005 | docs/adr/0005-best-effort-backup-write.md | 5.0K | 2026-07-04 | Best-effort backup write | ADR — Keep as-is (not faction) |
| 0006 | docs/adr/0006-pages-deploy-allowlist-and-actions-source.md | 6.7K | 2026-07-04 | Pages deploy allowlist | ADR — Keep as-is (not faction) |
| 0007 | docs/adr/0007-git-lfs-for-reference-library-pdfs.md | 2.7K | 2026-07-04 | Git LFS for Reference Library | ADR — **Superseded by 0039** (LFS→Releases); Status line already/should note this |
| 0008 | docs/adr/0008-situation-engine.md | 14.8K | 2026-07-05 | Situation Engine | ADR — Keep as-is (not faction) |
| 0009 | docs/adr/0009-situation-engine-revisited.md | 11.3K | 2026-07-06 | Situation Engine, revisited | ADR — Keep as-is (not faction) |
| 0010 | docs/adr/0010-traveller-swn-content.md | 7.4K | 2026-07-05 | Traveller/SWN content | ADR — Keep as-is (not faction-engine; content only) |
| 0011 | docs/adr/0011-swn-cwn-content.md | 9.6K | 2026-07-09 | Deepen SWN/CWN content | ADR — Keep as-is (not faction-engine; content only) |
| 0012 | docs/adr/0012-gear-item-entity-subtype.md | 13.8K | 2026-07-05 | Gear/Weapon entity sub-type | ADR — Keep as-is (not faction) |
| 0013 | docs/adr/0013-trade-economy-types.md | 8.0K | 2026-07-06 | Tag-driven Location economy types | ADR — Keep as-is (not faction) |
| 0014 | docs/adr/0014-mechanics-index-pdfjs.md | 8.3K | 2026-07-06 | Game Mechanics Index / PDF.js | ADR — Keep as-is (not faction) |
| 0015 | docs/adr/0015-indexeddb-persistence.md | 8.5K | 2026-07-06 | Persistence: IndexedDB | ADR — Keep as-is (not faction) |
| 0016 | docs/adr/0016-oracle-tags-and-field-links.md | 7.4K | 2026-07-06 | Oracle tags + field links | ADR — Keep as-is (not faction) |
| 0017 | docs/adr/0017-multi-doc-guide-tree.md | 7.2K | 2026-07-06 | Multi-doc Guide tree | ADR — Keep as-is (not faction) |
| 0018 | docs/adr/0018-lightweight-rich-text.md | 12.2K | 2026-07-06 | Lightweight rich text | ADR — Keep as-is (not faction) |
| 0019 | docs/adr/0019-where-tab-and-scene-fields.md | 9.9K | 2026-07-07 | WHERE tab redesign + Scene fields | ADR — **Drifted-surface** ("WHERE tab" predates Phase 12f); not faction, no Status edit needed (title describes a past redesign, not current nav) |
| 0020 | docs/adr/0020-reference-toc-generation.md | 5.8K | 2026-07-06 | Reference TOC generation | ADR — Keep as-is (not faction) |
| 0021 | docs/adr/0021-gallery.md | 6.8K | 2026-07-07 | Gallery | ADR — Keep as-is (not faction) |
| 0022 | docs/adr/0022-inline-prompt-standard.md | 10.1K | 2026-07-08 | Inline prompt standard | ADR — Keep as-is (not faction) |
| 0023 | docs/adr/0023-planetfall-grid-battlemap.md | 14.3K | 2026-07-09 | Planetfall Grid Battlemap | ADR — Keep as-is (not faction) |
| 0024 | docs/adr/0024-battlemap-encounter-roadmap.md | 13.1K | 2026-07-08 | Battlemap/Encounter roadmap | ADR — Keep as-is (not faction) |
| 0025 | docs/adr/0025-location-biome-trade.md | 7.4K | 2026-07-08 | Location Development Level + Biome | ADR — Keep as-is (not faction) |
| 0026 | docs/adr/0026-hostile-canon-locations.md | 28.5K | 2026-07-09 | HOSTILE canon locations | ADR — Keep as-is (not faction) |
| 0027 | docs/adr/0027-encounter-manager-and-battlemap-content.md | 8.9K | 2026-07-09 | Encounter Manager design | ADR — Keep as-is (not faction) |
| 0028 | docs/adr/0028-multiuser-access-and-cloud-sync.md | 7.2K | 2026-07-09 | Multi-user + cloud sync | ADR — Keep as-is (not faction; not started) |
| 0029 | docs/adr/0029-shipyard-deckplan-builder.md | 7.0K | 2026-07-09 | Shipyard deckplan builder | ADR — Keep as-is (not faction; not started) |
| 0030 | docs/adr/0030-starforged-starsmith-oracles.md | 4.6K | 2026-07-09 | Starforged/StarSmith oracles | ADR — Keep as-is (not faction) |
| **0031** | docs/adr/0031-swn-faction-turn-engine.md | 21.8K | 2026-07-10 | SWN Faction Turn Engine | ADR — **Faction cluster.** Superseded-by-reference: docs/design/LIVING-FACTION-ENGINE.md (behavior mostly reused; §3.1/§3.3 reverse specific decisions) |
| **0032** | docs/adr/0032-gmatlas-core-faction-provider.md | 16.5K | 2026-07-10 | GMAtlas Core Faction Provider | ADR — **Faction cluster.** Superseded-by-reference (§3.4/§5 extend/reverse specific decisions; provider seam reinforced, not replaced) |
| 0033 | docs/adr/0033-mobile-responsive-tab-unification.md | 11.3K | 2026-07-10 | Mobile-responsive tab unification | ADR — Keep as-is (not faction; drifted-surface risk N/A, this ADR is ABOUT the tab strip's mobile behavior pre-Phase-12f — historical, correctly dated) |
| **0034** | docs/adr/0034-faction-membership-and-region-depth.md | 7.8K | 2026-07-13 | Faction Membership, Conquest, Region-Depth | ADR — **Faction cluster.** Superseded-by-reference (§3.5 extends membership resolution; region-depth queries reused wholesale) |
| **0035** | docs/adr/0035-faction-engine-pacing-missions-turn-ui.md | 10.0K | 2026-07-13 | Faction pacing, missions, turn UI | ADR — **Faction cluster.** Superseded-by-reference (§3.2/§3.3 reverse specific cuts; pacing/missions reused) |
| **0036** | docs/adr/0036-faction-conflict.md | 11.0K | 2026-07-14 | Faction Conflict | ADR — **Faction cluster.** Adopted wholesale, not reversed — reference only, no Status change needed |
| 0037 | docs/adr/0037-foreshadowing-worldflags-npc-goal.md | 7.9K | 2026-07-14 | Foreshadowing, World Flags, NPC goal | ADR — Keep as-is (not faction; `currentGoal` reused by faction design but ADR itself unchanged) |
| **0038** | docs/adr/0038-location-faction-story.md | 9.7K | 2026-07-14 | Location↔Faction presence, Location Story | ADR — **Faction cluster + Drifted-surface** (its "WHO tab"/"WHERE tab" vocabulary predates Phase 12f). Superseded-by-reference |
| 0039 | docs/adr/0039-reference-library-release-hosting-and-story-options.md | 18.0K | 2026-07-15 | Reference Library Releases + Story Options | ADR — Keep as-is (not faction) |
| 0040 | docs/adr/0040-story-dashboard.md | 21.5K | 2026-07-21 | Story Dashboard (Phase 12, incl. 12f W-tab retirement) | ADR — Keep as-is; **this IS the W-tab-retirement authority** the faction docs must read as canon |
| 0041 | docs/adr/0041-scene-operating-model.md | 22.0K | 2026-07-21 | Scene Operating Model (Phase 13a/13b) | ADR — Keep as-is; **this IS the Bystanders-slot authority** §12.2 of the faction design must reuse |
| — | docs/adr/next-request.md | 31.4K | 2026-07-09 | Standing inbox ("USER NOTES and CHANGE REQUESTS") | Rules/process doc, not an ADR despite its folder — Keep as-is. Contains an already-processed 5PFH turn-sequence spec as history; unrelated to faction work |

**New ADR to be created:** `docs/adr/0042-design-doc-consolidation.md` (§6.3)
records this cleanup and formally supersedes 0031/0032/0034/0035/0038 (and
cross-references 0036, adopted not reversed) — see REPORT.md.

## Canonical design specs / transient build prompts (`docs/design/`)

| Path | Size | Last commit | Class | Disposition |
|---|---|---|---|---|
| docs/design/FACTION-CONFLICT.md | 15.8K | 2026-07-13 | Superseded / idea-bank | Archive — superseded by ADR 0036 (already was, per that ADR's own text) + LIVING-FACTION-ENGINE.md §13; flat 18-field schema demoted to idea-bank, already recorded as such |
| docs/design/faction-conflict-integration-plan.md | 8.8K | 2026-07-13 | Transient build prompt, shipped | Archive — its decisions shipped as ADR 0036; superseded-by pointer added |
| docs/design/faction-turn-engine-v2-prompt.md | 13.2K | 2026-07-13 | Transient build prompt, partially shipped | Archive — the "clean turn-processing UI" it drove shipped as ADR 0035; its still-open ideas (decision dropdowns) are carried into the new build prompt (§6.5) |
| docs/design/GMAtlas_Scene_Story_Data_Model.md | 13.2K | 2026-07-14 | Research/spec, reconciled | Keep as-is — already explicitly reconciled by `scene-story-integration-plan.md` (its own companion doc) and ADR 0041; not part of the faction conflict |
| docs/design/scene-story-integration-plan.md | 5.7K | 2026-07-14 | Reconciliation record, shipped | Keep as-is — the reconciliation is itself the historical record (mirrors an ADR in function); not part of the faction conflict |

## This cleanup's own inputs (`docs/cleanup-07-21/`)

| Path | Size | Class | Disposition |
|---|---|---|---|
| docs/cleanup-07-21/design-docs-cleanup-prompt.md | 16.3K | Transient build prompt (this process itself) | Archive once this pass completes — its instructions are now executed; REPORT.md is the durable record |
| docs/cleanup-07-21/LIVING-FACTION-ENGINE-CONSOLIDATED-DESIGN.md | 45.3K | Canonical design spec, promoted | **Moves to** `docs/design/LIVING-FACTION-ENGINE.md` (§6.2) |
| docs/cleanup-07-21/living-faction-engine-build-prompt.md | 18.6K | Active build prompt, not yet built | **Moves to** `docs/design/living-faction-engine-build-prompt.md` (§6.5) |
| docs/cleanup-07-21/Additional scope concepts.txt | 1.8K | Research/authority source, verified | **Moves to** `docs/design/additional-scope-concepts.txt` — preserved verbatim as the primary source the canonical spec's §3 quotes from |

## Root docs

| Path | Size | Class | Disposition |
|---|---|---|---|
| CLAUDE.md | 30.6K | Rules/constraints — authoritative | Reconciled in place (§6.1) — add Design docs map, verify no stale faction/tab claims |
| DESIGN-NEW-FUNCTIONALITY.md | 12.4K | Canonical roadmap — authoritative | Keep as-is; already current (Phase 12f/13a/13b reflected), cross-checked against this cleanup — no faction-specific claims to fix |
| PROGRESS.md | 95.7K | Status change-log — authoritative | **Do not archive** (explicit instruction). Keep as-is; it is the ship-date authority this cleanup cites, not a target for rewriting |
| README.md | 5.3K | Keep as-is | Not implicated |

## `docs/` misc

| Path | Size | Class | Disposition |
|---|---|---|---|
| docs/mobile-drag-drop-test-cases.md | 4.3K | Keep as-is | Manual test cases, unrelated to faction conflict |
| docs/guide-content/5pfh-campaign-turn-sequence.txt | 6.0K | Keep as-is | Shipped in-app Guide content (Party/Colony 5PFH), unrelated to faction conflict |
| docs/archive/CLAUDE-2026-07-15.md | 28.3K | Already archived | No action — pre-existing archive convention honored |
| docs/archive/DESIGN-NEW-FUNCTIONALITY-2026-07-15.md | 64.1K | Already archived | No action |
| docs/archive/progress-log-2026-07.md | 40.8K | Already archived | No action |

## `requirements/` (reference material, per CLAUDE.md's own "not part of this repo" framing for two of the four subfolders)

| Path | Class | Disposition |
|---|---|---|
| requirements/design-principles/ (77 packs + final-summary + zip + gameplay-mechanics.md, 80 items) | Design Constitution corpus — **inventory only, do not rewrite** (explicit instruction, §1) | Kept as-is; sits above the ADRs as design law per ADR 0001; this cleanup reconciles *to* it, confirmed no faction-cluster contradiction (Articles II/IX/X all honored per LIVING-FACTION-ENGINE.md §4/§14) |
| requirements/initial design inputs/GMAtlas-requirements.md | Superseded scoping doc | Keep as-is — pre-Constitution input, already superseded in spirit by ADR 0001; not faction-specific |
| requirements/initial design inputs/gameplay-goals.md | Research/rules-constitution input | Keep as-is — still cited live by ADR 0002/`data/rulesConstitution.js`; not faction-specific |
| requirements/initial design inputs/ChatGPT history.md | Research note | Keep as-is; not faction-specific |
| requirements/initial design inputs/SagaAtlas-Design-Recommendations.md | Research note | Keep as-is; not faction-specific |
| requirements/sourcecode/ (3 subtrees) | Reference-only, explicitly NOT part of this repo (CLAUDE.md) | Keep as-is, untouched — out of scope by the repo's own standing rule |
| requirements/rulesystems/ (PDFs + docx) | Reference sourcebooks | Keep as-is, untouched |

## Not part of this cleanup (found during discovery, flagged not fixed)

- `requirements/rulesystems/Parsec_Far_Trader_Expansion.docx` is untracked
  (new, not yet committed) — reference material the user added; not a
  design doc, no action taken, not part of this branch's commits.
