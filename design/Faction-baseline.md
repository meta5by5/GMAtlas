# Factions — Design Baseline

**Status:** Baseline, adopted 2026-11-21. It governs every faction design
and build decision. [FACTION-ROADMAP.md](FACTION-ROADMAP.md) is the build
plan derived from it.

**Authority, in order:**
1. **`requirements/GM_Atlas_Living_Faction_Engine_Requirements.pdf`**
   (Living Faction Engine SRS v1.0, 21 Nov 2026), called "the SRS" here.
   It is the baseline. Its MUST/SHOULD/MAY terms keep their meaning.
2. **The owner's answers** of 2026-11-21 to the first roadmap's
   questions (section 3).
3. **The GMAtlas architecture rules** (CLAUDE.md,
   `design/adr/GMAtlas-Design-Constitution.md`). The SRS itself requires
   reusing them (SRS 3.1, 13.1).
4. **Other GMAtlas roadmaps** (UX-ROADMAP, WIKI-ROADMAP,
   ACCOUNTS-SYNC-ROADMAP) and **outside research** (section 6). These
   count only where they support the SRS and don't contradict it.

Where a lower source conflicts with a higher one, the higher one wins, and
section 5 records the conflict.

**Product rule:** GMAtlas is sold as a service, so every mechanic, name,
table and line of text here is **original**. Published games and tools
are influences only, as SRS 2.2 and Appendix D require. Nothing is
transcribed. The one exception is the SWN content that already exists:
it stays behind the Game System Activation gate it sits behind today.

---

## 1. What the SRS asks for, in one page

**Promise.**
- Factions pursue goals, react, and change the world.
- GMAtlas does the routine work and continuity.
- The GM sees a few meaningful decisions, each explained, and stays in
  control (SRS 1.1, 1.2).

**The defining capability** is a traceable chain from cause to action to
event to consequence to updated campaign state (SRS 1.1):
- **The processing cycle:** TRIGGER → EVALUATE → DECIDE → ACT → RESOLVE →
  PROPAGATE → INVOLVE PLAYER → RECORD (SRS 3.2).
- **The object chain:** Faction → Objective → Project → Operation →
  Decision → Action → Event → Consequence → Trigger. It must be
  navigable both ways (SRS 3.3).

**Nine principles** (SRS 2.1):
1. Motivation before statistics.
2. Consequences over activity logs.
3. The world advances off screen.
4. The GM is sovereign.
5. One source of truth: the Journal is history, the Entity Library is
   current truth, and the Context Graph is relationships.
6. Explainable automation.
7. Low cognitive load.
8. Genre neutrality.
9. Independence from any ruleset.

**Three levels of GM involvement** (SRS 5.2):

| Level | When | What happens |
|---|---|---|
| 1. Background | Routine, low-impact activity | Resolved and recorded automatically, without interruption |
| 2. Informational brief | Meaningful, but no decision needed | Shown as a brief the GM can dismiss or turn into a hook |
| 3. Interactive decision | Linked to the party, high impact, irreversible, generating a mission, or changing a location | Pauses before anything canonical changes |

**Nothing changes campaign records directly.** Every event produces a
structured **change set**: each change has its target, before and after
values, a rationale, an impact level (low, moderate, high or critical)
and an approval policy. Critical changes are **never** applied silently.
The GM can approve part of a set when its dependencies allow it, and
everything can be undone, with the audit trail kept (SRS 9, 13.2).

**Bounded autonomy** (SRS 7.5):
- a budget of actions per advance;
- only relevant factions act;
- cooldowns and event fingerprints;
- a maximum propagation depth;
- consequences queue for the next cycle rather than cascading.

**Conflicts** are persistent objects with a seven-stage escalation
ladder. They can de-escalate, pause, branch, resolve and reignite
(SRS 8).

**Modes** (SRS 12.1): Passive, Standard and Advanced all use **the same
data**. A mode changes how deep the simulation goes, never what the data
means.

**MVP boundary** (SRS 15.3):
- profiles, objectives and relationships;
- triggers and explained proposals;
- a consequence preview and GM approval;
- Journal, entity and graph integration;
- a basic conflict escalation state.

Economics, combat between assets, internal politics and autonomous wars
come later.

---

## 2. SRS terms mapped onto GMAtlas

The SRS describes services. GMAtlas already has most of them under other
names. This table is binding: build on the right-hand column and **do
not add a parallel store** (SRS 1.4, 3.1).

| SRS term | GMAtlas equivalent | Notes |
|---|---|---|
| Mission Control | The campaign shell (`ui/shell.js`): the Storyboard with Encounter (Composer), Navigator and Advisor positions, plus drawers | "Don't navigate away from Mission Control" means drawers, popovers and tabs, never a separate page (the portal is for Help, Account and Wiki) |
| Context strip WHO/WHERE/WHAT/WHY/HOW | The Encounter form's tab strip (Composer) and the Story Dashboard sections | Stays visible while any faction view is open |
| Entity Library | `campaign.entities.items` (Cast) | Factions, NPCs, Locations, Assets and Items stay ordinary entities. The faction profile is **fields on the faction entity** |
| Context Graph | `entity.relationships[]`, mirrored, plus the Graph drawer (`domain/graph.js`) | Edges gain optional metadata (section 4.4). The Graph drawer gains a Factions lens and a local graph |
| Journal / Timeline | `campaign.journal` plus the **Timeline** panel (`campaignTimeline`, id `colony`) | Accepted significant events write a journal entry and appear on the Timeline |
| Oracle Engine | `domain/oracles.js`, genre-pack tables | New faction tables are data in `src/data/`, overridable per genre pack |
| Mission system | `domain/missions.js` (`generateMission`) and Contracts (Threads) | A hook promoted to a mission inherits its context |
| Encounter system | The **Encounter entity** (internal type `conflict`), edited in the Composer | A hook promoted to an Encounter fills WHO/WHERE/WHAT/WHY/HOW (section 4.9) |
| Threads / clocks | `campaign.threads` (2–12 segments, `kind` tags) | Projects, conflict pressure and deadlines are Threads with new `kind`s |
| Decision Engine / Co-Pilot | The **Advisor** (`ui/copilotPanel.js`, admin only since 2026-11-19) plus the new Factions **Overview** | Faction decisions never depend on the Advisor (answer 13). Admins see them in the Advisor too |
| Campaign time | Campaign turns (the turn-step workflows), scenes, Encounters; journal dates later (WIKI W4) | See section 4.7 |
| Rules lens | The Rules Profile (`domain/rulesProfiles.js`) and `data/factionRulesProviders.js` | Used only as an optional **resolution style** (section 4.6) |
| Persistence service | `core/store.js` (IndexedDB), `migrate.js`, export/import | All faction data sits in the one campaign document. It is metadata for sync (`syncPolicy`) |
| Visibility / player view | The wiki's `visibility` field and the `playerSafe` list of allowed fields | Extended to the six SRS visibility states (section 4.10) |

**The name clash to avoid:** GMAtlas's "Conflict" entity type (internal
`conflict`) is now labeled **Encounter**. The SRS's faction **Conflict**
is a different object. It gets its own entity type, internal
`faction-conflict`, labeled **Conflict** (section 4.8). The existing
Encounter type and its data are untouched. **Built 2026-11-21:** the type,
its fields, the stage ladder, status, stakes, sides (with `involves`
links), pressure, the entity-panel form and its wiki fields
(`data/conflictLadder.js`, `domain/entities.js`).

---

## 3. The owner's answers, as adopted

The first roadmap asked 17 questions. These are the answers as the
redesign adopted them. Where the SRS changed an answer's meaning, the
right-hand column says so.

| # | Question | Answer adopted |
|---|---|---|
| 1 | One system or three layers? | **One system, built in layers.** Simulation depth (modes), detail (progressive disclosure) and resolution style are switchable, all on the same data. Everything original and sellable |
| 2 | Neutral core plus "providers"? | **Dropped as a concept.** There is one original GMAtlas faction system. A campaign may *optionally* pick a **resolution style** that tells the engine how to roll outcomes. This is the SRS's "rules-lens adapter" (7.4), explained plainly in 4.6. No rules vocabulary goes into the engine |
| 3 | Name | **Factions**: the panel, its nav button and the Settings section. The SRS's "Faction Navigator" is the Factions panel. GMAtlas's existing *Navigator* Storyboard column keeps its name and gains a Factions card |
| 4 | What happens without review | **Routine work needs no confirmation** (SRS 5.2 level 1, 14.4; decided 2026-11-21, replacing the first answer of "off by default"). **Auto-apply quiet moves is on by default**: low-impact changes are resolved and recorded automatically, visible in History and undoable, never as a review item. Turning the setting off groups them into one routine line in each turn's review instead |
| 5 | What triggers a turn | **The campaign turn model is kept**, with a **Faction Events step** in the turn steps. Settings offers three trigger choices: **every N Encounters**, **a campaign turn step**, and **the GM's Faction Turn button**. The 5PFH, Planetfall and Five Leagues workflows default to the turn step; others default to Encounters (N = 3). The button always works. Journal dates are added later (SRS 10.5) |
| 6 | Death, merger, split | **Proposed loudly** (always critical, so always reviewed), **with consequences that ripple to allies and enemies** (4.8.4) |
| 7 | AI prose | **No.** Oracles and deterministic tables. An optional **"✨ Retell this digest"** button may use AI later, and is never needed |
| 8 | Party standing scale | **−3 to +3** for the party as a whole, with the reasons behind it (the Ledger) |
| 9 | Faction-to-faction standing | **The same −3 to +3**, from decaying reasons, with GM pins. Merged with the SRS's relationship model in 4.4 |
| 10 | Active faction cap | **A soft cap of 3–7 factions on stage**, with the rest off stage. This works alongside SRS relevance filtering, which decides who acts each turn |
| 11 | Difficulty dial | **Yes. Calm, Steady and Dire**, called the **Pressure** setting. It is separate from the SRS's depth modes |
| 12 | Factions strike back | **Yes:** creative, dynamic, not stereotyped, and **in proportion** to what caused it (4.8.5) |
| 13 | Surfacing without the Advisor | **Confirmed.** Faction news never waits for the Advisor |
| 14 | Map turf | Late phase |
| 15 | Players' view | Public reputation and discovered facts only, through `playerSafe` and visibility |
| 16 | Content | **All original.** Mechanics are credited as influences in comments; no published text |
| 17 | Genre tables | One generic set; each genre pack overrides individual tables |

---

## 4. The design

### 4.1 Layers, and what the GM switches

One system, four independent switches. All of them use the same records:

| Switch | Values | Changes | Never changes |
|---|---|---|---|
| **Mode** (SRS 12.1) | Passive · **Standard** (default) · Advanced | How much is simulated and reported: Passive suggests only when a trigger fires; Standard resolves routine activity; Advanced adds assets, resources, territory and internal politics | The data schema |
| **Pressure** (answer 11) | Calm · **Steady** · Dire | How often loud moves happen, and how willing factions are to retaliate and escalate | Rules, or the approval policy |
| **Resolution style** (4.6) | **GMAtlas** (default) · Campaign ruleset (SWN today) · Oracle · GM decides | How an action's outcome band is rolled | Outcome bands, or change sets |
| **Detail** (progressive disclosure) | Per view: card → detail → full record | What's on screen | Anything stored |

A faction can also override Mode, and can be paused, excluded from
automatic turns or muted (SRS 12.4).

### 4.2 The faction profile (fields on the faction entity)

The faction profile follows SRS 6.2. It is useful with only a name, a
type, a motivation and one objective (SRS 14.1). Everything else is
optional and added only when first touched, the same way
`ensureFactionFields` adds fields today.

| Group | Fields | Notes |
|---|---|---|
| Identity | `factionType`, `publicFace`, `hiddenAgenda`, `origin`, `emblem` | Existing `agenda`, `hq`, `leadership`, `scenarioSeed` are kept and shown in these groups |
| Motivation | `motivation` (primary), `interests[]`, `ideology`, `fears` (existing `fear`), `taboos[]` | `need` and `secret` (existing) feed Interests and Hidden agenda |
| Behavior | `behavior: {risk, patience, aggression, pragmatism, secrecy, compromise}`, each −2..+2, default 0; `methods[]` (action families it prefers) | Drives action selection (4.5). A cautious merchant league doesn't open wars (SRS 7.3) |
| Drive | `drive`: one word ("Hoard", "Purify", "Expand") | GMAtlas's own term. A one-word summary of behavior the generator can roll |
| Face | `faceIds[]`: NPC entity ids | Every faction has someone players can talk to (research R4). Hooks come through a face |
| Capabilities | `capabilities: {force, wealth, influence, cunning, logistics, arcanaTech, diplomacy, resilience}`, each `null` or a band | Tags with optional ratings, **no universal scale** (SRS 6.3). Bands: weak / adequate / strong / dominant (shown as 1–4). Existing `force`/`cunning`/`wealth` seed the matching bands |
| Reach | `reach` 0–4: Street, District, City, Region, World or Sector (names per genre pack) | How far its operations can go. `size` (cell … empire) sets reach at creation (the v3 gap) |
| State | `stability`, `cohesion`, `exposure`, `pressure`, `readiness`: bands | SRS 6.2 State. Advanced mode adds `morale` and `prosperity` |
| Standing with the party | Derived from the Ledger, −3..+3 (4.4) | GM pin overrides |
| Attention | `attention` 0–9 | How closely this faction watches the party (the SRS lists "heat" as a tracker). Rises with the party's actions against it, falls each turn |
| Memory | `memories[]`: `{id, kind, aboutId, text, severity, turn, eventId, tags[]}` | SRS 6.2 Memory: debts, promises, betrayals, favors, defeats, grievances. Tags are trigger conditions (research R7) |
| Stage | `stage`: `'on' \| 'off' \| 'auto'` | Answer 10 |
| Controls | `paused`, `excluded`, `muted`, `modeOverride` | SRS 12.4 |
| Footprint | Derived from graph edges (4.4, 4.11) | Never typed twice |

Internal groups (SRS 6.5) are **faction entities** with a `member_of`
edge to the parent faction. They are not shown until Advanced mode, or
until the GM adds one.

### 4.3 Objectives, Projects, Operations

These are new records in `campaign.factions` (4.12). Each has a stable id
and links back up the chain.

- **Objective** (SRS 6.1): title, intent, priority, scope, success and
  failure conditions, deadline, status, secrecy, `targetRefs`.
- **Project:** an objective's main effort. Its progress is a Thread
  (`kind: 'faction-project'`) whose segments carry **Signs**: a line of
  text for each segment. A Sign is what the world visibly sees as the
  project advances, such as livery on the docks or new tariffs.
  **Signs** is GMAtlas's own term. The generator writes them, and a full
  Thread proposes the objective's outcome.
- **Operation:** the concrete step being taken now. It has an action
  family, targets, the assets committed, exposure, secrecy and a
  contingency. One operation is active per project at a time.

**Collision rule** (research R1, R2): a generated faction's first
objective must collide with at least one existing faction's objective,
or with that faction's turf. That collision is what explains why no one
has won yet, and why the status quo is about to change.

**Existing data, read as-is:**
- a `faction-pressure` Thread reads as a project with no Signs;
- a `faction-goal` Thread (SWN) reads as the active project when the
  SWN resolution style is on.

### 4.4 Relationships: stance, ties, trust and the Ledger

The SRS wants relationships that are richer than ally or enemy (SRS 4.6):
- typed and directional;
- with intensity, trust, visibility, a basis, history and conditions.

Answers 8 and 9 want a readable −3 to +3. Both fit, as separate parts of
one relationship.

**Stance** is −3 to +3, derived from the Ledger, can be pinned, and is
directional. It runs from the SRS's emotional types:

| −3 | −2 | −1 | 0 | +1 | +2 | +3 |
|---|---|---|---|---|---|---|
| At war | Hostile | Wary | Neutral | Cordial | Friendly | Allied |

- The labels are per genre pack, and configurable in the way Bondsmith
  and DiploGlass let tiers be renamed (research R12).
- The number is always shown beside the label, with an icon, so color is
  never the only signal (research R10, SRS 4.7).

**Ties** are structural facts held alongside stance (zero or more):
- rival claimant;
- dependent;
- patron and client;
- superior and subordinate;
- trade partner;
- treaty-bound;
- indebted;
- blackmail;
- infiltrated;
- shared threat;
- proxy conflict.

These are the SRS's remaining relationship types (4.6). A tie can carry
conditions, such as "treaty ends when the war ends".

**Intensity**, 1–3, is how much the relationship matters to the faction
holding it. It weighs relevance (4.5).

**Trust**, −2..+2, is separate from stance. "Friendly but distrustful" is
a valid state, and betrayals cost trust more than stance.

**Visibility** is one of the six states in 4.10. A hidden alliance exists
for the engine but not for players.

**The Ledger** is `campaign.factions.ledger`, append-only. Every change
to stance or trust is an entry, so history is never erased (SRS 4.6):

```js
{ id, turn, at, fromId, toId /* faction id | 'party' */,
  field: 'stance' | 'trust', delta, reason,
  decay: 'none' | 'slow' | 'fast', source /* event | gm | hook | migrated */,
  eventId, changeSetId, visibility }
```

**Derivation:**
- `stanceOf(from, to)` sums the decayed entries, rounds the result, and
  clamps it to −3..+3.
- A GM pin overrides the sum.
- The breakdown always explains the number: each reason, its age and its
  decay. Identical reasons are grouped (research R10, R11).

**Ripple:** when standing with Y changes by Δ:
- Y's friends at +2 or more get +Δ/2 toward the actor;
- Y's enemies at −2 or less get −Δ/2 toward the actor.

Ripple entries decay fast and stay in the same change set.

**Graph edges** (SRS 10.4): `entity.relationships[]` stays the Context
Graph. Faction edges gain optional metadata:
- `stance`, `ties`, `intensity`, `trust`, `visibility`;
- `since`, `lastUsed`, `sourceEventId`, `confidence`, `storyImportance`.

The existing `allied_with` and `rival_of` types are kept in step with
stance, at +2 or more and −2 or less. The Graph, the wiki and the SWN
engine therefore keep working. Directional edges already exist: the
reverse side starts as `linked`.

**New edge types** the SRS requires: `leads`, `assigned_to`,
`opposed_to`, `dependent_on`, `in_debt_to`, `investigating`, `protects`,
`attacked`, `encountered`, and the territory set in 4.11. Each is added
to `RELATIONSHIP_TYPES` with its own target rules.

A stale or invalid edge is flagged for the GM, never deleted (SRS 10.4).
This is the existing "flag, don't auto-correct" rule.

### 4.5 The Faction Turn pipeline

`proposeFactionTurn(campaign, {seed, cause})` is a pure function. It
returns a **run**. It never changes the campaign; it only reads it.

1. **TRIGGER.** Collect the **triggers** fired since the last processed
   point. They come from the nine SRS 7.1 families:
   - **player action:** the in-scene quick actions, and Hook outcomes;
   - **objective milestone:** Signs and deadlines;
   - **relationship change;**
   - **resource threshold;**
   - **territory;**
   - **external event:** GM-entered, or a world flag;
   - **revelation;**
   - **time:** turns elapsed, and Encounters played;
   - **opportunity:** a rival weakened.

   Each trigger has an `idempotencyKey` and a cooldown. The same key is
   processed only once (SRS 13.2).
2. **EVALUATE.** Find the candidate factions through graph edges, shared
   targets, turf, interests, active operations and history (SRS 7.2).
   Score each one:

   > Relevance = Interest + Objective alignment + Relationship proximity
   > + Capability fit + Urgency + History − Constraints − Cooldown

   - Weights are data, one set per Mode.
   - Factions on stage get a bonus; muted, paused and excluded factions
     are skipped.
   - The **top three reasons** are kept with the score, for display.
3. **DECIDE.** For each selected faction, the engine:
   - builds three to five candidate actions from its methods,
     capabilities, objectives, opportunities and constraints (SRS 7.3);
   - draws the families from the 27 in the SRS;
   - scores each candidate by behavior fit, objective benefit, risk
     against risk tolerance, Pressure, and a **variety penalty** for
     families used recently;
   - picks the highest score.

   Choice is **deterministic** given the same inputs and seed. A reroll
   creates a new run id and keeps the old run (SRS 7.3, 12.4).
4. **ACT.** Create an Action with:
   - its intent, target and method;
   - the resources it needs;
   - its expected benefit and risk;
   - the likely opposition;
   - a plausible way it could fail.
5. **RESOLVE.** The chosen resolution style returns one of the SRS's
   seven **outcome bands**, and the costs and side effects (SRS 7.4).
   The bands are:
   - decisive success;
   - success with cost;
   - partial success;
   - stalemate;
   - setback;
   - failure;
   - catastrophic reversal.

   - Resolution keeps what a faction *believes* separate from what is
     actually true.
   - It always explains the factors that went into the result.
6. **PROPAGATE.** Build a **change set** for the event (4.6). Propagation
   follows graph edges and consequence rules:
   - at most **depth 2**;
   - within a budget of events per run;
   - any branch above the approval policy pauses for review;
   - follow-on triggers are **queued for the next run**, never executed
     in this one (SRS 7.5, 9.5).
7. **INVOLVE PLAYER.** Classify the event into one of the three
   involvement levels (1), and propose **Hooks** (4.9).
8. **RECORD.** When the GM commits:
   - the event is appended;
   - the accepted changes are applied atomically;
   - journal and Timeline entries are written;
   - graph edges are updated;
   - `lastProcessed` (turn number and sequence) moves forward.

**Budget per run:**

| Mode | Factions acting | Events | Loud moves |
|---|---|---|---|
| Passive | Only the factions a trigger fired for, up to 3 | — | — |
| Standard | Up to 5 | Up to 12 | 2 on Calm, 3 on Steady, 4 on Dire |
| Advanced | Up to 8 | Up to 20 | — |

The GM sees a **preview** before a large run: which factions, how many
items, and which deadlines are due (SRS 10.5, 12.2).

### 4.6 Change sets, impact, approval and undo

A **change set** has the SRS 9.1 fields: id, event id, cause refs, and
for each change its target, change type, before and after values,
rationale, impact level, approval policy, dependencies and provenance.
The provenance records the run id, the engine version, the resolution
style, the confidence and the GM's decision.

- **Change types:** add, update, remove, transfer, create-link,
  close-link, adjust-value, append-history, create-entity.
- **Impact levels and default policies** follow SRS 9.3. The low-impact
  default comes from answer 4 (routine work needs no confirmation):

| Impact | Default policy |
|---|---|
| Low | Background: applied and recorded automatically, shown in History, undoable (Auto-apply quiet moves, on by default). With the setting off: one grouped routine line in the turn's review |
| Moderate | Shown as a brief, applied when the turn is accepted, and can be unticked |
| High | Needs GM approval |
| Critical | Always needs explicit approval, and is never part of a bulk accept |

  The GM can change the thresholds; the critical rule can't be changed.
  The rules that classify impact are data. Examples come from SRS 9.3.
- **Partial approval:** dependencies form a small graph. Unticking a
  change also unticks the changes that depend on it, and says why. A set
  that has to be atomic says so (SRS 9.3).
- **Apply:**
  - Each target carries a version check (`updatedAt` on the entity, or
    a hash of the record).
  - If the GM edited the target after the proposal, the change pauses
    and **shows both versions** (SRS 13.2, 13.4).
  - An applied bundle is atomic: it is one `store.update` call, so it
    rolls back as a whole if the save fails.
- **Undo:** applying a change set records the before values. Undo
  applies the inverse as a new change set marked `undoOf`, so the audit
  trail stays intact (SRS 13.2).
- **Entity history:** "the previous version stays recoverable" (SRS 9.4)
  is met by the applied change sets themselves. An entity's history is
  the list of applied changes that targeted it, each with its before
  value. GMAtlas doesn't copy whole entities.

**Resolution style, in plain words** (answer 2):
- An action needs an outcome band.
- **GMAtlas style**, the default and original, compares the faction's
  relevant capability band against the opposition's. It adjusts for
  preparation, assets committed and difficulty, then rolls 2d6 on a
  seven-band table. This is its own curve, not a published one.
- **Campaign ruleset style:** when the campaign plays SWN, the existing
  SWN engine's roll decides the band instead.
- **Oracle style:** a yes/no oracle with likelihood decides it.
- **GM decides:** the GM picks the band.

The rest of the pipeline is the same whichever style decides the band.

### 4.7 When a Faction Turn runs

These triggers come from answer 5, SRS 10.5 and SRS 12.2:

| Trigger | Default for | Behavior |
|---|---|---|
| **Campaign turn step** | 5PFH, Planetfall and Five Leagues workflows | The turn-step lists (and Settings' shared workflows) gain a **Faction Events** step, `action: 'factionTurn'`. Reaching it shows **Run Faction Turn** inline in the Navigator's workflow card. Five Leagues' existing Enemy Threat and Enemy Plans steps link to the named enemy faction's project |
| **Every N Encounters** | Every other ruleset, N = 3 | Counted when an Encounter is saved or played. Replaces `factionPacing.scenesPerRound` (that counter is read once and kept) |
| **Faction Turn button** | Always available | In the Factions Overview, the Navigator's Factions card, and phone layouts |
| **Event-driven, immediate** | Standard and Advanced modes | A player-action quick action evaluates the factions it touches immediately, as a small run of its own |
| **Time advance** | Once journal dates exist (WIKI W4) | Advancing a day, week, month, travel leg or downtime runs a Faction Turn sized to that interval |

When a session opens after a gap, a **"While you were away"** digest
shows what is pending. It doesn't run anything by itself.

### 4.8 Conflicts

#### 4.8.1 The object

Entity type `faction-conflict`, labeled Conflict, with fields from SRS 8.1:
- **identity:** title, type, origin, summary, status, visibility;
- **participants:** primary factions, allies, proxies, internal groups,
  affected communities, linked by edges;
- **stakes;**
- **positions:** for each side, its desired outcome, red lines, leverage,
  vulnerabilities and willingness to compromise;
- **pressure:** urgency, exposure, drain, civilian impact, time;
- **resolution paths.**

As an entity, a Conflict gets a wiki page, appears in search, Cast and
the Graph, and can be linked with @mentions.

#### 4.8.2 The ladder

These are the SRS's seven stages, with GMAtlas wording:
1. Tension
2. Interference
3. Confrontation
4. Escalation
5. Crisis
6. Climax
7. New status quo

- Stage is a field, and **pressure** is a Thread
  (`kind: 'faction-conflict-pressure'`). A full pressure clock proposes
  the next stage.
- Conflicts can de-escalate, pause, branch (a child Conflict linked to
  its parent), resolve and reignite.
- A minor conflict may skip stages (SRS 8.2).
- The existing `faction-conflict-escalation` Threads read as pressure.

#### 4.8.3 How Conflicts start

A pure function `tensionBetween(a, b)` scores 0–10 and returns its
reasons. The signals are:
- negative stance;
- shared turf;
- colliding objectives;
- recent hostile memories;
- a rival close to finishing a project.

At 6 or more, a run may propose a Conflict. This is a **high-impact**
change, so it is reviewed. Escalation triggers follow SRS 8.3: natural,
action-based, revelation-based and relationship-based.

#### 4.8.4 Faction death, mergers and splits (answer 6)

These are always **critical**, so they are always reviewed and never
bulk-accepted. Every one carries a ripple bundle:

| Outcome | Its own changes | Allies | Enemies | World |
|---|---|---|---|---|
| **Collapse** | Status set to *fallen*; history kept | Lose support: stability down; any treaty tie ends; a memory "abandoned by its fall" or "we failed them" | An opportunity trigger fires: a land grab of the vacant turf | Its turf becomes **contested** or **vacant**. Its assets are proposed as captured, transferred or lost. Its NPCs need a new affiliation (each one reviewed). Debts owed to it are voided or passed to a successor |
| **Split** | A new faction entity is linked to the original with a splinter tie, and shares the history | Must choose: each ally gets a stance toward the splinter, based on ideology | Gain a weakened target, and may court the splinter | Turf and assets are divided by a proposed split. The splinter inherits a share of grudges |
| **Merger** | One faction absorbs the other, whose record is kept with status *merged into* | Allies of each gain stance toward the merged faction, averaged and rounded down | Enemies of either take the worse stance toward the merged faction | Turf, assets and faces are combined |

#### 4.8.5 Retaliation (answer 12)

Retaliation is an action a faction takes against the party. It is
eligible when the faction's stance toward the party is −2 or less, its
Attention is 3 or more, and Pressure is Steady or Dire. Four rules keep
it creative and in proportion:

1. **In proportion.** The severity band of the cause sets the
   retaliation's severity, within one band either way. A broken
   contract doesn't bring an assassination. A burned headquarters isn't
   answered with a rude letter. The memory that caused it is cited.
2. **In character.** The family and method come from the faction's
   methods and behavior:
   - a legalistic guild sues, audits or blacklists;
   - a cult curses, recruits or infiltrates;
   - a syndicate extorts or frames.
3. **Varied, not stereotyped.**
   - **Families used recently against the party are penalized.** The
     same family is never used twice in a row against the party.
   - **The target isn't always the party itself.** It can be their
     allies, contacts, assets, reputation, supply routes, or a place
     they care about.
   - **It can be indirect:** through a proxy, a rival or the law.
   - **It has a twist,** such as an offer, a misdirection, or an
     uninvolved third party caught in it.
4. **Warned first.** A Sign or a rumor comes one turn earlier on Calm or
   Steady (no warning on Dire), so players have a chance to see it
   coming.

**How the text is built:** it combines original tables (method × target
× twist × warning sign × the memory cited). Each combination is
fingerprinted so it doesn't repeat within a campaign.

**How it reaches play:** retaliation lands as a **Hook**, usually a
complication in WHAT for the next Encounter. It is never a silent
penalty.

### 4.9 Hooks: from event to play (SRS 11)

A Hook has an event id, a type, a summary, the refs involved, a
location, urgency, visibility and status. Its types are:
- mission;
- encounter;
- rumor;
- discovery;
- complication;
- open thread.

| Promote to | Uses | Inherits |
|---|---|---|
| Mission | `generateMission` | The patron (its face NPC), the objective and why it matters now, the target faction, locations and routes, the deadline clock, the reward or favor and its standing effect, the consequences of failure, the event link (SRS 11.3) |
| Encounter | A new Encounter entity, opened in the Composer | **WHO:** participants and faces. **WHERE:** the location. **WHAT:** the situation and challenge. **WHY:** the faction's purpose and what the party can gain. **HOW:** what follows from each outcome (SRS 11.2) |
| Rumor or discovery | A journal note, or a Lore entity with a visibility state | Fact, rumor, belief, suspicion or deception (SRS 13.3) |
| Open thread | A Thread with `kind: 'faction-hook'` | The event link |

**Asks:** when a Conflict starts, each side offers the party a Hook.
Accepting one adds *pending* Ledger entries: +1 with that side, −1 with
the other. They settle when the Hook resolves. This is the cost of
taking a side (research R5).

**Session-start relationship roll:** for each faction where the party's
standing isn't 0, roll a d6. On a 6, a Hook surfaces: an opportunity if
standing is positive, a complication if negative. This is GMAtlas's own
take on an idea from 13th Age.

### 4.10 Visibility and knowledge (SRS 13.3)

**Six states:**
- GM only, the default;
- faction-known;
- public;
- player-known;
- secret;
- hidden.

Every event, memory, Ledger entry, edge, objective and Hook carries one.

**Five kinds of claim**, kept apart: fact, rumor, belief, suspicion,
deception.

**Who sees what:**
- Player View (wiki) and the multiplayer table (ACCOUNTS-SYNC S5) show
  only *public* and *player-known* items.
- `playerSafe` gains these fields, and nothing hidden leaks through a
  generated Hook (SRS 13.3).
- Breakdowns of standing between two factions are hidden from players
  unless known (research R11).

### 4.11 Territory and assets

**Territory edges**, from a faction to a Location:
- `controls`;
- `owns`;
- `occupies`;
- `claims`;
- `contests`;
- `protects`;
- `influences`;
- `blockades`.

Control and ownership are distinct, and many factions may contest one
place (SRS 11.5, 14.3). Each edge is marked `temporary`, `disputed`,
`secret` or `permanent`.

**Location state:** a Location gains optional state bands: security,
law, danger, access, supply and unrest. Events change these through
change sets, and the Location's wiki page shows them.

**Assets** (SRS 6.4, 11.6):
- An asset is either an Asset or Item **entity** owned by the faction
  (an `owns` edge), or a lightweight faction asset record that links to
  an entity.
- A record has capabilities, location, condition, upkeep, availability,
  and the operation it is assigned to.
- SWN `factionAssets` stay exactly as they are, and are listed when the
  SWN style is on.

**Advanced mode** tracks resources (SRS 6.1 `FactionResource`) as small
pools. Standard mode doesn't.

### 4.12 Storage

One new subtree is added to the campaign document. The schema addition
is absorbed losslessly by `migrate.js`:

```js
campaign.factions = {
  objectives: [], projects: [], operations: [],
  ledger: [], events: [] /* new-shape events */, changeSets: [],
  triggers: [], hooks: [], runs: [],
  lastProcessed: { turn: 0, seq: 0 },
  settings: { mode: 'standard', pressure: 'steady', autoApplyQuiet: true,
              trigger: { kind: 'auto', everyEncounters: 3 },
              approval: { low: 'routine', moderate: 'brief', high: 'approve' },
              stageCap: 7, retaliation: true, relationshipRoll: true },
}
```

- **Existing data stays where it is** and is read alongside:
  - `campaign.factionEvents` (the existing event log, shown in the same
    History view);
  - `factionTurnNumber`;
  - the `faction-*` Threads;
  - SWN fields on factions.
- **The first time the engine opens a campaign,** each `allied_with`
  edge becomes a `migrated` Ledger entry worth +2, and each `rival_of`
  edge one worth −2. These are additive.
- **Records:** every record has a stable id, `createdAt` and
  `updatedAt`, and survives export and import (SRS 13.1).
- **Sync:** everything is metadata (`syncPolicy` classifies
  `factions.*`), with no `data:` URLs.
- **Built (F0, 2026-11-21):** the subtree is schema version 2. The seed
  runs in `migrate.js` for any document older than version 2, only
  between two factions, with a deterministic id per pair, so two devices
  migrating the same campaign create the same entries and a repeat run
  adds nothing. Faction edge detail is set through
  `updateRelationshipMeta` (`stance`, `stancePinned`, `ties` as
  `{kind, condition}`, `intensity`, `trust`, `visibility`, `hold` for
  territory, and the provenance keys); invalid values are ignored.

---

## 5. Conflicts between sources, and how they were settled

| # | Conflict | Resolution |
|---|---|---|
| C1 | The first answer 4 (auto-apply off) against SRS 5.2 level 1 and 14.4 ("routine processing requires no mandatory manual confirmation") | **Settled for the SRS** (2026-11-21): Auto-apply quiet moves is on by default, so routine work needs no confirmation. The setting can still be turned off |
| C2 | SRS "Faction Navigator" against GMAtlas's existing Navigator column | The SRS feature is the **Factions** panel (answer 3). The Navigator column gains a compact Factions card, which is the "central management from the navigator" entry point |
| C3 | SRS "Co-Pilot surfaces briefs" (12.3) against the Advisor being admin-only | Briefs surface in the Factions Overview and the Navigator card for everyone. The Advisor shows them too, to admins (answer 13) |
| C4 | SRS ally/enemy types against answer 9's −3 to +3 | Decomposed into stance (−3..+3), ties, trust and intensity (4.4). Both are satisfied |
| C5 | The first roadmap's "providers" against SRS genre and rules independence and answer 2 | Replaced by one original system plus an optional *resolution style* (4.6) |
| C6 | The first roadmap's Blades-flavoured terms (tier, hold, status) against the originality rule | Renamed to GMAtlas terms: Reach, Stance, Attention, Signs, Drive, Memory |
| C7 | SRS's "AI suggestions" (Phase 8) against answer 7 | AI only as the optional Retell button, never in decisions |
| C8 | The SRS calls `Conflict` an object; GMAtlas's `conflict` type is the Encounter | A new type, `faction-conflict` (section 2). Decided and built 2026-11-21 |
| C9 | SRS entity version history against the store's single backup slot | History comes from applied change sets with before values (4.6). No snapshot store |

---

## 6. Research that supports the baseline

This is a fresh research pass made for this baseline (2026-11-21). It
covers faction design practice, the interfaces of faction tools, and
interaction patterns from strategy games and productivity apps. Each
finding is listed only where it supports the SRS, with the section of
this document it shaped.

| # | Finding | Source | Used in |
|---|---|---|---|
| R1 | Every faction's goal should conflict with at least one other's. Give each faction one leader, one base and one rival, as linked entries. Ask "what does it want this month?" | Kanka, *How to Build Factions That Drive Conflict* | Collision rule (4.3); Face (4.2) |
| R2 | Colliding goals explain why no one has already won, and why the status quo is about to change | World Anvil Academy, *Worldbuilding factions: 5 secrets from Fallout lore* | 4.3 |
| R3 | Factions show up as visible footprints in the world (liveries, seals on coins); designing factions in threes creates tension | DLSaga, *DM101: Designing Factions That Matter* | Signs (4.3); starter trios (roadmap F1) |
| R4 | Faction mechanics often add overhead without content. A few representative NPCs with conflicting goals do more | Eldritch Exarch Press, *On Faction Mechanics, and why you (probably) don't need them* | Faces (4.2); Passive mode; hooks routed through faces |
| R5 | Siding with a faction should always carry a narrative cost | DLSaga (as above) | Asks with pending costs (4.9) |
| R6 | Faction-turn systems can be heavy bookkeeping, and often don't say how players can help a faction | Cleric Cabin, *The Only Solo TTRPG I Play is GM Prep: Faction Turns* | Budgets (4.5); Hooks let the party help (4.9) |
| R7 | Events test relationships between subjects (characters, cities, families, laws). They leave Memories, Traits and Relationships that trigger later events, and events chain and escalate over turns | Soren Johnson, *Old World Designer Notes #9: Events* | Memory tags as triggers (4.2); event chains |
| R8 | Make narrative out of gameplay. Track every encounter, and recount the history, like a sports commentator recounting a player's career. A small number of overlapping systems is enough | Monolith (Nemesis system) coverage: GDC 2018 "Helping Players Hate (or Love) Their Nemesis"; DICE 2015 coverage | The digest's recap lines; retaliation that cites memories (4.8.5) |
| R9 | Storytellers pace threats by state and by the time since the last major event, and ease off after recent losses | RimWorld wiki, *AI Storytellers* | The Pressure budget and spacing of loud moves (4.5) |
| R10 | Players complained when diplomacy showed only "Friendly" and hid the number. They asked to group identical modifiers. The opinion breakdown is hidden without enough intel | Stellaris dev diaries 162 and 178 (forum); patch notes | Number beside label, grouped reasons (4.4); breakdown visibility (4.10) |
| R11 | Tooltips explain terms, and they nest. Players asked to be able to move the mouse *into* a tooltip | Crusader Kings III previews and reviews (Shacknews, PC Gamer) | Breakdowns are **pinnable popovers**, not hover-only. This also works by touch on phones |
| R12 | Faction tools let the GM define reputation tiers with names, colors and ranges; choose per-player or group reputation; and draw a relationship board | Foundry VTT packages DiploGlass, Bondsmith, Faction Manager; Global Progress Clocks | Labels per genre pack (4.4); per-PC standing later; the Web view |
| R13 | A browser faction tracker draws directional relationships, with each direction different and line color by type | CC_Nexus, *Faction Tracker (for TTRPG)*, itch.io | Directional matrix cells (roadmap U3) |
| R14 | A printable 7-point reputation scale from Hostile (−3) to Revered (+3) | The Oakhaven Archive, *Reputation Tracker GU-002*, itch.io | Confirms the −3..+3 scale is familiar |
| R15 | Diplomacy webs (World Anvil); a relations explorer and custom relations between any entries (Kanka) | Vendor comparisons (Inkwarden, technicalustad) | The Web view and the graph lens |
| R16 | The local graph is used for daily work; the global graph is mostly for checking a vault's health (isolated notes). The local graph is hard to find | Obsidian help and forum threads | A local graph on every faction page; global graph used as a health check (roadmap U6) |
| R17 | Triage: accept, decline, duplicate and snooze, each with a shortcut. Declining asks for a reason. Snooze has presets. A Priority view is the default | Linear docs, *Triage* and *Inbox*; changelogs | Review Queue actions, shortcuts and Defer presets; the "Needs decision" tab first |
| R18 | Clocks (tracks) can be shown openly or hidden | Wildsea reviews | Visibility on each clock (4.10) |
| R19 | Keep the wiki current with play, not a snapshot from session zero | Kanka (as above) | Change sets update entities; wiki History is derived from events |

**Influences recorded in the SRS** (Appendix D), used as ideas only:
Stars and Worlds Without Number, Blades in the Dark, Dungeon World,
Reign, Kanka, World Anvil, LegendKeeper and Obsidian. The first roadmap
also drew on 13th Age, Ironsworn/Starforged, Mythic GME and Pendragon.
Their ideas appear here only as original mechanics: the session-start
relationship roll, generator oracles, relevance weighting toward what's
in the scene, and the "While you were away" digest.

**What the research did not settle:** two things couldn't be confirmed
from public sources:
- the exact faction procedures in *Sundered Isles*;
- how *Cities Without Number* changed SWN's faction turn.

Neither is needed. Nothing here depends on them.

### Sources
- Kanka: https://kanka.io/learn/factions
- World Anvil Academy: https://www.worldanvil.com/academy/worldbuilding-factions-5-secrets-from-fallout-lore
- DLSaga, DM101: https://dlsaga.com/dm101-designing-factions-that-matter/
- Eldritch Exarch Press: https://eldritchexarchpress.substack.com/p/on-faction-mechanics-and-why-you
- Cleric Cabin: https://clericcabin.wordpress.com/2025/03/19/the-only-solo-ttrpg-i-play-is-gm-prep-faction-turns/
- Gods of Aumin, living world: https://www.godsofaumin.com/post/building-a-living-world-how-to-create-a-fantasy-setting-that-feels-alive
- Travel Check, avoid good guys and bad guys: https://travelcheck.dylanwolf.com/p/writing-ttrpg-factions-avoid-good-guys-and-bad-guys/
- Old World Designer Notes #9: https://www.designer-notes.com/?p=1733
- Nemesis system, GDC coverage: https://80.lv/articles/gdc-helping-players-hate-or-love-their-nemesis/ and https://gamedeveloper.com/design/video-how-the-nemesis-system-in-i-shadow-of-war-i-was-designed
- Nemesis inspirations (GameSpot): https://www.gamespot.com/articles/shadow-of-mordor-s-nemesis-system-was-inspired-by-/1100-6423740/
- RimWorld AI Storytellers: https://rimworldwiki.com/wiki/AI_Storytellers
- Stellaris Dev Diary 162: https://admin-forum.paradoxplaza.com/forum/developer-diary/stellaris-dev-diary-162-new-diplomatic-features.1290338
- Crusader Kings III tooltips (Shacknews): https://www.shacknews.com/article/118072/crusader-kings-3-hands-on-preview-evolving-the-intricacies-of-lineage-statecraft
- Foundry VTT, DiploGlass: https://foundryvtt.com/packages/diploglass ; Bondsmith: https://foundryvtt.com/packages/bondsmith ; Faction Manager: https://foundryvtt.com/packages/ddf-faction-manager ; Global Progress Clocks: https://foundryvtt.com/packages/global-progress-clocks
- CC_Nexus Faction Tracker: https://cc-nexus.itch.io/faction-tracker-for-ttrpg
- Oakhaven Reputation Tracker: https://oakhaven.itch.io/reputation-tracker-game-master-utility-series-gu-002
- Tool comparison (Kanka, LegendKeeper): https://inkwarden.app/blog/kanka-vs-legendkeeper-vs-inkwarden-the-honest-breakdown ; World Anvil features: https://technicalustad.com/best-world-anvil-alternatives/
- Obsidian graph view: https://obsidian.md/help/plugins/graph ; local graph discoverability: https://forum.obsidian.md/t/add-menu-item-and-or-button-to-make-local-graph-easier-to-find-and-discover/61576
- Linear Triage: https://linear.app/docs/triage ; Inbox: https://linear.app/docs/inbox
- Wildsea review: https://cannibalhalflinggaming.com/?p=9789
