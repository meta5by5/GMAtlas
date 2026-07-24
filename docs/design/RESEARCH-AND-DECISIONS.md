# Research & Decisions — provenance log

*Rescue vessel for supplemental research findings that justified specific
design decisions, so archiving their original host document never loses
the finding itself. Created by `docs/adr/0042-design-doc-consolidation.md`;
add to this file (don't create a second one) whenever a future decision is
backed by external research worth preserving.*

Each entry: the finding, its source, and which decision it justifies.

---

## SWN's own faction system is "tolerated, not loved" for its complexity

**Finding:** Stars Without Number's own faction system — the direct
ancestor of this app's Faction Turn Engine — is described in community
reviews as "complex and fiddly compared to the rest of the rules,"
tolerated by genre-committed GMs for its depth, not adopted *because* of
it.

**Source:** General GM-community sentiment research (SWN/OSR forums and
reviews), conducted directly ahead of building the Faction Conflict
subsystem, 2026-07-13.

**Justifies:** ADR 0036's "hero path" simplification (status, one
escalation clock, a stated-vs-root-cause gap, session hooks — a conflict
that's usable with nothing else filled in) over the source
`FACTION-CONFLICT.md` spec's 18+ field, per-faction-posture, enumerated-
scale model. Directly carried into `docs/design/LIVING-FACTION-ENGINE.md`
§13 (adopted wholesale, not reversed by the consolidation).

## Blades in the Dark's Progress Clock is the industry-standard "pressure without homework" pattern

**Finding:** Across every source consulted, Blades in the Dark's Progress
Clock (a circle, segments, filled in by GM judgment — no formula) is the
single most consistently cited example of tracking narrative pressure
*without* requiring bookkeeping.

**Source:** Same 2026-07-13 research pass, ADR 0036's Context section.

**Justifies:** This app's own `domain/threads.js` clock mechanism (already
built pre-dating this research, originally for generic Threads) being
reused as-is for the Faction Conflict escalation clock and the SWN Faction
Goal track, rather than inventing a bespoke numeric-formula tracker for
either. The research confirmed the existing choice was right, not that it
needed to change.

## A real faction system got redesigned twice after playtesting showed it was too heavy

**Finding:** An indie TTRPG's public devlogs describe a faction system
redesigned *twice* because real playtesting showed it "took up too much
headspace" and "bogged down game setup."

**Source:** Same 2026-07-13 research pass, ADR 0036's Context section.

**Justifies:** Treating "GM cognitive load at the table" as a first-class
design constraint for the faction subsystem specifically (not just this
app's general Frictionless Empowerment philosophy in the abstract) — the
concrete evidence that skipping this concern has cost other real projects
two rewrites is why ADR 0036 chose the simplified hero-path model up
front instead of shipping the rich spec and simplifying reactively later.

## Gnome Stew: favor abstraction a GM already knows over new rules to memorize

**Finding:** Gnome Stew (a well-regarded GM-craft blog) records a common
GM complaint about faction tooling: frustration from "having to learn all
these new rules and constantly go back and look stuff up." Their stated
fix is reusing mechanics/vocabulary a GM already knows rather than
inventing new abstractions, favoring approximation over precision.

**Source:** Same 2026-07-13 research pass, ADR 0036's Context section.

**Justifies:** Every "reuse an existing convention instead of inventing a
new scale" decision in the faction subsystem — Conflict's cohesion dial
reusing the 0–10 relationship-strength convention (ADR 0036), and (per
`docs/design/LIVING-FACTION-ENGINE.md` §10.1) the new `faction.
partyStanding` field reusing that exact same 0–10 convention rather than
inventing a bespoke reputation scale.

## Copyright: mechanics and numbers aren't copyrightable expression; names/prose are

**Finding:** Game mechanics, numeric formulas, and rules procedures are
not protected expression under copyright law — only the specific
creative *expression* (names, flavor text, prose) is. A field-for-field
mechanical mirror with 100% original names/text/flavor is not
infringement.

**Source:** Established during ADR 0032's scope-confirmation (two rounds
of direct `AskUserQuestion` clarification), 2026-07-10 — this is the
legal-reasoning basis the "GMAtlas Core" provider was built on, not itself
a novel finding but the operating assumption every subsequent copy-clean
provider (GMAtlas Core's faction assets/tags/goals) relies on.

**Justifies:** `data/gmatlasFactionData.js` mirroring `data/
swnFactionData.js`'s ratings/HP/cost/dice/difficulty formulas exactly
(same numbers, position-for-position) while every name and all flavor/
special-ability/tag/goal text is original writing — never a paraphrase of
SWN's own wording. Also justifies the broader Rules Provider pattern
(`factionProviderFor`) as the seam that lets both a SWN-exact and a
copyright-clean provider coexist, which `docs/design/LIVING-FACTION-
ENGINE.md` §5 formalizes as a first-class pillar.

## Personal-use transcription is not the same posture as a publicly deployed app

**Finding:** ADR 0031's original "owned sourcebook, transcribed for
personal GM use" posture is legally fine for a purely local tool, but this
app also deploys to GitHub Pages — public distribution, not personal use
— so unrestricted SWN transcription doesn't hold by default for anyone
who isn't the sourcebook's original purchaser/author.

**Source:** ADR 0032's Context section, 2026-07-10 (the direct trigger for
building the GMAtlas Core provider and the Game System Activation gate).

**Justifies:** `settings.gameSystemActivations.swn` — the real SWN
content stays behind an explicit activation checkbox (grandfathered `true`
only for a campaign that already has real SWN faction-turn data, so
nothing already built breaks), while GMAtlas Core's copyright-clean mirror
ships ungated. Also the standing note ADR 0032 left for a future pass:
"this needs to be connected to a licensing activation module" — not yet
built, still an open item.

## Oracle table content sourcing: original re-implementations of published concepts, not transcriptions

**Finding/convention:** Every oracle table this project has added that's
*inspired by* a named published system (Starforged/StarSmith's oracle
concepts, ADR 0030; this session's own `Characters.Opportunity`/`Threat
Rank` and `Location Themes.Sight/Smell/Sound`, ADR 0041 Phase 13a) is
built as an original re-implementation of the underlying *concept*
(matching scale, matching tone/genre voice) — never copied text from the
source material. Table entries are hand-written to match the existing
genre pack's established tone (checked against sibling tables in the same
group before writing new ones).

**Source:** Established practice across `data/tables.js`'s history (ADR
0010/0011's SWN/CWN content research, ADR 0030's Starforged/StarSmith
oracle labeling convention `"${label} (${source})"`, and this session's
own Phase 13a additions to `data/tables.js`).

**Justifies:** Treating new oracle content as safe to author freely
(matching an existing table's voice, not its wording) rather than
requiring a copyright review per table — the same reasoning as the
mechanics-vs-expression distinction above, applied to prose instead of
numbers.
