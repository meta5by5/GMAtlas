# Saga Atlas — New Functionality Design

*Companion to the Phase 0 foundation. Covers what the re-architecture now makes possible, what is already built, and what is proposed next.*

---

## Where we are

Phases 0–3D are implemented and tested (57 passing unit tests + browser smoke tests):

- **Phase 0** — single versioned campaign document, one store, lossless migration.
- **Phase 1** — the v0.53 engine ported into a *pure* domain layer: oracle roll engine, scene generation, context model, and session orchestration. All headlessly testable.
- **Phase 2** — the cockpit actually runs a session: editable WHO/WHERE/WHAT/WHY/HOW, "Continue Story" scene generation, "Shift Story" manual controls, a searchable Oracle drawer, an auto-populating Journal, a live Co-Pilot, and the breadcrumb timeline — all persisting locally and surviving reload.
- **Phase 3A** — Entity Inspector + `@mention` auto-linking; WHO/WHERE cards populate from real entities.
- **Phase 3B** — force-directed relationship graph over entity links.
- **Phase 3C** — NPC/vehicle statblocks, drag-and-drop entity linking and drag-to-mention into Journal/context fields, a Build/changelog panel in Settings.
- **Phase 3D** — statblock fields double as Crew-Link-style numeric tracks: click-to-set scale boxes plus double-click-to-roll.

The key unlock is that **everything now reads and writes one campaign model through pure functions.** New functionality is no longer a monkey-patch fighting previous layers; it's a new pure module plus a small view. The rest of this document is what that buys us.

---

## Already built as new functionality (beyond v0.53 parity)

### 1. The session loop as one integrated flow
In v0.53, scene generation, oracle rolls, journaling, and the cockpit were separate surfaces stitched together. Here, **Continue Story** generates a scene from the *current context*, escalates threat/mystery when the consequence warrants it, drops a breadcrumb, and files the scene to the Journal — in one action. The GM never leaves the workspace.

### 2. Story-shift reducers (the manual control layer)
The design chat asked for deliberate controls to "change WHO/WHERE/WHAT/WHY/HOW without hunting through tabs." Delivered as named, pure reducers — *Reveal Clue, Complicate, Reward, Raise/Lower Threat, Advance Time, Change Location, Introduce NPC, Set Objective* — each recorded on the timeline. The same reducers power the workspace chips **and** the Co-Pilot's Quick-Apply, because they're just functions.

### 3. A Co-Pilot that acts, not just talks
`advise(campaign)` is a pure function returning an observation, a consequence, an opportunity, a **clickable** suggested oracle (adapts to the active question and pressure), and quick-apply shifts. Because it's Ut-free, it is independently testable today and swappable for an LLM-backed advisor later behind the exact same signature — no UI change.

### 4. Threads (progress clocks)
v0.53 had a single free-text "current thread." This branch adds first-class **progress clocks**: named threads with fillable segments, tracked in the WHY view, advanced/retired with one click, and — crucially — **read by the Co-Pilot**, which flags the clock nearest completion ("*'Escape the station' is 3/4 — one more push resolves it*"). This is the kind of at-a-glance decision support that makes the cockpit feel like an operating system rather than a generator.

### 5. Entity Inspector + `@mention` auto-linking (Phase 3A)
WHO/WHERE cards populate from real entity records instead of free text. Typing `@Name` or `@[Multi Word]` in a journal note or a context field creates the entity if missing and links everyone co-mentioned. The inspector edits name, type, tags, a shared overview, and GM-only revealed/hidden notes.

### 6. Relationship graph (Phase 3B)
A deterministic, pure force-directed layout (`domain/graph.js`) renders entity relationships as an SVG graph in the Graph drawer — nodes colored/sized by type and connection count, click-through to the inspector, live badge counts on the edge tabs.

### 7. Statblocks + drag-and-drop (Phase 3C)
- **Statblocks:** NPC entities auto-attach a system-agnostic statblock (Role, Disposition, Health, Combat/Danger, Notable Gear, Motivation); asset entities tagged `#vehicle` auto-attach a vehicle statblock (Hull/Integrity, Speed, Armament, Crew Capacity, Condition). Both are ordered key/value fields you can rename, add to, or remove — deliberately not tied to one ruleset, matching "genre-aware, not genre-locked." Any entity can also have a statblock added manually.
- **Drag-and-drop entity linking:** drag an entity chip or Cast-drawer row onto another entity to create a relationship — the direct-manipulation counterpart to the existing dropdown-based Link control (kept as the accessible/keyboard/touch fallback).
- **Drag-and-drop into Journal and context fields:** drag an entity onto the Journal note composer or any WHO/WHERE/WHAT/WHY/HOW text field to insert an `@mention` at the cursor, which auto-links on save — the same mechanism `@`-typing uses, just via direct manipulation.
- **Build panel:** Settings now shows the current phase, version, and a running changelog, hand-maintained in `src/core/buildInfo.js` so a returning GM can see what changed without checking git history.

### 8. Statblock tracks + double-click-to-roll (Phase 3D)
Requested directly against the Crew Link Starforged character sheet as a visual/interaction reference. Any statblock field can now be a numeric **track** instead of free text — a row of click-to-set boxes (click box *n* to set the value to *n*; click the active box again to step it down, so a full track zeros out one click at a time), matching the Health/Spirit/Supply/Safety meter widgets in that sheet. Health and Hull/Integrity are tracks by default; any other field — including a brand-new one added via **+ Track** — converts between text and track with a single toggle (`#` / `Aa`), so this stays data-driven rather than hardcoding Starforged's specific stat names. Double-clicking a track's value badge rolls it: `domain/dice.js` implements the action-die-vs-two-challenge-dice mechanic (d6 + value vs 2d10, Strong Hit / Weak Hit / Miss, with matches flagged) as a pure, RNG-injectable function — the same reference mechanic v0.53's Starforged roller used, now testable and filed to the Journal like any other roll.

---

## Proposed next (ranked by value / effort)

### A. Document Library + `@` pointers to documents (Phase 4)
v0.53 could upload PDFs to browser storage and link a page from the Guide/Journal editor by typing `@` and picking a document. This branch's `@mention` system currently resolves only to **entities** — pointing to **documents** needs the Document Library to exist first (`campaign.documents.library` is reserved in the schema but unbuilt). Scope: PDF upload/local storage, an indexed library list in the Docs drawer, and extending `parseMentions`/the `@`-autocomplete UX to offer documents alongside entities, inserting a page-anchored link. *Effort:* medium-large — this is the next "real infrastructure" phase, similar in weight to entities was.

### B. Session recap ("Previously on…")
One click composes a recap from the timeline + recent journal + open threads. *Payoff:* start every session oriented in ten seconds. *Effort:* low — a pure function over data we already keep. This is the natural first place to add optional LLM assistance behind the existing pure-function boundary.

### C. Oracle table editor
The data model already carries `oracles.overrides`, and the roll engine already honors them (`tablesWithOverrides`, tested). Add an editor in the Oracle drawer to add/rename/reweight entries. *Payoff:* the "edit popup doesn't load" complaint from the chat, fixed structurally. *Effort:* low–medium.

### D. Genre packs
`SCENE_TABLES` is data and `settings.genre` is a lens. Package alternative table sets (and tone defaults) as selectable "genre packs" so the same cockpit runs a non-Hostile setting. *Payoff:* delivers the "genre-aware, not genre-locked" principle concretely. *Effort:* medium — a loader + a second data set.

### E. Companion tools done right (Phase 4)
Crew Link and the Shipyard become **new-tab companions with in-app fallback links**, never embedded iframes — which is the structural fix for the Android failure noted in the chat. *Effort:* low.

### F. Sync adapter / Crew Log shared database (Phase 6, future)
Because persistence is one module with a narrow interface and the campaign is a single clean document, adding a sync backend is an *adapter*, not a rewrite. The Crew Log merge then becomes "two front-ends over one document schema." *Effort:* larger, but isolated — nothing above depends on it.

---

## Why this ordering

Documents (A) is next because it's the one remaining piece of "@ pointers... like the ChatGPT version did" that wasn't already achievable by extending the entity model — it needs its own storage and indexing, so it's scoped as its own phase rather than bolted onto 3C. B–D are high-value but independent polish, and each remains a self-contained module thanks to the foundation. E–F round out reach and, eventually, sync.

---

## Testing posture

Every new capability lands as a pure domain function with unit tests first (as Threads did), then a thin view and a browser smoke check. The invariant: the risky logic never lives in the DOM, so "can a GM run a four-hour session without the software breaking" stays an assertion we actually run, not a hope.
