# GMAtlas — UX & Mobile Design Roadmap

**Build status (2026-08-12): Steps 1, 2, 3, and 5 are built and verified.**
Step 5 landed after real-device testing (on a phone, via the deployed
GitHub Pages build) found the original Step 1–3 phone behavior genuinely
broken — Composer and Navigator stacked as one long scrollable page, and in
practice Navigator was unreachable below a long Composer, not merely
inconvenient to reach. The fix actually built is the real Step 5 design:
Composer, Navigator, and Advisor are now permanently pinned, unclosable
tabs in a tab strip that's always open on phone (<768px) — opening any
other drawer (Guide, Oracle, ...) adds a fourth, closable tab alongside
them rather than replacing them. Verified via 450 passing domain tests
(unaffected) plus two jsdom-driven mounts of the real built bundle at both
a phone viewport (375×720 — confirmed the 3 pinned tabs, no close buttons
on them, Composer as the default landing tab, switching to Navigator and
back, a real drawer correctly adding a 4th closable tab and the 3 pinned
ones surviving its close) and a desktop viewport (1440×900 — confirmed
nothing about Steps 1–3's existing desktop behavior regressed: Composer/
Navigator still render inline, the tab strip still starts hidden, opening
a drawer still shows only that drawer + Advisor, not the phone pins).
**Steps 4, 6, and 7 remain open** — Step 4 (tablet's own placement decision)
and Step 6 (a dedicated touch-target/gesture polish pass) still have no
real-device visual verification behind them; Step 7 depends on the
still-unbuilt Moves menu. Steps 1, 2, 3, 5's detail below is now a
description of what shipped, not a plan; Steps 4, 6, 7 are
still the plan.

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

- Three real breakpoint tiers already exist in `styles/cockpit.css`:
  **desktop** (≥1024px), **tablet** (768–1023px), **phone** (<768px, with
  an additional <=480px tier for finer single-column field reflow).
- The Advisor (today's Co-Pilot panel) already has three different
  presentations, one per tier: a permanent region on desktop, a slide-in
  edge panel on tablet, and a bottom sheet on phone — summoned/dismissed by
  the same mechanism at every tier, just a different transform axis.
- A single-panel drawer system with a tab strip already exists (at most one
  drawer panel visible at a time, multiple pinned drawers share a tab
  strip), together with a from-scratch touch-drag-with-hover-dwell gesture
  (holding a drag over a tab or the header for ~500ms switches to it
  without ending the drag) that already makes cross-panel drag-and-drop
  work on a touchscreen.
- Steps 1, 2, 3, and 5 (below) are now built on top of that infrastructure:
  Composer and Navigator are two real independently-scrolling panels
  (Step 2), the Advisor shares the desktop drawer tab strip when a drawer
  is open (Step 3), and on phone all three are permanently pinned tabs in
  a tab strip that's always open, with real drawers adding closable tabs
  alongside them (Step 5). What's still missing is covered by Steps 4, 6,
  and 7 below.

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

## Step 4 — Tablet: decide and build Composer/Navigator's tablet behavior

Real open question this roadmap flags rather than assumes: at 768–1023px
there usually isn't room for Composer, Navigator, *and* an open drawer
side by side. The Advisor already treats tablet like a narrower version of
phone (a slide-in edge panel, not a permanent region) rather than a wider
version of desktop — recommend treating Composer/Navigator the same way at
this tier: tablet gets the phone-style tab menu from Step 5 below, not the
desktop two-column split from Step 2. Confirm this against a real device
before committing — a large tablet in landscape may have enough room to
behave like desktop instead, and that's a five-minute check worth doing
before writing the tablet-specific CSS.

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

## Step 7 — Verify the Moves-menu icon lands correctly on phone

Not a separate build (the Moves menu itself is scoped in
`functional-requirements-v3.md`, not here) — just a placement check once
both land: the running-figure icon lives in the Navigator's top-right
corner. Once Navigator is its own phone tab (Step 5), confirm the icon is
still visible and tappable at phone width rather than needing to move into
a header row — a five-minute verification, not new design work, but easy to
forget since the icon was designed against the desktop two-column layout
first.

---

## Build order — actual

**1, then 2, then 3, then 5 (using 2's output) — all built, in that order.**
4 is next: it's cheap now that Step 5 exists ("tablet = phone's tab menu"
is close to a one-line CSS-tier change, since the machinery Step 5 built is
already generic) — real-device confirmation on an actual tablet is the only
reason it hasn't shipped yet. 6 and 7 follow behind it.

## Non-goals (explicitly out of scope)

Drag-to-reposition panels, independently resizable (2×/3×) drawer widths,
and a drawer popping out into its own browser window — all deferred in
`functional-requirements-v3.md` for the same reason they're deferred here:
this roadmap is the smallest version that actually makes the app work well
on a phone, and none of those three are required to get there.
