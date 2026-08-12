# GMAtlas — UX & Mobile Design Roadmap

**Build status (2026-08-11): Steps 1–3 are built and verified** (450
domain tests pass unaffected; a jsdom-driven mount of the real built bundle
confirmed the Advisor tab-strip behavior end-to-end — open a drawer →
Advisor joins the tab strip with no close button → switching to it renders
its content and marks it active → closing the last real drawer resets
correctly). **Steps 4–7 are not built** — Step 5 in particular (the phone
unified tab menu) is a genuinely larger change than 1–3 and this session's
tooling has no real device or browser to visually verify a mobile layout
against, only jsdom (structural checks, not visual ones) — so it's left for
a pass with real device/browser QA available, per the same discipline this
project's own ADR 0033 already documented once before. Steps 1–3's detail
below is now a description of what shipped, not a plan; Steps 4–7 are
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
- What's genuinely missing is the Composer/Navigator split (today they're
  one scrolling column with a sticky corner, not two panels) and a version
  of the tab-strip mechanism that also covers Composer and Navigator on a
  phone, not just the Advisor and the drawers.

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

## Step 5 — Phone: build the unified tab menu

The biggest step, and the one that actually delivers "usable on a phone."
Today, Composer and Navigator content is always on-screen (just reflowed to
one column) — it isn't behind a toggle the way the Advisor already is. This
step gives it one:

- One panel visible at a time, full width.
- Composer, Navigator, Advisor, and every drawer become equal tabs in one
  tab menu — the same mechanism, extended to cover panels that aren't
  drawers today.
- Composer and Navigator are pinned first in the tab order, since they're
  used every scene; the Advisor and drawers follow behind them.
- Opening a drawer behaves exactly like it does today, just full-screen
  instead of the current edge-panel width.

Depends on Step 2 (Composer and Navigator have to exist as two separable
things before they can become two separate tabs).

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

## Suggested build order

1 → 2 → 3 can ship independently and in any order relative to each other
(none touches phone/tablet CSS). 4 depends on deciding tablet's behavior,
which is cheapest to decide *after* Step 5 exists, since "tablet = phone's
tab menu" becomes a one-line CSS-tier change once that menu is built — so
in practice: **1, then 2, then 5 (using 2's output), then 3, then 4, then
6, then 7.**

## Non-goals (explicitly out of scope)

Drag-to-reposition panels, independently resizable (2×/3×) drawer widths,
and a drawer popping out into its own browser window — all deferred in
`functional-requirements-v3.md` for the same reason they're deferred here:
this roadmap is the smallest version that actually makes the app work well
on a phone, and none of those three are required to get there.
