# Faction events and change sets

**Status:** Accepted, built 2026-11-22 (design/FACTION-ROADMAP.md F2).

## Context

The Factions design (design/Faction-baseline.md B4.6) needs every faction
consequence to be reviewable, applied as one unit, and undoable, with
entity history that survives without a snapshot store (conflict C9). The
Ledger must stay append-only (B4.4), and a GM edit made after a change was
proposed must never be silently overwritten (SRS 13.2).

## Decision

`src/domain/factionChanges.js` adds four linked records under
`campaign.factions`: `triggers`, `events` (each carrying its Action),
`changeSets` and `hooks`. Ids link both ways.

- **A change is a slot plus before and after values.** A slot is an entity
  field (dot path), one item by id in an entity list field, one
  relationship edge, or one item by id in a campaign array (the Ledger,
  hooks, objectives, threads, the journal, `entities.items`). `undefined`
  means absent.
- **Any pure mutator becomes a change set.** `recordEvent({mutate})` runs
  the mutator on a scratch copy and `diffChanges(before, after)` turns the
  difference into changes. Domain mutators don't need a change-set form of
  their own.
- **Apply** checks and writes the changes in order on a scratch copy. If any
  slot no longer holds its before value, nothing is applied: the set is
  marked `conflicted` with both versions recorded. `force` applies a
  change anyway and takes the current value as its before, so undo
  restores the GM's edit. Unticked changes skip their dependents too.
- **Undo** records the inverse as a new change set marked `undoOf` and
  applies it under the same version check. Ledger entries are never
  removed: each gets a reversal entry (`reverses`). Breakdowns hide the
  pair, and sums cancel exactly. A migrated seed entry is not reversed,
  because it records what was already true.
- **The journal entry** for a significant or major event goes in the same
  change set, so undo takes it back.
- **Idempotency:** an event with an `idempotencyKey` already recorded is
  returned unchanged.
- **Entity history** is the list of applied changes whose slot touches the
  entity. Nothing copies whole entities.

## Consequences

- Every faction consequence from F2 onward goes through a change set. F3's
  pipeline and F4's Review Queue apply or modify proposed sets, not the
  campaign directly.
- The classic SWN event log (`campaign.factionEvents`) is unchanged and is
  read alongside the new events in History and the Timeline.
- Change sets hold before values, so they grow with play. A compaction
  rule (for example, folding sets older than N turns) can be added later
  without changing the record shape.
- All of it is metadata under `factions.*` (`syncPolicy`: `gm`), with no
  `data:` URLs.
