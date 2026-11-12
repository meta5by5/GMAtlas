# Composer Encounters, the campaign timeline, and panel changes

**Status:** Accepted (2026-11-08, direct requests). Built on `main`.

## Context

A batch of one-off requests reshaped how a GM moves from building a scene to
recording it, and tidied several panels:
- Save what the Composer holds as an Encounter; a wizard that fills the
  Composer section by section; ask to run it when a campaign has no
  Encounter yet; copy the Composer as a prompt for an AI client, with a stub
  for automating that later.
- Repurpose the emptied Campaign panel as a timeline of scenes and
  Encounters.
- Move the Campaign panel's Colony/Starship tabs to Party; rename World to
  Planetfall; "＋ Shared Asset" becomes "＋".
- Guide reordering off by default behind a ↕ toggle; dropping puts a
  document above the hovered one, holding 2 s nests it.
- A New campaign wizard asking only the essentials.
- Entity tabs named after the entity, several open at once, the tab bar up
  to two rows.

## Decision

1. **An Encounter is the existing `conflict` entity type**, which the app
   already labels "Encounter" (`entities.js` TYPE_LABEL), and **the Composer
   is its editor — the Encounter builder** (2026-11-09). `domain/encounters.js`
   (pure):
   - `composerSnapshot` reads WHO (the latest scene's Protagonists/
     Antagonists/Bystanders and assets, and its factions —
     `composerFactionIds`: present in the region, an actor's faction, or added
     by hand as `scene.factionIds`, minus the dismissed), WHERE (its
     locations, site text), WHAT/WHY/HOW, and `context.encounter`;
   - `context.encounter` (schema) holds the id of the Encounter being edited
     (null = new), its name, and the Encounter's own fields with no WHO…HOW
     home (`ENCOUNTER_DETAIL_FIELDS`: status, stated/root cause, why the gap
     matters, the innocent casualty, what lit the fuse, deep root, party
     leverage, last de-escalation attempt, GM notes; plus session hooks). The
     Composer shows them in the tab they belong to, each with a 🎲 that rolls
     a table suited to it (`ENCOUNTER_FIELD_ORACLE_TAGS`);
   - `saveComposerEncounter` updates the Encounter being edited, or creates
     one and goes on editing it. The record gets every Composer field — cast,
     asset, place and faction id lists, site/surroundings, situation, intent,
     threat/mystery, objective, mode, activity — plus the Encounter-only
     fields, stamped with `sceneId`/`sceneNumber`; its cast/place links are
     rebuilt by label and its `involves` links set to the faction list (the
     Composer's factions are the Encounter's Involved factions). ＋ New
     (`newComposerEncounter`) starts another; `createEncounterFromComposer`
     always makes a new one;
   - `loadEncounterIntoComposer` (the record's 📝 Open in Composer) copies a
     record back: the current scene's cast, places and hand-added factions (a
     scene is started if there is none), WHERE…HOW and `context.encounter`.
     A record from before falls back to its relationship labels. It always
     asks first when the Composer holds anything (`composerHoldsAnything`),
     including unsaved edits to the same Encounter, naming what it replaces;
   - the record shows the same information plainly (text fields edit in
     place, lists change through the Composer), without oracles or tips;
     "Involved" is the Composer's faction thumbnail list with ＋/✕, replacing
     the location-scoped dropdown (and WHO's contested-zone picker);
   - `composerPrompt` builds the AI prompt from those facts only, asking for
     a fixed JSON reply; `parseEncounterReply` reads that reply back;
   - `campaignTimeline` orders scenes and Encounters, nesting each Encounter
     under the scene it was made from.
2. **The AI step is a stub.** `core/aiClient.js` (`configured()` false,
   `describeEncounter()` rejects) is the one place a future automated client
   goes. Today the 📋 button copies the prompt to the clipboard. Only the
   prompt text would ever be sent (rule 6).
3. **The Composer is tabbed, and the wizard guides.** The Composer shows a
   WHO/WHERE/WHAT/WHY/HOW tab strip and one section at a time (a filled
   section's tab is ticked); Activity sits on the HOW tab. The wizard is the
   same tabs plus a guide over the section: the step's questions and oracle
   tables suggested for it (`data/encounterWizardGuide.js`; tags from the
   locked field-link vocabulary, WHAT led by the current Intent;
   `domain/encounters.js` `wizardOracleSuggestions`). A suggestion rolls in
   place; ✔ Use appends the result to the field picked in its menu — any of
   the step's fields, including its Encounter-only ones (the default follows
   the table's tag, e.g. WHERE's surroundings to Immediate Surroundings, a
   secret at WHY to What's actually driving it) — at WHO ＋ NPC makes it an
   NPC and asks for their scene role, 📖 files it in the Journal; 🔀 Others
   pages on. Back/Next and a final "Save Encounter". The tab, step and rolled results are
   shell state, not document state. The "run the wizard?" offer shows while
   the campaign has no Encounter and until "Not now" for that campaign this
   session.
4. **Panels.**
   - Party gains a tab row: Party, then each Turn-Step tab (Colony,
     Starship, Warband) whose system is in use; the ＋ add-member button
     shows on the Party tab only. Warband moved too, as the same kind of
     tab, so nothing was left on the Campaign panel.
   - The Campaign panel (`colony` id, label unchanged) is the timeline.
   - World Tracker's label is Planetfall (id `world-tracker` unchanged).
   - Battlemap, Hexcrawl and Dungeon Crawl always carry a maximize button
     (⤢, desktop only) at the top of the panel, in the drawer head and on
     an anchored card. Maximizing anchors the map alone, as one card across
     Composer and Navigator (any other anchored panel goes back to the tab
     strip), and puts Party on the right. If the profile's right (Advisor)
     position is Party, every tab closes so that position shows. Otherwise
     Party opens as the active tab. ⤡ on the card returns the map to the
     tab strip as the active tab. This is ephemeral state (`maximizedMap` in
     `shell.js`); the Battlemap's own 1/2/3-section width controls are
     unchanged.
5. **Guide moves.** `guide.js` gains `moveGuideDocBefore` (sibling reorder
   with the same cycle guards as `moveGuideDoc`). Documents are draggable
   only in move mode. Mouse and touch share one rule (`completeGuideNodeDrop`
   + `noteGuideHover`): above by default, inside after 2 s on the same entry,
   with a timer switching the highlight so a still finger sees it too.
6. **New campaign wizard.** One overlay, opened from the startup screen and
   the campaign switcher: name and Rules Profile, then `store.newCampaign`.
   Settings no longer opens.
7. **Entity tabs.** Entity clicks still open the generic `entity-detail` tab
   and set the active entity (a dozen call sites left as they are). Each
   render turns that into `entity:<id>`, reusing an open one; the active
   entity tab and the active entity are kept equal (choosing or closing a
   tab sets the active entity), so the Entity view itself is unchanged. The
   tab strip wraps to at most two rows, then scrolls.

## Consequences

- An Encounter made from the Composer is an ordinary entity: it shows in
  Cast, Graph, Search and the timeline, and can be edited like any other.
- Two Encounters from the same Composer contents get the same default name.
- Entity tabs aren't persisted (open tabs never were).
- The AI prompt is ready for any client today; automation needs only
  `core/aiClient.js` filled in and a UI that checks `configured()`.
