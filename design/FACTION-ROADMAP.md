# Living Factions — Roadmap

**Status:** Proposal, written 2026-11-20. Nothing here is built yet. Start
with section 0: those questions need answers before F1.

**What this file does:** it plans a faction system for GMAtlas. The system
should:
- build relationships between factions, and between factions and the party;
- turn those relationships into conflicts that are creative, dynamic and
  challenging;
- ask the GM for as little input as possible.

It takes the best techniques published for tabletop faction play and for
the strategy games that do "a world that remembers" well. It maps them
onto the architecture GMAtlas already has, so nothing is built twice.

Phases are F0–F8. Each one lands the same way: pure domain functions with
tests first, then a thin view, then a browser smoke check.

---

## 0. Questions and design choices that need your input

Each item gives a recommendation. Where the plan already depends on one,
the plan assumes it, and the item says so. Answer any you disagree with
and the affected phases change.

### 0.1 Scope and identity

1. **Should the three faction layers be one system?** GMAtlas has three
   faction layers today:
   - the Pressure Track mini-game;
   - the SWN Faction Turn Engine;
   - Conflict entities.

   *Recommendation:* show them as one **Faction Core** to the GM, and make
   the SWN engine an optional "mechanical depth" provider on top. All
   existing data stays where it is (migration rule 5). *The plan assumes
   this.*

2. **Which game systems need first-class faction rules?**
   - Already built: the SWN/CWN engine.
   - Candidates:
     - a Blades-style tier, hold and status provider;
     - Five Leagues' Enemy Threat and Enemy Plans trackers (already Party
       trackers);
     - 5PFH Rivals and Patrons;
     - D&D 5e renown;
     - a plain "narrative only" provider.

   *Recommendation:* ship the neutral core plus two providers, Narrative
   (the default) and SWN (the existing engine). Five Leagues is the third,
   because its trackers already exist. Name any others you want earlier.

3. **What should the GM-facing name be?** Options: "Factions", "Faction
   Board", or keep "Faction Events" for the panel.

   *Recommendation:* call the panel **Factions**, and use "World Turn" for
   the off-screen tick. "Faction Events" stays as the name of the log
   inside it.

### 0.2 How much the system does on its own

4. **What may happen without review?** Today, every faction turn waits
   for review before it takes effect, and the v3 spec calls that out as
   worth keeping.
   - *Recommendation:* keep reviewing as the default. Add one setting,
     **Auto-apply quiet moves**, off by default.
   - Quiet moves are ones that don't touch the party, a Conflict or a
     named NPC: upkeep, small agenda progress, repairs.
   - Loud moves always wait for review. These are attacks, betrayals,
     alliances, a faction dying, a new Conflict, or anything that changes
     the party's standing.

5. **What triggers a World Turn?** Possible triggers:
   - N scenes have passed (this already exists: `factionPacing`,
     default 3);
   - a session starts;
   - in-game time passes (needs journal dates, WIKI-ROADMAP W4);
   - a mission or expedition finishes;
   - the GM presses the button.

   *Recommendation:*
   - Keep the scene count as the default.
   - Add **session start**: the first open after 8 or more hours shows
     the "While you were away" digest.
   - Add **mission or expedition finished**.
   - Add in-game time once journal dates exist.

6. **Should factions die, merge or split automatically?**
   *Recommendation:* only as a proposal, and always a loud move. The
   engine can suggest "the Syndicate splinters". It never does it
   silently.

7. **Should AI write the prose?** `core/aiClient.js` exists.
   *Recommendation:* no by default. The digest, rumors and read-aloud
   text come from deterministic templates and oracle tables, so they work
   offline, from `file://` and on the free version. "✨ Retell this
   digest" can be an optional button.

### 0.3 The relationship model

8. **What scale should the party's standing use?** Options:
   - Blades-style status, −3 to +3, seven steps you can read at a glance;
   - reputation 0–100;
   - standing per PC.

   *Recommendation:* status −3 to +3 for the party as a whole, with the
   reasons recorded behind it (see the Ledger in 3.4). Standing per PC is
   an optional later addition. *The plan assumes −3 to +3.*

9. **What scale should faction-to-faction standing use?**
   *Recommendation:* the same −3 to +3 scale. Today's `allied_with` and
   `rival_of` relationships become the ends of it:
   - +2 or more reads as Allied;
   - −2 or less reads as Rival.

   Each standing comes from a decaying list of reasons, as in the Crusader
   Kings opinion breakdown. The GM can always pin a value by hand, and a
   pinned value never drifts. *The plan assumes this.*

10. **Should the number of active factions be capped?** A cap keeps the
    story focused. *Recommendation:* a soft cap of 3–7 factions **on
    stage**, which act every World Turn. All others are **off stage**:
    they act every third turn, or when the party arrives at their turf.
    The cap is a setting, and promotion to the stage is automatic when a
    faction enters a Conflict with the party.

### 0.4 Challenge and pacing

11. **Should there be a difficulty dial?** RimWorld's storytellers set
    pacing with a single choice. *Recommendation:* one setting with three
    values:
    - **Calm**: fewer loud moves, slower escalation;
    - **Steady**: the default;
    - **Dire**: rivals counter-plan against the party, and clocks tick
      faster.

    It changes weights only, never rules.

12. **Should factions hit back at the party?** This is where the
    challenge comes from (the Nemesis system in Shadow of Mordor).
    - *Recommendation:* yes, on Steady and Dire. A faction at −2 or below
      with the party may take a **Counter-move** against it, such as an
      ambush, a bounty, a frame-up or an embargo.
    - The Counter-move appears as a Complication in the next scene's
      WHAT section, not as damage applied silently.

### 0.5 Where it shows up

13. **Where should faction news appear now that the Advisor is admin
    only?** The Advisor was the natural place for "a faction did
    something you should know about".
    - *Recommendation:* faction news gets its own surfaces:
      - the Factions panel's **digest card**;
      - a **pressure chip** in the Navigator;
      - **Timeline** entries;
      - **present-faction chips** in WHO and WHERE.
    - The Advisor can still show the same items to admins.
    - Confirm that factions should not wait for the Advisor to return.

14. **Map support:** factions could paint their turf on Hexcrawl hexes and
    Location pins. *Recommendation:* make this a late phase (F8). It is
    worth having, but nothing else depends on it.

15. **Players' view:** the multiplayer table (ACCOUNTS-SYNC S5) and the
    wiki's Player View would show each faction's **public reputation
    only**. Agendas, secrets and clocks stay GM-only. *Recommendation:*
    yes, through the existing `playerSafe` list of allowed fields.

### 0.6 Content and licensing

16. **Original or transcribed content?**
    - *Recommendation:* every new table (faction types, agendas, impulses,
      moves, counter-moves, rumors) is **original text**. Game mechanics
      can't be copyrighted, but published text can.
    - Mechanics from published games (clocks, tiers, fronts, faction
      turns) are used freely with credit in comments.
    - Transcribed sourcebook data stays behind the Game System Activation
      gate, as SWN's does today.

17. **Genre packs:** should each pack (sci-fi, fantasy, cyberpunk, and
    so on) get its own faction tables? *Recommendation:* yes. There is
    one generic table set, and a pack overrides individual tables. This
    is the same pattern oracle tables already use.

---

## 1. The goal

> The world moves when the party isn't looking, remembers what the party
> did, and brings it back as trouble they care about. The GM reads a short
> digest and nods.

Measured as **Frictionless Empowerment**, a GM should be able to run a
four-hour session where:
- every faction move took **at most one tap** to accept;
- **no faction field had to be filled in** before the faction was
  useful;
- at least one Conflict in the session **came out of the relationship
  web** rather than being invented by hand.

---

## 2. Recon: what GMAtlas already has

| Capability | Where it lives today | Gap this plan closes |
|---|---|---|
| Faction entity | `type:'faction'`. HQ, leadership, agenda, Force/Cunning/Wealth, fear/need/secret, free-text assets (`ensureFactionFields`, `domain/entities.js`) | No size or tier, no standing with the party, no turf model beyond SWN bases |
| Deep turn engine | `domain/factionTurnEngine.js`, about 1,440 lines. SWN HP, FacCreds, assets, tags, goals, 9 actions. Turns are proposed first and committed after review. Events are tied to faction–location pairs, with witnessed or not and who else was there | It is SWN-shaped: a Narrative or Blades game can't use it |
| Light turn | `domain/factions.js`: d10+stat mini-game, Pressure Tracks, a bulk advance-and-rumor action | Overlaps with the deep engine; there are two ways to "take a turn" |
| Conflicts | Conflict entity (labeled Encounter), 6-segment escalation clock, hero-path fields, a list of facts that can't be undone, a quick-start generator (`domain/factionConflicts.js`) | Created by hand only, never from tension between factions |
| Relationships | `entity.relationships[]` `{to,label,type,strength}`, mirrored on both entities. Types include `allied_with`, `rival_of`, `bond`, `member_of`, `controls`. Bond tracks are created automatically | Stance is only a type label (`relationshipStanceBetween`). There's no score, no history and no reason |
| Clocks | Threads: 2–12 segments, 7 lifecycle states, `kind` tags (`faction-pressure`, `faction-goal`, `faction-conflict-escalation`) | None. This is the clock primitive for everything below |
| Where a faction is | `factionsAtLocation`, `factionsInRegion`, `factionsPresentAt`, `getCurrentWhereLocations` | Regional participation isn't wired into which actions a faction may take (v3 gap) |
| Pacing | `settings.factionPacing` {scenesPerRound, scenesSinceLastRound}, `isFactionRoundDue` | Scenes only; no session-start or time trigger |
| Hooks into the story | The Advisor's story options weigh faction agenda and fear/need. Foreshadowing, world flags | The Advisor is admin-only now (see 0.13); events don't yet turn into opportunities or consequences (v3 gap) |
| Views | The Faction Events panel (`ui/drawers/factionEvents.js`, can dock in WHERE), the Graph, wiki pages | No dashboard of factions, no matrix of standings between them, no digest |
| Content | Two interchangeable faction catalogs (`data/factionRulesProviders.js`: SWN gated, original always available) | No generic tables for faction type, impulse, move or counter-move per genre |
| Party trackers | Five Leagues Enemy Threat and Enemy Plans (auto-created) | Not linked to any faction entity |

**Conclusion:** the expensive parts already exist and are tested:
- clocks;
- proposing a turn and committing it after review;
- where factions are;
- Conflicts;
- relationships.

This plan is mostly **a relationship model, a tension engine and the
views**, built on top of them. It is not a rewrite.

---

## 3. What the best published systems do, and what GMAtlas takes

### 3.1 Survey

| Source | Technique | What GMAtlas takes |
|---|---|---|
| **Blades in the Dark** (John Harper) | Faction **tier** and **hold**; the crew's **status** with each faction from −3 to +3, where −3 means war; faction clocks advance during downtime; helping one faction costs you with its enemies; **heat** and **entanglements** | Tier, hold and party status as the core numbers. Standing ripples automatically to enemies and allies. Party **Heat**. A one-line faction sheet |
| **Stars/Worlds/Cities Without Number** (Kevin Crawford) | Faction turns with stats, assets, HP, goals and **tags**; faction jobs for the party; "problems" tables for locations | The existing engine, kept as the SWN provider. Tags become optional **traits** in the core. Faction **jobs** feed the Mission generator |
| **Apocalypse World / Dungeon World** (Baker; LaTorra & Koebel) | **Fronts**: dangers with an **impulse**, **grim portents** in order, an **impending doom**, and **stakes questions** | Each faction gets an **impulse**, one word that drives which move it picks. Its agenda clock's segments are its **portents**, each with a line of text. **Stakes questions** go on Conflicts |
| **Ironsworn / Starforged** (Shawn Tomkin) | Faction oracles: type, influence, leadership, projects, quirks, rumors, relationships between factions. Progress tracks for vows and connections | A **one-tap faction generator** built from original oracle tables. Projects become agenda clocks. A **relationship oracle** between two factions seeds the starting web |
| **Mythic GME 2e** (Tana Pigeon) | A **Threads list and Characters list** drive random events. Weighting favors whatever is already listed | Faction moves favor factions already **in the current scene's WHO and WHERE** and **on stage**, so the off-screen world stays tied to the table |
| **13th Age** (Heinsoo & Tweet) | Icon relationships (positive, conflicted, negative) and **relationship dice** rolled at the start of each session | At session start, roll one die per faction the party has standing with. A 6 brings that faction **into this session** as an opportunity, or a complication for negative standing |
| **Reign / ORE Company rules** (Greg Stolze) | Company qualities: Might, Treasure, Influence, Territory, Sovereignty; company actions resolved as dice pools | Confirms that the **neutral core needs only a few numbers**. The Narrative provider uses tier plus three qualities (Force, Cunning, Wealth already exist) |
| **Pendragon** (Greg Stafford) | The **Winter Phase**: the world moves forward between sessions in one sitting | The **"While you were away" digest**: one World Turn batch when a session starts, read in under a minute |
| **The Alexandrian** (Justin Alexander) | Faction outcomes and "don't prep plots"; prep situations; factions react to what the party does; a campaign status document | Factions **react to journal and ledger events**, not to a script. The Factions panel **is** the campaign status document |
| **The Lazy DM** (Mike Shea / Sly Flourish) | Secrets and clues; a "living world" faction update between sessions; prep only what's needed | Each faction move leaves a **secret** (a foreshadowing entry) the GM can reveal. No required fields |
| **Kingdoms & Warfare** (MCDM) | Organizations with size and skills; intrigue turns; a domain's **levels** | Faction **size** (v3 gap) sets the starting numbers. "Intrigue" moves (espionage, diplomacy) count as moves |
| **Spire / Heart** (Rowan, Rook & Decay) | **Bonds** with factions; **fallout** when stress overflows | A Counter-move works like fallout: it lands at a story beat, as text, never as a silent penalty |
| **Fate Core** (Evil Hat) | The Fate fractal: a faction is a character with aspects | A faction's **traits** are short phrases that complications and moves can draw on |
| **Dune: Adventures in the Imperium** (Modiphius) | House enemies and allies as a web; schemes | The **matrix view** of the web, and standing that ripples through it |
| **Five Leagues / Five Parsecs** (Modiphius, Ivan Sorensen) | Enemy Threat, Enemy Plans, Rivals, Patrons | The Five Leagues provider maps Enemy Threat to that faction's agenda clock and Enemy Plans to its next move |
| **Crusader Kings III** (Paradox) | **Opinion** as a sum of named, **decaying** modifiers, shown as a breakdown tooltip | The **Ledger** (3.4): every standing is explained by its reasons |
| **Shadow of Mordor / War** (Monolith): the Nemesis system | Enemies **remember** encounters, are promoted, take grudges and come back changed | **Grudges**: a faction remembers what the party did, by name, and brings it back in Counter-moves and the digest |
| **RimWorld** (Ludeon) | AI **storytellers** that pace threats by "how things are going" | The **Calm, Steady and Dire** difficulty dial, and spacing out loud moves after a rough session |
| **Dwarf Fortress** legends mode | A history generated from events | The **Timeline** and each faction's wiki **History** come from the event log for free |
| **Kanka, World Anvil, LegendKeeper** (worldbuilding apps) | Relationship diagrams, organization pages, timelines | Already in GMAtlas as the Graph, the wiki and the Timeline. They get **faction views**, not a new app |

### 3.2 Design principles taken from them

1. **Few numbers, many reasons.**
   - Tier (0–4), party status (−3 to +3), one agenda clock, Heat (0–9).
   - Everything else is text or derived.
   - Every number can explain itself.
2. **Impulse plus agenda picks the move, not dice alone.** Dice choose
   between moves that fit the faction; they never pick at random.
3. **Relationships ripple.** Helping someone costs you with their enemies.
   Hurting someone pleases their rivals. The engine does this so the GM
   doesn't have to.
4. **Tension turns into Conflicts, and Conflicts into play.**
   - When two factions' tension crosses a threshold, a Conflict is
     **proposed**.
   - The Conflict comes with sides, stakes and an ask from each side
     for the party.
5. **Off screen is short, on screen is rich.**
   - The digest is one line per move.
   - Detail appears only where the party is: witnessed events, factions
     present in the scene.
6. **Review is the default, and fast.** Accept all, ✕ on any single item,
   🎲 to reroll one. No forms.
7. **Content is data.** Every table is a data file, overridable per genre
   pack and per ruleset provider.

### 3.3 The Faction Core (neutral to any game system)

Added to `ensureFactionFields`, additively and set only when first touched,
like the existing field groups:

| Field | Type | Default | Notes |
|---|---|---|---|
| `tier` | 0–4 | from size, or 1 | Blades-style reach. Five named steps: Local gang, District power, City power, Regional, Interstellar or Empire. The names come from the genre pack |
| `hold` | `'weak' \| 'strong'` | `'strong'` | Weak hold means a faction can lose a tier after a bad turn |
| `size` | `'cell' \| 'gang' \| 'guild' \| 'power' \| 'empire'` | unset | v3 gap. Sets tier and, under SWN, the starting stats and FacCreds |
| `impulse` | short text | from oracle | "Hoard", "Expand", "Purify"... Weights which moves the faction picks |
| `traits` | string[] | `[]` | Fate-style phrases. SWN tags appear here too, through the SWN provider |
| `partyStatus` | −3 to +3 | 0 | Pinned by hand, or derived from the Ledger |
| `heat` | 0–9 | 0 | How much this faction is watching the party. Rises with party actions against it, falls each World Turn |
| `stage` | `'on' \| 'off' \| 'auto'` | `'auto'` | See 0.10 |
| `agendaTrackId` | thread id | created when needed | `kind:'faction-agenda'`, the faction's main project. Segments carry **portent** text |
| `grudges` | `{id, againstId, text, turn}[]` | `[]` | Nemesis-style memory: who did what to us |
| `publicReputation` | short text | `''` | The only line players can see |

**Reuse, not duplication:**
- **Pressure Track:** the existing `faction-pressure` thread **becomes**
  the agenda track when no agenda track exists. It is read as an agenda
  track, and no data is moved.
- **SWN goal track:** the `faction-goal` track stays the SWN provider's
  own. The core's agenda view reads it whenever the SWN provider is
  active.

### 3.4 The relationship web and the Ledger

Standing is derived, not typed in. Two new pieces.

**`campaign.factionLedger`** is an append-only list in the campaign
document (a schema addition, absorbed losslessly):

```js
{ id, turn, at, fromId, toId,       // toId 'party' for party standing
  delta: -3..+3, reason: 'Party sabotaged the refinery',
  source: 'world-turn' | 'quick-action' | 'conflict' | 'gm',
  decay: 'none' | 'slow' | 'fast',  // fades over World Turns
  sourceRef: { eventId?, conflictId?, journalId? } }
```

**`standingBetween(campaign, aId, bId)`** is a pure function that sums the
entries:
- each entry fades according to its `decay`;
- the result is rounded and clamped to −3 to +3;
- a value the GM pinned overrides the sum.

From it come:
- **Allied** at +2 or more and **Rival** at −2 or less;
- updates to the `allied_with` and `rival_of` relationship types, so the
  Graph, wiki and engine keep working unchanged;
- a **breakdown** shown on hover, CK3-style:
  - "+2 Sheltered our envoy (turn 4)";
  - "−1 Competing for the same docks".

**Ripple rule:** one pure function, `rippleStanding(campaign, entry)`.
When the party, or faction X, changes standing with Y by Δ:
- **Y's rivals** get a mirrored −Δ/2 toward X, rounded toward zero;
- **Y's allies** get +Δ/2 toward X.

These ripple entries are marked `source:'ripple'` and decay fast. They
show in the same review as the change that caused them.

**Seeding the web:** when a faction is created or generated, a
relationship oracle rolls its starting standing with each faction that
shares its turf (Starforged-style). The results go through review first.

### 3.5 The tension engine: from relationships to Conflicts

**`tensionBetween(campaign, aId, bId)`** is a pure function that
returns a number 0–10 and its reasons:

| Signal | Weight |
|---|---|
| Negative standing (−1 / −2 / −3) | +1 / +3 / +5 |
| Same turf: shared Locations, via `factionsInRegion` | +2 |
| Opposing agendas (the agenda tags conflict, e.g. both *Control the docks*) | +2 |
| A recent grudge between them | +1 each, up to +2 |
| An agenda clock at or above 75% (a faction close to winning frightens its rivals) | +1 |
| Already in an open Conflict together | resets to 0 (the Conflict carries it) |

**What happens at each level:**
- **At 6 or more:** a World Turn may propose **a new Conflict**:
  - a Conflict entity, built with `generateConflictSeed`;
  - sides: the two factions, plus allies pulled in by standing;
  - the contested Location;
  - a stakes question ("Who controls the refinery by winter?");
  - an **ask from each side for the party** (see the next section);
  - a 6-segment escalation clock that already exists.
- **At 9 or more**, with no Conflict yet: the next proposal is
  **Open hostility**, an attack move under SWN or a raid under
  Narrative.

### 3.6 Bringing the party in

Every proposed Conflict and every loud move asks the party something
**that ties into play**.

**Asks** come from data tables, by impulse and by genre. Each side
offers the party a job. Accepting one:
- creates a Mission (with `generateMission`) or a Thread;
- adds a Ledger entry: +1 with that side, −1 with the other, both
  pending until the job succeeds or fails.

**Counter-moves**, on Steady and Dire (see 0.12), come from a faction at
−2 or below with the party, whose Heat is 3 or more.

**Grudges come back.** The digest and Counter-move text name what the
party did ("for the refinery"). This uses the grudge record, so it isn't
generic flavour.

**Relationship dice at session start** (13th Age): one d6 per faction
where the party's status isn't 0. A 6 puts that faction into the session
as either:
- an opportunity at a positive status;
- a complication at a negative status.

Both surface as chips in WHAT.

**The witnessed rule stays:** an event at the party's current WHERE is
told in full, with read-aloud text, and becomes **a scene hook**. An
event elsewhere is one line in the digest.

### 3.7 The World Turn

`proposeWorldTurn(campaign, {rng, difficulty})` is a pure function,
returning a draft in the same shape as today's turn drafts. It runs these
steps:

1. **Upkeep and decay.**
   - Ledger entries fade.
   - Heat drops by 1.
   - SWN upkeep runs if that provider is active.
2. **Who acts.**
   - Every faction on stage acts.
   - A faction off stage acts if its turn counter is due, or if the party
     is at its turf.
3. **Pick each faction's move.**
   - Candidate moves come from the active provider.
   - Each move is weighted by:
     - fit with the faction's impulse;
     - how much it advances the agenda;
     - tension targets;
     - the difficulty dial;
     - Mythic-style relevance (the faction is in WHO, WHERE or on stage).
   - The engine draws one move.
4. **Resolve.**
   - The provider resolves the move: SWN dice, Blades-style clock ticks,
     or a single Narrative roll.
   - Each faction's move resolves against the result of the one before
     it, which is today's chaining.
5. **Ripple.**
   - Ledger entries are added for the move's effects, with ripples.
6. **Tension.**
   - Tension is computed for every pair that has changed.
   - New Conflicts and escalations are proposed.
7. **Portents.**
   - An agenda segment that fills shows its portent text.
   - A full clock proposes **the doom**: the faction achieves its goal.
     That changes the world (world flags, Location control) and opens a
     new agenda.
8. **Digest.**
   - One line per move, with witnessed events in full.
   - Asks, Counter-moves and new Conflicts are listed first.

**Commit:**
- `commitWorldTurn(draft, {accepted})` applies the moves that were kept.
- The exact dice the GM saw are kept, as today (the draft carries
  `resultCampaign`).
- Dropping one item from a chain re-runs the proposal from that point.
  The items before it keep their dice. This fixes today's "all or
  nothing" limitation, using the same scratch clones.

### 3.8 Rules providers

`data/factionRulesProviders.js` grows from content catalogs to **move
providers**:

```js
{ id, label,
  moves(faction, campaign) -> [{id, label, impulseTags, loud, ...}],
  resolve(move, campaign, rng) -> { campaign, lines, ledger, events },
  sheetFields: [...] }  // extra fields shown on the faction card
```

| Provider | Moves | Resolution |
|---|---|---|
| **Narrative** (default, every genre) | About 12 original moves: Expand, Fortify, Scheme, Recruit, Trade, Raid, Negotiate, Betray, Purge, Research, Lie low, Make an example | One d6 per move: 1–2 a setback, 3–5 the move happens, 6 a strong result. Tier difference changes the roll by ±1 |
| **SWN/CWN** (existing engine) | The 9 SWN actions | The existing `factionTurnEngine.js`, unchanged, wrapped |
| **Blades-style tier** | The Narrative moves | Clock ticks instead of a d6: 1 tick for a partial result, 2 for full, 3 for critical; tier decides the dice pool |
| **Five Leagues** | Enemy Plans steps | Ties Enemy Threat and Enemy Plans to one named enemy faction's agenda clock and its moves |

The core never imports a provider's vocabulary (constitution: no ruleset
words in `src/domain/`). Providers live in `src/data/`, and the engine
calls them.

---

## 4. Keeping GM effort to a minimum

| Moment | What the GM does | What GMAtlas does |
|---|---|---|
| New campaign | Nothing | The genre pack offers **3 starter factions** with a web already seeded (one Accept). Skippable |
| New faction | Type a name, or tap 🎲 | The oracle fills impulse, agenda, traits, tier, a portent ladder and a public reputation. Starting standings are seeded with turf-mates. The faction is auto-related to the Location it was created from |
| During a scene | Tap a **quick action** on a faction chip in WHO or WHERE: 👍 helped, 👎 hurt, 🤝 struck a deal, 🗡 betrayed | A Ledger entry, with ripples, after an inline confirm. Heat changes. No form |
| Journal | Write as usual | `@Faction` mentions add the entry to that faction's wiki History. **No text is parsed for meaning**: quick actions are explicit on purpose, because inferring meaning from prose is brittle |
| Pacing fires | Nothing, or open the digest | A **"World Turn ready"** chip in the Navigator, never a popup. The turn is drafted in the background when the chip is opened |
| Digest | Read it; Accept all, or ✕ / 🎲 per item | Commits. Writes Timeline entries and wiki History. Witnessed events become scene hooks in WHAT |
| A Conflict is proposed | Accept, ✕ it, or pick a side's ask | Creates the Conflict entity, its clock, and a Mission or Thread for the chosen ask |
| Session start | Read "While you were away" | Relationship dice; the digest of the off-screen batch |

**Never required:** tier, size, stats, assets, a homeworld, or turf. A
faction with only a name still acts:
- its moves come from the Narrative provider;
- its impulse is rolled the first time it acts.

---

## 5. The views

All views are rendered from the campaign document through the existing
delegated `data-*` handlers (rule 4). There are no per-element listeners.

1. **Factions panel**. This renames Faction Events, which keeps its id.
   Three tabs:
   - **Board.** One card per faction, sorted by "what's hot", which is
     tension plus Heat plus how close the agenda is to done. Each card
     shows:
     - the name and tier pips;
     - its **agenda clock**, with the next portent on hover;
     - **party status** as a −3 to +3 pip strip, tap to pin;
     - Heat;
     - turf chips;
     - an on-stage or off-stage toggle;
     - a ⋯ menu that holds the SWN sheet, when that provider is active.

     Off-stage factions are folded into one compact list at the bottom.
   - **Web.**
     - A **matrix** of factions against factions. Each cell is colored by
       standing, shows tension as a dot, and opens the Ledger breakdown
       on hover. Tap a cell to pin a value.
     - Below it, a **Graph view** filtered to factions. It reuses
       `graph.js`'s seeded layout, with edge color showing standing and
       thickness showing tension.
   - **Events.** Today's event log, grouped by World Turn, filterable by
     faction and Location. This is the current Faction Events content.
2. **Digest card.** The World Turn's review. It sits in the Factions
   panel, and also opens from the Navigator chip. The list is ordered:
   - loud moves first: Conflicts, asks, Counter-moves;
   - then the rest.

   Each line has ✕ and 🎲. Accept all is one button.
3. **Present-faction chips** in WHO and WHERE. These are the factions at
   the current Location, from `factionsPresentAt`. Each chip shows its
   standing color and opens the quick actions (section 4).
4. **Navigator pressure chip.** "⚔ 2 factions moving · World Turn ready".
   Tapping it opens the digest.
5. **Timeline.** Committed World Turns appear as entries, so the panel
   now titled Timeline shows faction history beside scenes.
6. **Wiki.**
   - Each faction page gains **History** (its events), **Standing** (the
     Ledger breakdown, GM only) and **Public reputation**, which Player
     View shows.
7. **Conflict form.** Today's Conflict form gains:
   - stakes questions;
   - its sides, with each side's ask;
   - an "Escalate" tick button.
8. **Phone.** The Board stacks one card per row. Web shows the matrix as
   a list of pairs ("Syndicate ↔ Guild: −2 Rival"). The digest is
   full-screen.

Fantasy look: titles use Metamorphous, numbers use `--font-ref`, and
digest prose uses Lancelot. This follows the existing three-voice rule.

---

## 6. Phases

Each phase lands as pure domain functions with `node --test` coverage
first, then the view, then a jsdom smoke run, and ends with a review
stop.

### F0: Answers and sign-off
- Settle section 0. Update this file with the answers.

### F1: Faction Core and the Ledger (domain only)
- `ensureFactionFields`: the core fields in 3.3, added lazily and
  additively.
- `campaign.factionLedger`:
  - a schema addition, with `migrate.js` absorbing older documents;
  - `syncPolicy` classifies it as metadata.
- `standingBetween`, `rippleStanding`, `addLedgerEntry`, `pinStanding`,
  `decayLedger`.
- Allied and Rival relationship types derived from standing, without
  overwriting a type the GM set by hand.
- **Tests:**
  - decay;
  - clamping;
  - pinned overrides;
  - ripple signs;
  - a document from before F1 imports unchanged.

### F2: Generator and content
- Original data tables, generic plus overrides for fantasy, sci-fi and
  cyberpunk:
  - faction types, impulses, agendas with portent ladders, traits;
  - public reputations;
  - a relationship oracle;
  - asks, Counter-moves, digest line templates.
- `generateFaction(campaign, {rng, genrePack, locationId})`: a complete
  faction, with its starting web proposed.
- Starter factions per genre pack.
- **View:** 🎲 on Cast's ＋Faction; "Generate 3 starter factions" on an
  empty Factions panel.

### F3: Factions panel, Board and Web
- Rename Faction Events to Factions (label only; the id stays).
- The Board, the matrix, the Ledger breakdown on hover, and pinning.
- Present-faction chips and quick actions in WHO and WHERE.
- **Smoke checks:**
  - a quick action writes a Ledger entry with ripples;
  - the entry persists across a reload.

### F4: The World Turn, with the Narrative provider
- The provider interface (3.8) and the Narrative provider.
- `proposeWorldTurn` and `commitWorldTurn`, including keeping or
  dropping single items, with dice preserved.
- The digest card, the Navigator chip, and Timeline entries.
- The existing scene pacing triggers it. Session start and "mission
  finished" are added.
- **Tests:** a seeded run produces identical results; a dropped item
  re-runs only the items after it.

### F5: The tension engine and generated Conflicts
- `tensionBetween`, with each reason shown.
- Proposed Conflicts with sides, stakes and asks.
- Accepting an ask creates a Mission or Thread, and pending Ledger
  entries that settle when it ends.
- The v3 gap closes: an event turns into an opportunity or a
  consequence.

### F6: Challenge
- Heat, Counter-moves and grudges.
- The Calm, Steady and Dire difficulty dial.
- Relationship dice at session start.
- Rhythm, RimWorld-style: no more than one loud Counter-move per
  session on Calm or Steady.

### F7: SWN and Five Leagues providers
- Wrap `factionTurnEngine.js` as the SWN provider, with its tests
  unchanged.
- The SWN sheet moves into the ⋯ menu on the faction card.
- The Five Leagues provider: link Enemy Threat and Enemy Plans to one
  enemy faction.
- `factions.js`'s mini-game: its d10 check becomes a Narrative-provider
  option. Its Pressure Tracks are read as agenda tracks.
- Two v3 gaps close:
  - size scaling;
  - regional participation, through `factionsInRegion`.

### F8: Players' view and maps
- Public reputation in the wiki's Player View.
- Turf painting on Hexcrawl hexes and Location pins.
- An optional "✨ Retell" for the digest, using AI (see 0.7).
- Multiplayer (S5): players see public reputation and witnessed
  events only.

---

## 7. Architecture checks

- **Rule 1, one document:** the Ledger and new fields live in the campaign
  document. Settings go under `settings.factions` (difficulty, stage cap,
  auto-apply quiet moves).
- **Rule 2, store only:** nothing new touches IndexedDB.
- **Rule 3, a pure domain layer:** every engine function is
  `(campaign, opts) -> {campaign | draft}`, with an injectable RNG.
- **Rule 4, delegated events:** new controls are `data-faction-*`
  attributes plus a branch in the existing handlers.
- **Rule 5, migration:** everything is additive. `faction-pressure` and
  `faction-goal` threads are read, never rewritten.
- **Rule 6, sync:** all of this is metadata. Grudges and Ledger reasons
  are short text with no `data:` URLs.
- **Content is data:** moves, tables and templates live in `src/data/`;
  provider vocabulary stays out of `src/domain/`.
- **Engine timing:** every World Turn runs only when the GM opens it or
  a trigger fires. There is no background timer.

## 8. Out of scope

- Simulating every faction every scene, or real-time ticking.
- Reading the GM's prose to work out who helped whom.
- Diplomacy minigames with offer and counter-offer screens.
- Per-PC standing (a candidate after F6; see 0.8).
- Transcribing any published faction text outside a gated provider.

## 9. Acceptance

1. A new campaign can reach three related factions with a seeded web in
   **two taps**: Generate starters, then Accept.
2. **Three scenes** of play with no faction input produce a World Turn
   digest that reviews with **one tap**.
3. Two factions sharing turf with negative standing produce a **proposed
   Conflict** within three World Turns on Steady. That Conflict carries
   sides, stakes and two asks.
4. Helping one side of a Conflict changes the party's status with **both**
   sides and with their allies. Each change shows its reason in the
   breakdown.
5. On Dire, a faction at −2 with Heat 3 or more delivers a Counter-move
   that names what the party did.
6. A campaign file exported before F1 imports with no data lost, and its
   SWN factions still take turns.
7. Every engine function is covered by seeded tests. The jsdom smoke
   suite covers quick actions, the digest, and reload persistence.
