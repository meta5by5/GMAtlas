# Factions — Roadmap

**Status:** Proposal, rewritten 2026-11-21. Nothing here is built yet.
It replaces the first draft (2026-11-20).

**Governed by:** [Faction-baseline.md](Faction-baseline.md). The baseline
consolidates the Living Faction Engine SRS
(`requirements/GM_Atlas_Living_Faction_Engine_Requirements.pdf`), the
owner's answers, the GMAtlas architecture rules and a fresh research pass.
This file is the **build plan**: open questions, UX changes across panels,
phases, tests and acceptance. Wherever this file and the baseline differ,
the baseline wins. Section numbers such as "B4.5" refer to the baseline.

**Build discipline:** every phase follows the same order:
1. Pure domain functions with `node --test` coverage.
2. A thin view.
3. A jsdom smoke run against the built bundle.
4. A review stop.

All content is original (B3, answers 1 and 16).

---

## 0. Open questions

The 17 original questions are answered (B3). The redesign raised the
questions below. Each has a recommendation, and the plan assumes the
recommendation until you say otherwise.

**Decided 2026-11-21** (removed from this list):
- **Routine work needs no confirmation** (SRS 14.4). Auto-apply quiet
  moves is **on by default**. Routine changes are applied and recorded
  without a review item, shown in History, and undoable (B3 answer 4,
  conflict C1).
- **The Conflict entity type** exists: internal `faction-conflict`,
  labeled **Conflict**. It was built ahead of F0 (B2, F0 below).

The questions still open:

1. **Starter factions.** *Recommendation:* when the Factions panel is
   empty, it **offers** "Generate a starting trio". Three factions are
   generated, with colliding objectives (R1–R3) and a seeded web. This is
   never automatic.

2. **The Encounter-count trigger.** *Recommendation:* the default is
   every **3** Encounters, for rulesets without a campaign-turn workflow.

3. **An app-wide Review Queue?** The change-set and review machinery is
   generic. *Recommendation:* build it for Factions first, with a
   `source` field on each change set. Trade events, expeditions and
   missions could feed the same queue later, without a redesign.

4. **The existing SWN turn controls.** *Recommendation:* until F7 wraps
   the SWN engine as a resolution style, the current Step and Full Round
   controls stay available in the Factions panel under **History ›
   Classic SWN turn**. No existing campaign loses a feature.

---

## 1. Goal and success measures

These are the SRS 1.5 measures, made specific to GMAtlas:

| Measure | Target |
|---|---|
| GM effort | Routine faction work needs **no confirmation** (Auto-apply quiet moves, on by default). A turn with nothing above low impact needs **zero** taps. No faction field is required beyond name, type, motivation and one objective |
| Decision quality | A turn surfaces **at most 3** interactive decisions on Steady. Everything else is a brief or routine |
| Continuity | Every accepted event updates the entity, the graph edge, the journal and the Timeline in one atomic apply |
| Explainability | Every proposal shows its trigger, intent, top three reasons, confidence and impact. The detail sits behind one tap |
| Campaign vitality | At least one Conflict per three turns comes from the relationship web, on Steady with three or more factions |
| Reversibility | Every applied change set can be undone, and the audit trail is kept |
| Portability | An export made before F0 imports unchanged, and a new export survives a round trip |

---

## 2. UX integration across panels

The SRS asks that faction work happen **without leaving Mission Control**
(SRS 4.1, 4.7). The research points the same way: local graphs,
pinnable breakdowns, and the triage patterns of productivity apps. These
changes touch the whole shell, not only Factions. Each one is assigned
to the phase that builds it.

### U1. The context strip stays (F1)
- Every faction view opens as a drawer tab, or in a Storyboard position.
  The Encounter form's WHO/WHERE/WHAT/WHY/HOW strip is never covered.
- **WHO** and **WHERE** gain **present-faction chips**: the factions at
  the current Location, from `factionsPresentAt`, plus those tied to
  NPCs in WHO.
- Each chip shows its stance as a glyph and a number, such as "⚔ −2
  Hostile", never color alone.

### U2. One peek popover for every entity (F1)
Clicking any entity chip (faction, NPC, Location, Conflict, Asset) opens
a **peek popover** before it opens a full tab. The popover holds:
- a two-line summary;
- the stance with the party;
- the current operation;
- 3–4 quick actions;
- **Open** and **Pin**.

Pinning keeps it open, and it can be clicked into, which answers the
Crusader Kings complaint (R11). It replaces hover-only tooltips for
breakdowns, and it works by touch.

Cast, the Graph, the Timeline, the wiki, Encounter chips and the Factions
panel all use it. This is one component in `ui/`, with one
`data-entity-peek` handler branch. It cuts "inspect a faction, its NPC
and a location" to three taps (SRS 4.7).

### U3. The Factions panel (F1, growing through F5)
This replaces the **Faction Events** button in the right nav, in the
same slot with the same `faction-events` id, so saved layouts keep
working.

It has the SRS's eight views as tabs, shown progressively:

| Tab | Shown | Contents |
|---|---|---|
| **Overview** | Always | Answers SRS 4.3's seven questions. See the sketch below |
| **Factions** | Always | Directory of cards (SRS 4.4), with filters and search |
| **Web** | When there are 2+ factions | A **directional matrix**: each cell split diagonally, A→B and B→A (R13), showing stance number and label, a tension dot, and the breakdown on tap. A list of pairs on a phone |
| **Plans** | When objectives exist | Objectives → Projects (Thread clocks with Signs) → Operations |
| **Conflicts** | When any exist | Conflict cards: stage on the ladder, pressure clock, sides, stakes, asks |
| **History** | Always | Events by turn, each with its consequence chain. Filters: faction, location, conflict, NPC, type. Includes the existing event log |
| **Assets & Territory** | Advanced mode, or when any exist | Assets, territory edges, location state |
| **Review** | When anything is pending | The Review Queue (U8). Its tab badge shows the pending count |

**Overview sketch** (desktop):
```
┌ Factions ─────────────────────────────── [▶ Faction Turn] [⚙] ┐
│ Needs you (2)                                                  │
│  ◆ CRITICAL  Helios blockade of Port Meridian      [Review]    │
│  ◇ REVIEW    Miners call in a debt from the party  [Review]    │
│ Since last turn                                                │
│  • Guild tariffs rise (routine, applied)  • Cult recruits …    │
│ Escalating                                                     │
│  ⚔ Docks dispute · Confrontation (3/7) · pressure ▰▰▰▱ [Open]  │
│ Likely next                                                    │
│  Helios → legal pressure on the inspector (because: exposure,  │
│  objective "Control exports", methods: legal)                  │
│ New opportunities                                              │
│  ★ Secure the inspector's testimony         [Promote ▾]        │
└────────────────────────────────────────────────────────────────┘
```

**Faction detail** follows SRS 4.5's sections, in this order:
Identity, Motivation & Behavior, Leadership & Faces, Objectives,
Capabilities, Relationships, Territory & Assets, Memory, History, Hooks.
- Sections start collapsed, except the first two.
- Empty sections show one "＋ add" line rather than blank fields.
- A **local graph**, one or two hops (R16), sits beside Relationships.

### U4. One attention system (F4)
- Nav buttons and cards share one badge component with four states:
  normal, **watch**, **review**, **critical**. Each state is an icon plus
  a word; color is a third cue, never the only one.
- The right-nav Factions button shows the number of pending decisions.
- A critical item is never only in a feed. It appears in "Needs you" and
  in the badge (SRS 12.3).
- The component is generic, so other subsystems can use it later (Q3).

### U5. The Navigator's Factions card (F3)
The Storyboard **Navigator** column gains a compact **Factions** card,
below the workflow card. It holds:
- the top three attention items;
- the next likely action;
- **▶ Faction Turn**.

When the campaign-turn workflow reaches its **Faction Events** step, the
workflow card shows **Run Faction Turn** inline (B4.7). This is the
SRS's "managed centrally from the navigator" (conflict C2).

### U6. The Graph (F7)
- The Graph drawer gains a **Factions lens**: faction nodes plus faces
  and turf. Edge style shows stance, and edge weight shows intensity.
- It gains a **health check** that lists isolated factions, stale edges,
  and missing faces or turf, each with a fix-it action (R16, SRS 10.4).
- Entity pages use the local graph (U3).

### U7. The Timeline as the single history (F2)
The **Timeline** panel becomes the one place to see campaign history in
order:
- scenes;
- Encounters;
- journal entries;
- campaign turns;
- faction events, which carry a turn marker and a consequence chip.

It has the SRS 10.2 filters: faction, location, conflict, NPC, mission
and event type. The Journal stays the narrative record, and the Timeline
links to it.

### U8. The Review Queue (F4)
The interaction model takes the useful parts of triage inboxes (R17):
- **Accept** (A); **Modify** (M); **Reject** (R), which asks for an
  optional reason and offers "don't propose this again", suppressing
  retries (SRS 5.4); **Defer** (D), with presets: next turn, next
  session, or until a named trigger.
- **Resolve manually** and **Convert to hook** sit in the ⋯ menu.
- Two tabs: **Needs decision** (the default) and **Briefs**. Routine
  changes never appear as separate items.
- Keyboard shortcuts work on desktop. On a phone, a full-screen card
  with large buttons replaces them, and there are no swipe gestures.

### U9. The decision card (F4)
This follows SRS 5.3, with only the essentials shown at first:
```
┌ ◆ HIGH · Helios imposes a partial blockade on Port Meridian ────┐
│ Because: governor granted emergency authority (trigger) ·       │
│ objective "Control exports" · methods: legal, security          │
│ [Accept]  [Modify]  [Defer ▾]  [Reject]                  ⋯      │
│ ▸ Why (confidence: likely)   ▸ Changes (5)   ▸ Hooks (3)        │
└─────────────────────────────────────────────────────────────────┘
```
- **Why** expands to show:
  - the trigger;
  - the faction's intent;
  - the top three relevance reasons;
  - the resolution factors;
  - the assumptions.
- **Changes** expands to a before→after list. Each row has a checkbox,
  an impact chip and a dependency note.
- **Hooks** lists the proposed Hooks, each with **Promote**.
- **Provenance** links to the source entities and earlier events.

### U10. One set of verbs (F1)
Every faction, Conflict and Overview control uses the SRS 4.7 verbs:
Advance, Observe, Resolve, Review, Intervene, Negotiate, Escalate,
Reveal, Defer. The same word always means the same thing.

### U11. Settings › Factions (F3, extended in F7)
One Settings section holds:
- Mode, Pressure and Resolution style;
- the trigger (campaign turn step, every N Encounters, or the button
  only);
- Auto-apply quiet moves (on by default);
- approval thresholds;
- the stage cap;
- retaliation on or off, and the session-start relationship roll.

Each setting has one line of help that says what changes and what
doesn't.

### U12. The wiki (F2, extended in F6)
Faction and Conflict pages gain sections derived from the engine:
- History;
- Relationships, with stance and ties;
- Territory;
- Hooks.

Player View shows only public and player-known items (B4.10).

### U13. Phone and tablet (every phase)
- On a phone, the Overview is a single column and a decision opens as a
  full-screen card. The Web is a list of pairs, and the tabs scroll
  sideways.
- The Factions panel follows the existing compact tab-strip rules
  (`isCompactTab()`).

### U14. Search and filters (F3)
The search panel gains filters, using the existing chip pattern:
faction type, relationship (stance or tie), status, objective, location,
conflict and activity (SRS 4.7).

### U15. Look and accessibility (every phase)
- Never color alone.
- Respect reduced motion: clocks fill without animation.
- In the fantasy look:
  - titles use Metamorphous;
  - numbers and labels use `--font-ref`;
  - brief prose uses Lancelot;
  - generated guidance uses `--font-guide`.

---

## 3. Phases

These follow SRS 15.1, mapped onto GMAtlas.

**The MVP (SRS 15.3)** is **F0–F4**, plus F5's basic Conflict object and
ladder.

### F0: Foundation
- **Schema.** Add the `campaign.factions` subtree (B4.12):
  - `schemaVersion` goes up by one;
  - `migrate.js` absorbs older documents;
  - existing data is read where it lives.
- **Sync and export.** `syncPolicy` classifies `factions.*` as metadata.
  Export and import round-trip it.
- **Edge metadata** on faction relationships, and the new relationship
  types (B4.4, B4.11), each with its target rules.
- **The `faction-conflict` entity type.** *Built 2026-11-21:* the type
  and label, its fields (stage 1–7, status, stakes, origin, resolution,
  branched-from, sides, four pressure gauges), mutators that keep each
  side's `involves` link in step, the entity-panel form with the
  seven-step ladder, its wiki fields, graph color and tag seeds, plus 6
  unit tests and a smoke run. F5 adds the pressure Thread and the tension
  engine on top.
- **The migration seed:** each `allied_with` and `rival_of` edge becomes
  a `migrated` Ledger entry.
- **Tests:**
  - an export from before F0 imports unchanged;
  - the round trip keeps every id and reference;
  - the migrated Ledger entries are created only once;
  - nothing existing is removed.
- **Exit:** no duplicate store; the migration and export strategy are
  written into the baseline (SRS phase 0).

### F1: Faction records and the Factions panel
- **Profile fields** (B4.2), added lazily and additively.
- **Stance and trust:** derivation, ripple, pins and the grouped
  breakdown (B4.4).
- **Original oracle tables** (generic plus fantasy, sci-fi and
  cyberpunk):
  - type, motivation, drive, behavior;
  - objectives with Signs;
  - methods, faces, public face and hidden agenda.
- **The generator:**
  - `generateFaction(campaign, {seed, genrePack, locationId})`;
  - the collision rule (B4.3);
  - the starting trio (Q1).
- **Views:**
  - U1 chips (read-only in this phase), the U2 peek popover;
  - U3's Overview (static sections), Factions, Web and faction detail;
  - U10 verbs.
- **Tests:** decay, clamping, pins, ripple signs, grouped reasons, the
  collision rule, and a seeded generator producing identical output.
- **Exit:** the GM can create, edit and link factions, and navigate
  every core relationship (SRS phase 1).

### F2: Events and history
- **Records:** Trigger, Action, Event, ChangeSet and Hook, each with a
  stable id and links both ways along the object chain (SRS 3.3).
- **Record an event:** a GM-authored event that produces a change set,
  which can be applied and undone (B4.6).
- **Quick actions on the U1 chips:** helped, hurt, struck a deal,
  betrayed, exposed. Each one is a player-action trigger plus a Ledger
  change. They go through change sets, with an inline confirm.
- **Journal and Timeline:** a journal entry for each accepted
  significant event, and the **U7 Timeline** integration.
- **Entity history** derived from applied change sets (C9).
- **Wiki:** the U12 History section.
- **Tests:**
  - apply, then undo, gives back the identical record;
  - the version check catches a GM edit made after the proposal;
  - idempotency keys stop duplicates.
- **Exit:** a manually authored event updates records through a
  structured change set (SRS phase 2).

### F3: The decision and simulation loop
- **The pipeline** steps TRIGGER through PROPAGATE (B4.5):
  - relevance scoring, with the top three reasons;
  - candidate actions from the 27 SRS families, using original tables;
  - behavior and method weighting, and a variety penalty;
  - **the GMAtlas resolution style**, with seven outcome bands;
  - budgets, cooldowns and fingerprints;
  - deterministic seeds;
  - runs with ids, where a reroll keeps the earlier run.
- **The Faction Turn button and its preview.** **U5** Navigator card.
  **U11** Settings (Mode Standard, Pressure Steady). **U14** filters.
- **Tests:**
  - an irrelevant faction is filtered out;
  - a cautious faction doesn't choose open war;
  - the same seed produces the same run;
  - the budget holds;
  - a faction with no ratings still produces a narrative-level
    suggestion (SRS 14.3).
- **Exit:** a player action and a Faction Turn both produce explained
  responses (SRS phase 3).

### F4: GM review and propagation
- **Impact rules** as data (B4.6 table).
- **The Review Queue:** **U8** and **U9**, with partial approval along
  dependencies.
- **Apply:** atomic, with version checks. Conflicting versions are shown
  side by side.
- **Undo.**
- **Propagation:** depth 2, a budget per run, and follow-on triggers
  queued for the next run.
- **Settings and badges:** the **Auto-apply quiet moves** setting (on
  by default: routine work needs no confirmation),
  and the **U4** attention badges.
- **Tests:**
  - a critical change is never applied by a bulk Accept or by
    auto-apply;
  - rejecting or deferring changes nothing;
  - a rejection marked "don't propose again" suppresses the equivalent
    proposal;
  - a follow-on reaction is queued, not run recursively.
- **Exit:** no major change can alter records silently (SRS phase 4).

### F5: Conflicts
- **Conflict entities:** `faction-conflict` with the full fields
  (B4.8.1), the seven-stage ladder, and pressure Threads.
- **Movement on the ladder:** de-escalate, pause, branch and reignite.
- **Starting Conflicts:** `tensionBetween`, which proposes a Conflict at
  6 or more; **asks** with pending Ledger costs (B4.9).
- **Death, split and merger**, each with its ripple bundle (B4.8.4).
- **Retaliation** and the **Pressure** dial: in proportion, in
  character, varied and warned first (B4.8.5), with fingerprinted
  combinations.
- **Tests:**
  - a Conflict reaches a new status quo and can reignite;
  - a split keeps the original faction's history and links the
    splinter;
  - a failed action causes a setback without leaping to war;
  - a retaliation's severity stays within one band of its cause;
  - the same retaliation family is never used twice in a row against
    the party.
- **Exit:** Conflicts produce consequences in both the world and the
  story (SRS phase 5).

### F6: Playable content
- **Promoting Hooks:**
  - to a **Mission**, through `generateMission` with the inherited
    context;
  - to an **Encounter**, by opening the Composer with
    WHO/WHERE/WHAT/WHY/HOW filled (B4.9);
  - to a **rumor or discovery**, as a journal note or Lore entity with
    a visibility state;
  - to an **open thread**.
- **Oracles:** suggestions in context (SRS 11.4). Accepted results are
  stored and linked to their event.
- **Territory:** the territory edges and Location state bands (B4.11),
  with the U3 Assets & Territory tab.
- **Sessions:** the session-start relationship roll, and the "While you
  were away" digest.
- **Tests:** the SRS 14.2 corporate-blockade scenario, end to end, as a
  domain test plus a jsdom smoke run (section 4).
- **Exit:** a faction event can be promoted into a playable Hook with
  its context inherited (SRS phase 6).

### F7: Modes and scheduling
- **Modes:** Passive, Standard and Advanced, with per-faction overrides,
  and pause, exclude, mute and freeze-all (SRS 12.4).
- **Triggers** (B4.7):
  - the **Faction Events step** in the 5PFH, Planetfall and Five Leagues
    turn-step lists and in Settings' shared workflows;
  - **every N Encounters**, read once from `factionPacing`;
  - **event-driven** runs for quick actions;
  - a preview before a large run.
- **Resolution styles:**
  - **Campaign ruleset** wraps `factionTurnEngine.js`, with its tests
    unchanged; this retires the Classic SWN controls from Q4;
  - **Oracle** and **GM decides**.
- **Five Leagues:** Enemy Threat and Enemy Plans link to the named enemy
  faction's project.
- **Graph:** the U6 Factions lens and health check.
- **Exit:** modes change how deep the simulation goes without changing
  the schema (SRS phase 7).

### F8: Advanced (each item optional)
- Internal politics: blocs, succession, coups.
- Tracking who knows what (SRS 13.3).
- Advanced resource pools.
- **✨ Retell this digest**, with AI, optional and off (answer 7).
- Map turf painting on Hexcrawl hexes and Location pins.
- The multiplayer table's player view (ACCOUNTS-SYNC S5).
- Per-PC standing.
- Faction analytics: wins, losses, pacing.
- **Exit:** advanced features stay optional and don't destabilize the
  core (SRS phase 8).

---

## 4. Test plan

**Unit tests** (`tests/domain.test.js`, or a new
`tests/factions.test.js` once there are many). They cover:
- triggers and idempotency;
- relevance and filtering;
- action choice, including behavior and variety;
- resolution bands;
- propagation depth and budget;
- change-set apply and undo, and version conflicts;
- the Ledger: decay, ripple, pins;
- the Conflict ladder;
- retaliation proportion;
- migration and round-trip export.

Every random step takes a seeded `rng`.

**End to end, the SRS 14.2 corporate blockade.** This is a domain test
plus a jsdom smoke run:
1. Seed Helios, the Miners and the Colonial Authority, Port Meridian,
   and the four assets.
2. The GM records "the governor grants Helios emergency authority".
3. The run selects Helios, the governor, the Miners and the colony, and
   filters out the others.
4. Helios chooses a blockade or permit restriction, with its reasons.
5. The run resolves it.
6. An event is created and linked.
7. A change set proposes five changes, with the colony's control/access
   change marked high.
8. The GM modifies the severity and approves.
9. The colony and faction records update, and so do the `controls`,
   `opposed_to` and `dependent_on` edges.
10. A journal entry and a Timeline item appear.
11. Four mission Hooks appear. Promoting one keeps its links.

**Regression cases** (SRS 14.3), each a named test:
- the same trigger processed twice;
- the GM edits between proposal and approval;
- a faction with no ratings;
- a paused faction (it doesn't act, but player-triggered updates are
  queued);
- a secret relationship hidden from Hook text;
- two factions contesting one place;
- a split that keeps history;
- a failure that doesn't escalate to war;
- a second reaction queued, not recursive;
- stable ids across export and import.

**Smoke checks** (jsdom, `file://` and `http://`):
- the Faction Turn runs, its review works, and its result persists
  across a reload (including a reload without leaving the field first);
- the peek popover and quick actions work;
- the Navigator card and the turn-step Faction Events step work;
- the phone layout works.

**Playtest:** one four-hour solo session on Steady. Record taps per
turn, decisions per turn, and whether a Conflict came from the web.

---

## 5. Compatibility

- **Kept and still used:**
  - `factions.js`, `factionTurnEngine.js`, `factionConflicts.js` and
    their tests;
  - `campaign.factionEvents` and `factionTurnNumber`;
  - `faction-pressure`, `faction-goal` and
    `faction-conflict-escalation` Threads;
  - SWN fields;
  - the Faction Events docking in WHERE (the Overview can dock there
    instead);
  - Encounters (internal `conflict`).
- **Read once and preserved:** `settings.factionPacing` becomes the
  Encounter-count trigger. The old value stays in the document.
- **Ids that stay the same:** `faction-events` (the panel), `colony`
  (the Timeline) and `composer` (the Encounter form). Only labels
  change.

## 6. Out of scope

These follow SRS 1.4 and B3:
- a full economy, logistics or tactical war simulator;
- a mandatory rules system or universal scale;
- AI deciding or rewriting canonical facts;
- simulating every minor faction continuously;
- duplicate faction-only stores;
- real-time multiplayer as a requirement;
- reading prose to infer who helped whom;
- background timers.

## 7. Acceptance

The release is accepted when every item in SRS 14.1 (functional), 14.3
(regression) and 14.4 (usability) passes, plus:
1. A new campaign reaches three generated, colliding factions with a
   seeded web in **two taps**.
2. Routine faction work is applied without any confirmation by
   default. A turn with nothing above low impact needs **zero** taps.
3. A 5PFH campaign's turn-step workflow runs a Faction Turn from its
   Faction Events step. A non-turn ruleset runs one after three
   Encounters.
4. Faction news reaches a non-admin GM entirely without the Advisor.
5. A retaliation cites the memory that caused it, matches its severity
   within one band, and never repeats the previous family against the
   party.
6. A faction's death or split is critical, never bulk-accepted, and
   proposes changes to both its allies and its enemies.
7. Every table, label and line of generated text is original.
