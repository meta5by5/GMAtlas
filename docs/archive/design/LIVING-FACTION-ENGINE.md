> Companion to `docs/design/LIVING-FACTION-ENGINE.md` — split out 2026-07-23
> to keep the live doc from carrying content already stated elsewhere in
> it. This is the working reconciliation audit trail against
> `DESIGN-NEW-FUNCTIONALITY.md` (DNF) that justified §7/§10/§11/§12/§14's
> conclusions when the canonical doc was first written — every row here
> restates a fact the live doc already states in its relevant section, so
> it was redundant to keep twice. Preserved verbatim rather than deleted.

# Reconciliation with `DESIGN-NEW-FUNCTIONALITY.md` (original §17)

DNF is a short roadmap doc (rebaselined 2026-07-15) that points to
`PROGRESS.md` for status and `docs/adr/` for reasoning, and references a
77-document **Design Constitution** under `requirements/` (adopted in ADR
0001). Reading it changed or confirmed the following:

| DNF finding | Effect on this design |
|---|---|
| **Phase 12f (2026-07-16) retired the five W-tabs**, folding content into a Story Dashboard + always-visible Co-Pilot (explicit Article X reversal). | **Material.** Every "WHO/WHERE/WHAT/WHY tab" in the source faction ADRs (0031/0038) and in earlier drafts of this doc now means a Dashboard section / Co-Pilot control. §14 rewritten; §2.1 annotated. This was the top drift item for the doc cleanup. |
| **Phase 13a/13b (ADR 0041) shipped a scene NPC model** — `npcStates` with Protagonists/Antagonists/**Bystanders (GM-added)**, scene-scoped fields, `oracles.overrides` memory. | **Reuse, don't invent.** §12.2 Bystanders feeds the existing 13b group rather than adding a scene-generator slot. |
| Campaign-wide `context.what.reputation` exists with **orphaned Raise/Lower Reputation `SHIFTS` reducers** (item 12d, unsurfaced). | Per-faction `partyStanding` (§10) is new and complementary; the loop nudges the ambient value via the existing `applyShift` mechanism, incidentally giving those orphaned reducers a live driver. |
| **No Heat/Hazard field** exists (`context.what` = threat/mystery/resources/reputation/stress only). | `heat` (§11) confirmed new; justified as per-entity where the ambient values can't be. |
| `getFactionDossier` is **built and tested but unwired** (item 12e, "the one orphan worth it"). | Surfacing it on the faction card (§14) aligns with a decision DNF already made — free win, not new scope. |
| DNF is **silent on `event.impact`** (a 0035 concern). | Two-sided impact reversal (§7) stands with no DNF conflict. |
| A **Design Constitution** (77 docs, `requirements/`, ADR 0001) sits above these ADRs, with numbered Articles (II = GM authority, IX = extend-via-existing, X = workspace-not-app, reversed by P12). | This design honors II and IX throughout and inherits P12's X-reversal (§14). The Constitution is a higher authority the doc cleanup also accounted for. |
| Testing posture: pure domain fn + unit tests → thin view → browser smoke check. | Matches §4/`CLAUDE.md` and the per-phase test lists in the build prompt; no change. |

Net: no reversal of any decision in the canonical doc, one significant
surface correction (Dashboard/Co-Pilot, not tabs), and two "reuse the
shipped thing" tightenings (13b Bystanders, the ambient-reputation
wiring).
