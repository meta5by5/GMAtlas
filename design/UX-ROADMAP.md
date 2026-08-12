# GMAtlas — UX & Mobile Design Roadmap

**Build status (2026-08-12): Steps 1, 2, 3, 4, and 5 are built and
verified.** Step 5 landed first, after real-device testing (on a phone, via
the deployed GitHub Pages build) found the original Step 1–3 phone behavior
genuinely broken — Composer and Navigator stacked as one long scrollable
page, and in practice Navigator was unreachable below a long Composer, not
merely inconvenient to reach. The fix actually built is the real Step 5
design: Composer, Navigator, and Advisor permanently pinned, unclosable
tabs in a tab strip that's always open, with any other opened drawer
(Guide, Oracle, ...) adding a closable tab alongside them rather than
replacing them. Step 4 followed immediately after, extending that exact
same design from phone-only to also cover tablet (both now share one
"compact" tier, <=1023px) rather than inventing a third, separate layout —
tablet had the same "no room for Composer, Navigator, and an open drawer
side by side" problem phone did, and the machinery Step 5 built was already
generic enough to extend by widening one breakpoint constant. The Advisor's
old tablet-specific slide-in panel (a separate summon/dismiss toggle) is
retired along with it, since Advisor is now always reachable as a pinned
tab at that width too. Verified via 450 passing domain tests (unaffected)
plus jsdom-driven mounts of the real built bundle across all three tiers —
phone (375px), tablet (850px, plus a resize-across-breakpoints check
confirming the debounced resize listener re-renders correctly when
crossing tablet→phone and tablet→desktop), and desktop (1440px, confirming
zero regression to the existing desktop behavior). **Steps 6 and 7 remain
open** — Step 6 (a dedicated touch-target/gesture polish pass) still has no
real-device visual verification behind it; Step 7 depends on the
still-unbuilt Moves menu. Steps 1–5's detail below is now a description of
what shipped, not a plan; Steps 6–7 are still the plan.

Scope: **navigation and layout only** — the Storyboard's panel model
(Composer / Navigator / Advisor) and everything needed to make it genuinely
usable on a phone, not just shrunk to fit one. Game-mechanics work (the
Moves catalog's content, oracle-engine changes, NPC-generation logic) is
covered in `requirements/functional-requirements-v3.md` and is out of scope
here on purpose — this document exists so the phone-usability work can be
planned, built, and tested on its own, without waiting on unrelated
mechanics changes.

Companion reading: `requirements/functional-requirements-v3.md`'s
"Storyboard — Navigation, Panels & Responsive Layout" and "The Moves Menu"
sections describe the *target* behavior this roadmap sequences into
buildable steps. `design/adr/GMAtlas-Design-Constitution.md` describes the
architecture these steps build on top of (the shell's single delegated
event-listener model, the drawer tab-strip mechanism).

## Where this starts from

The app already has real responsive infrastructure — this roadmap extends
it, it doesn't replace it:

- Two breakpoint tiers now govern the Storyboard's own layout: **desktop**
  (≥1024px) and **compact** (<=1023px, phone and tablet unified, Steps 4/5)
  — plus an additional <=480px tier, unrelated to the tab-menu question,
  for finer single-column field reflow within whichever panel is showing.
- The Advisor (today's Co-Pilot panel) is a permanent region on desktop
  only now — its old separate tablet slide-in and phone bottom-sheet
  presentations (two different summon/dismiss toggles) are retired; at
  compact widths it's simply one of the three permanently-pinned tabs,
  same as Composer/Navigator.
- A single-panel drawer system with a tab strip already exists (at most one
  drawer panel visible at a time, multiple pinned drawers share a tab
  strip), together with a from-scratch touch-drag-with-hover-dwell gesture
  (holding a drag over a tab or the header for ~500ms switches to it
  without ending the drag) that already makes cross-panel drag-and-drop
  work on a touchscreen.
- Steps 1, 2, 3, 4, and 5 (below) are now built on top of that
  infrastructure: Composer and Navigator are two real independently-
  scrolling panels (Step 2), the Advisor shares the desktop drawer tab
  strip when a drawer is open (Step 3), and at every compact width —
  phone and tablet alike — all three are permanently pinned tabs in a tab
  strip that's always open, with real drawers adding closable tabs
  alongside them (Steps 4/5, one shared implementation). What's still
  missing is covered by Steps 6 and 7 below.

Each step below ships something independently visible and testable on a
real phone — none of them require the others to be finished first except
where a dependency is called out.

---

## Step 1 — Rename the three panels

Rename "Story Dashboard" → **Composer**, "Narrative Composer" → **Navigator**,
"Co-Pilot" → **Advisor** in every user-facing label. No layout change, no
data-shape change — this just stops three later steps from being built,
described, and tested under names that are about to change out from under
them.

## Step 2 — Desktop: split Composer and Navigator into two columns

At the desktop tier only (≥1024px), split today's single Dashboard column
into two side-by-side panels: Composer (the WHO/WHERE/WHAT/WHY/HOW
sections) on the left, Navigator (the pressure dials and a scene-summary
panel) beside it. Tablet and phone are untouched by this step — they still
show whatever today's single-column reflow produces, addressed in Steps 4–5.

## Step 3 — Desktop: make the Advisor share space with drawers correctly

Today the Advisor is either fully on-screen or fully hidden. Change it to:
standalone in its own column when no drawer is open; the moment any drawer
opens, the Advisor joins that drawer's tab strip as an ordinary tab instead
of getting covered by it. While it's sitting in that tab strip with a
decision still waiting on the GM, flag its tab visibly (a highlight color,
or a star next to its name) so a pending decision is never missed just
because it's behind other open tabs. This reuses the drawer tab-strip
mechanism that already exists — the Advisor becomes eligible to appear in
it, rather than the tab strip being rebuilt.

## Step 4 — Tablet: Composer/Navigator's tablet behavior (built)

Decided the way this section originally recommended: at 768–1023px there
usually isn't room for Composer, Navigator, *and* an open drawer side by
side, so tablet now gets the exact same always-open, permanently-pinned
tab menu as phone (Step 5) rather than the desktop two-column split. What's
actually built: `isCompactTab()`'s breakpoint widened from phone-only
(767px) to the full compact tier (1023px) — one constant change, since
Step 5's tab-pinning/drawer-panel machinery was already generic and never
assumed phone specifically. The Advisor's old tablet-specific slide-in
panel (a separate `data-toggle-copilot` summon/dismiss toggle, distinct
from phone's bottom sheet) is retired along with its edge-nav button at
this tier — redundant now that Advisor is always reachable as a pinned tab
here too, and a second, separate way to reach the same content would just
be confusing.

The one thing this section originally flagged as needing real-device
judgment — "a large tablet in landscape may have enough room to behave like
desktop instead" — is still worth a real check if a specific large-tablet
case turns out to feel cramped by this; the current call treats all of
768–1023px uniformly with phone rather than special-casing landscape.

## Step 5 — Phone: the unified tab menu (built)

The step that actually delivers "usable on a phone" — and the one real
device testing proved was necessary, not optional: the original plan
("Composer and Navigator content is always on-screen, just reflowed to one
column") shipped as part of Steps 1–3 and turned out not to work in
practice — Navigator was effectively unreachable below a long Composer, not
merely inconvenient to scroll to. What's actually built now:

- One panel visible at a time, full width, inside the same drawer panel
  drawers already use.
- Composer, Navigator, and Advisor are permanently pinned, unclosable tabs,
  always present — not "equal tabs among everything," specifically
  pinned-and-protected so they can never be closed out from under the GM
  the way an ordinary drawer can.
- Any other opened drawer (Guide, Oracle, ...) adds its own closable tab
  alongside the 3 pinned ones, exactly like the desktop tab strip already
  worked (Step 3) — never replaces them.
- `.mc-workspace` (the old always-on-screen Composer/Navigator rendering)
  is hidden entirely on phone and its content isn't even generated there,
  rather than existing invisibly in the DOM alongside the tab version.
- **Fixed after real-device follow-up**: `.mc-drawer` (the panel all of
  this renders inside) now reliably spans the full available width up to
  the edge nav at every compact width, not just the narrowest phones — it
  previously fell back to a `min(420px, 88vw)` cap above 480px, leaving a
  gap that read as the always-visible edge nav covering the Storyboard.
- The drawer's "collapse to peek behind it" control is hidden on phone —
  there's nothing behind it to peek at once `.mc-workspace` is hidden, so
  collapsing would just show a blank screen.

Depended on Step 2 (Composer and Navigator had to exist as two separable
things before they could become two separate tabs) — done first, as
planned.

## Step 6 — Phone-tier polish pass

Once Step 5 is in place, a dedicated pass over the result before calling it
done:

- **Touch target size** — every tab, icon button, and roll button meets a
  comfortable minimum tap size; audit anything carried over from a
  desktop-first control (a small icon-only button that relied on a hover
  tooltip, in particular — hover doesn't exist on a touchscreen).
- **Confirm the existing single-column field reflow (the <=480px tier)**
  still applies cleanly inside the new Composer/Navigator tabs — this rule
  already exists for other fixed-column grids; it just needs to cover
  whatever markup Step 2 introduces.
- **Confirm the touch-drag-with-hover-dwell gesture** still resolves
  correctly against the new tab set — dragging an entity onto a tab that's
  now "Composer" or "Navigator" instead of only ever a drawer needs the
  same ~500ms switch-without-releasing behavior the drawer tabs already
  have.
- **Confirm the unblurred-field-safety-net** (force-blur on unload) still
  fires correctly when the active panel is a tab rather than the always-
  visible Dashboard it was written against.

## Step 7 — Verify the Moves-menu icon lands correctly at compact widths

Not a separate build (the Moves menu itself is scoped in
`functional-requirements-v3.md`, not here) — just a placement check once
both land: the running-figure icon lives in the Navigator's top-right
corner. Navigator is already its own pinned tab at every compact width now
(phone and tablet alike, Steps 4/5) — confirm the icon is still visible and
tappable there rather than needing to move into a header row — a
five-minute verification, not new design work, but easy to forget since
the icon was designed against the desktop two-column layout first.

---

## Also built: linking entities on phone (not part of the original 7 steps)

A gap Steps 4/5 exposed rather than fixed: creating a relationship between
two entities normally means dragging one onto the other, which needs both
visible at once — true on desktop (Cast can sit beside the Composer), no
longer true at compact widths once the drawer became the one visible panel.
The Entity Editor's Relationships section already had a no-drag fallback (a
plain `<select>` + Link button), but nothing better for a long Cast. Added:
a "🔍 Find entity to link" button opens a searchable list — reusing the
same `filterEntities()` Cast's own search bar uses — as a smaller floating
window over the top half of the Entity Editor panel (`.mc-drawer` always
carries a `transform` for its slide animation, which per spec makes it the
`position: fixed` containing block for anything nested inside it — so the
overlay anchors to the panel itself with no extra positioning math, and
stays pinned to the top half regardless of how far the editor content
underneath has been scrolled). Tapping a result links it immediately (the
same default `linked` relationship a desktop drag-drop creates) and closes
the overlay — deliberately tap-to-link, not drag-to-link, since cross-panel
touch drag is one of the more fragile mobile interactions to get right
without a real device to verify it on.

## Build order — actual

**1, then 2, then 3, then 5 (using 2's output), then 4 — all built, in that
order.** 4 turned out to be exactly the one-line breakpoint change Step 5's
design predicted, once Step 5 itself existed to extend. 6 and 7 remain.

## Non-goals (explicitly out of scope)

Drag-to-reposition panels, independently resizable (2×/3×) drawer widths,
and a drawer popping out into its own browser window — all deferred in
`functional-requirements-v3.md` for the same reason they're deferred here:
this roadmap is the smallest version that actually makes the app work well
on a phone, and none of those three are required to get there.
