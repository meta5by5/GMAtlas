# Mobile drag-and-drop — manual test cases

Automated coverage (Playwright, synthetic `TouchEvent`s in a `hasTouch:
true` context) confirms the mechanism works — see
`ui/shell.js`'s `onTouchStart`/`onTouchMove`/`onTouchEnd`. It cannot
confirm real touch hardware feel (finger size/precision, momentum
scrolling, on-screen keyboard interaction, installed-PWA mode). Run these
by hand on at least one real phone and one real tablet before treating
"mobile and desktop equal" as verified rather than aspirational (this was
flagged in `PROGRESS.md`'s UI/UX assumptions list).

## Setup

Open the deployed site (or `npm run serve` + your phone/tablet on the
same network) on a real touchscreen device. Chrome on Android and Safari
on iOS at minimum — they've historically diverged on touch-event
specifics.

## Test cases

1. **Link two Cast entities by dragging the grip.**
   Cast drawer → press and hold the ⠿ grip on one entity row → drag onto
   another row → release. Expect: a relationship chip appears on both
   entities (check by selecting each). A floating pill with the dragged
   entity's name should visibly follow your finger during the drag.

2. **A plain tap on a Cast row still selects it (no accidental drag).**
   Tap a Cast row *without* touching the grip — anywhere else on the row.
   Expect: the entity becomes active/selected, inspector updates. No
   ghost pill appears, no drag is triggered.

3. **A tap directly on the grip (no movement) does not start a drag.**
   Tap (don't drag) the ⠿ grip itself. Expect: nothing visually
   happens except perhaps the row selecting (bubbled click) — no ghost,
   no relationship created. This is the "below threshold" case.

4. **Mention an entity in the Journal by dragging a WHO/WHERE chip.**
   With an entity showing as a chip in the WHO or WHERE workspace card,
   open the Journal drawer, drag the chip onto the note textarea.
   Expect: an `@Name` (or `@[Multi Word Name]`) mention is inserted at
   the drop point, and a small entity badge appears once the note is
   saved.

5. **Reference a document by dragging it onto a text field.**
   Documents drawer → drag a document's title (the draggable text/link)
   onto the Journal note field or a WHO/WHERE/WHAT/WHY/HOW text field.
   Expect: an `@[Doc Title]` mention is inserted.

6. **Dragging off any valid target cancels cleanly.**
   Start a drag from a grip, move your finger to empty space (not over
   any entity row or text field), release. Expect: nothing happens, the
   ghost pill disappears, no `drop-hover` outline is left stuck on
   anything.

7. **A drag in progress doesn't scroll the page out from under you.**
   Start a real drag (past the threshold) somewhere the page could
   otherwise scroll (e.g., a long Cast list). Expect: the page does NOT
   scroll while a drag is actively engaged; a plain scroll gesture
   elsewhere (not starting on a grip) still scrolls normally.

8. **Works with the on-screen keyboard open.**
   Focus the Journal note field (on-screen keyboard appears, shrinking
   the visible viewport), then drag an entity chip onto the now-visible
   note field. Expect: the drop still registers correctly against the
   field's new (keyboard-adjusted) position.

9. **Tablet edge-tab Co-Pilot vs. phone bottom-sheet.**
   Not drag-and-drop, but the other touch-relevant layout change from
   this pass: on a tablet-width device (roughly 768–1023px), tapping the
   Co-Pilot edge tab should slide a side panel in from the right; on a
   phone-width device (<768px), the same tap should slide a sheet up
   from the bottom instead. Confirm both feel natural for a thumb reach
   on that form factor, not just structurally correct.

## What "pass" looks like

Every case above should work with the same visible feedback a mouse user
gets (a hover outline on the drop target, a toast confirming the action) —
touch is meant to reach the same destinations as drag-and-drop, not a
degraded parallel experience. If a real device disagrees with the
automated suite (i.e., these fail even though `smoke-touch-dragdrop.js`
passes), that's a genuine device-specific gap worth reporting — the
dropdown-based Link control remains the accessible/keyboard/fallback path
either way (`CLAUDE.md`).
