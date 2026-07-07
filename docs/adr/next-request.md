## USER NOTES and CHANGE REQUESTS

Empty — ready for the next batch. Drop new asks here and say "process
requests in docs/adr/next-request.md" (or similar) to have them picked up.

<!-- Processed 2026-07-03:
- requirements/ reorg (subfolders + extracted zips) — acknowledged, CLAUDE.md
  updated to match (see "The Design Constitution" section).
- Merchant trade concepts (Saga_Atlas_Merchant_*.txt) incorporated and
  consolidated into docs/adr/0004-merchant-rules-lens.md (reconciled with
  docs/adr/0003-trade-logistics.md); the three source .txt files were removed
  from requirements/ per the request, content fully captured in the ADR.
- CLAUDE.md / PROGRESS.md cleanup — done. Stale references fixed (requirements/
  paths, test count, phase status), PROGRESS.md's historical narrative moved to
  docs/archive/progress-log-2026-07.md, roadmap/design content preserved.
- Cheaper-model question — answered directly in-conversation, not written to
  a file (it's a judgment call for the user, not a design decision to record).
-->

<!-- Processed 2026-07-06 (the "Add 7/5/26" batch below):
- Cybernetics section: collapsed by default, moved under the statblock
  section, renamed "Enhancements" with a per-item type dropdown (Cybernetics/
  Wetware-Bio-Genetics/Psionics/Gene-Modification — always shown, since
  Hostile's own Wetware framing always applies), and its 🎲 roll now lands in
  the add-form's name field (overwritten by each reroll) instead of a
  toast+Journal entry, until "Install" commits it. domain/cybernetics.js
  renamed to domain/enhancements.js (tolerant legacy read of old `cyberware`
  data). See the 2026-07-06 commits and CLAUDE.md/PROGRESS.md.
- Deepen's Want/Complication now append to Revealed/hidden (GM) instead of
  Overview (Stereotype stays in Overview); Revealed/hidden is now collapsed
  by default and stays expanded (entity.revealedOpen, persisted) once a GM
  opens it for a given entity.
- Changing an entity's Type now asks for Y/N confirmation (window.confirm,
  this app's existing pattern) before applying; canceling reverts the select.
- Cast drawer search now matches entity type too, not just name/tags.
- Fixed: the Oracle drawer's search couldn't find "Creature Concept" (a
  composite-generator button label, not a literal table name) — a small
  GROUP_ALIASES map in data/oracleGroups.js fixes this and any future
  same-shaped generator.
- Trade economy types (docs/adr/0013-trade-economy-types.md): Location tags
  now double as an economy type (data/economyTypes.js — a Hostile-native
  model and a "(Traveller-style)"-labeled model, only one active at a time
  via settings.tradeEconomyModel) biasing domain/trade.js's priceAt() via two
  dials (scarcity/manufacturing) instead of a literal tech level, exactly as
  requested. Switching the active model never breaks an already-tagged
  Location. ADR 0003/0004 updated to point at ADR 0013 for this gap.
- Game Mechanics Index (docs/adr/0014-mechanics-index-pdfjs.md): a real
  PDF.js-backed scan (per the user's explicit choice over a hand-curated
  list) links game-mechanic terms to their page in the Reference Library,
  from a new Settings "🔄 Refresh Mechanics Index" button, surfaced as
  clickable links in the Guide drawer. Found and fixed a real bug during
  verification: this specific feature needs the app served over http(s)
  (`npm run serve`) — file:// blocks reading a local PDF's bytes entirely;
  every other feature is unaffected. Also fixed a real scripts/build.js
  bundler gap (didn't recognize `export async function`).
- Intergalactic Space Trader PDFs used only as flavor inspiration for the
  Trade Economy Model above, per the request's explicit priority (Hostile's
  own lore wins any conflict) — no direct mechanic/table was transcribed.
-->

<!-- Processed 2026-07-06 (docs/adr/0018-lightweight-rich-text.md):
- Journal/Guide/WHAT Situation/WHO-WHERE-WHY-HOW Focus/NPC Overview all
  gained a lightweight bold/italic/underline/bullet/numbered-list toolbar
  (plain-text markup, richly rendered — the same model @mentions already
  use, not live execCommand, per the user's explicit choice). Overview
  converts from a <textarea> to a real mention-editor (its first @mention
  support). A real bug found+fixed along the way: a <label> wrapping both
  the toolbar's buttons and a non-labelable contenteditable div made the
  browser silently redirect clicks meant for the field to the label's
  first labelable descendant instead — fixed by dropping the <label> for
  the three affected fields.
- Mention page-editing: Ctrl/Cmd+Click a document mention to edit its
  page (ui/shell.js's editMentionPage) — the user tested the ORIGINAL
  double-click-based plan's shipped tooltip directly and clarified the
  real intended gesture is Ctrl/Cmd+Click for editing, plain click for
  opening; the previously-shipped tooltip had this exactly backwards and
  didn't work at all. Fixed and verified end to end.
- The "5PFH Campaign Turn Sequence" Guide content below was authored with
  corrected sequential numbering (Mission Steps: a real 1-8, with the
  lettered post-battle sub-steps and deployment sub-considerations pulled
  into their own labeled lists, since this app's list renderer is
  intentionally one level deep) and EVERY page reference — including the
  "(CBH 94)"/"(Core 72)" no-"p." forms, "(p.66,153)" and "(p.120, CBH
  p.78)" multi-reference parentheticals, "(pp.88-94)" range, and
  "(p.121, 131+)" open range the first pass missed — converted to a real
  @[...] mention resolving to the correct one of the three source books.
  Delivered as docs/guide-content/5pfh-campaign-turn-sequence.txt (ready
  to paste into a new Guide document) rather than a hardcoded app-code
  import, since campaign data is the GM's own, not this repo's — see the
  ADR's Alternatives Considered.
-->

Revise any large textboxes to use a text editor with the same behaviors as what was in SagaAtlas. This includes the Guide, Journal, Focus fields in Who... example: How tabs, Overview (Shared) in NPC tab.
Then create a specific page in the Guide tree with this created content and call it 5PFH Campaign Turn Sequence. For each of these page references, please create a link to that document & page as if it were hand assigned in the Guide. Correct the numbering for the items with number filters. The "Core" is the 5PFH rulebook, CBH is the Campaign Builder Bughunt, No reference other than just page# is the Hostile Settings book.  For the outline below, fix the numbering sequence instead of just 1, 1, 1.

Also, if possible to edit the page number in the link, please add an explanation how to edit the link.

Add below here to the Guide page:

# Core 5PFH Campaign Turn Sequence


## ***<u>Daily Life Steps</u>***

* Update status (injuries, cargo, heat, rivals, favors, reputation).
* Assign/resolve crew tasks (Core p.77). 
* Determine job offers (Core p.83). 
* Check for Rivals (Core p.85).  
* Select your Job (Patron, Rival, Quest, Salvage, etc.).
* Resolve Rumors (Core p.85). 
* Resolve Mission Steps or Merchant Mission Steps.
* Story Event/Track if turn without one (Core p.66,153).  


## ***<u>Mission Steps</u>***


1. Determine the objective (may use Expanded Missions, p.74)  
1. Mission Selection  
	1. Salvage Jobs  
1. Faction Involvement* (unknown during selection; could be a surprise) (CBH, p.110) 
1. Check for Connections (p.164, or Expanded Connection (CBH, p.80) – Opportunity mission only   
1. Assign equipment (p.85) 
1. Deployment – (pp.88-94)  
	1. Check deployment cond (not Salvage)

	1. Determine notable sights (not Salvage)

	1. Determine the enemy (p.92) 

	1. Set up the battlefield (p.108;  Terrain Generation, CBH 94) 

	1. Setting up  
		1. e. Place Points of interest and Salvage (Salvage mission only)

1. Battle (go to table top)

1. Resolve Tabletop Post-battle activities
a. Resolve Rival status (p.119)  
b. Check for illegal Psionic usage (p.21)  
c. Resolve Patron status (p.119)  
d. Roll quest progress (p.120, CBH p.78)   
e. Get paid (p.120)  
f. Trade Salvage(p.147 Salvage mission only)  
g. Battlefield finds (p.121)  
h. Check for Salvage mission points of interest (CBH, p.139 – Salvage mission only)  
i. Check for World Event Steps
j. Check for Settlement Event Steps
k. Gather the loot (p.121, 131+) 
l. Determine injuries and recovery (p.121)   
m. EXP and character upgrades (p.123)  
n. Invest in advanced training (p.124)
o. Purchase items (p.125)
p. Roll for a character event (p.126, 128)  
q. Resolve Heat check

	1. Setting up 

	1. e. Place Points of interest and Salvage (Salvage mission only)

	1. Battle (go to table top)

	1. 

## ***<u>Travel Steps</u>***


	•	Flee invasion (Core p.69).  
	•	Check for Factions fleeing (CBH p.114).  
	•	Decide whether to travel (Core p.69).
	•	Resolve steps, Local Travel / Starship Travel (Core p.70), as applicable.
	•	Resolve New World Arrival steps (Core 72)
	•	Check for Shipping Issues (Starship, Planetary, Overland).
	•	Check for Settlement Event Steps.


	## _<u>Settlement Event Steps</u>_


	•	Check for invasion (Core p.69).
	•	Check for Instability (CBH p.148).  
	•	Roll a Negotiations check.
	•	Check for Faction Conflict
	•	Check for Psionic legality status (p.20)  
	•	Resolve Heat Check.


	## _<u>World Event Steps</u>_


	* Check for Faction Conflict.

	* Fringe World Strife / Instability  (also  )

	* Roll for a Campaign Event (Core p.126).  

	* Roll for a District Event.

	* Roll for a Faction Event (CBH p.114).  

	* Check for Galactic War progress (Core p.126).  

	* Resolve Heat Check.

END OF CAMPAIGN TURN

## USER CHANGES

<!-- Processed 2026-07-06 (docs/adr/0019-where-tab-and-scene-fields.md,
docs/adr/0020-reference-toc-generation.md, ADR 0018 addendum):
- All remaining large textboxes (Revealed/hidden, Faction Scenario seed/
  Agenda, Colony's textarea fields, a Document note's content box) gained
  the same rich-text toolbar; Journal entries gained an edit icon
  (domain/session.js's editNote) that swaps an entry for a real
  mention-editor, auto-saving on blur like every other field.
- WHERE tab: the "Change Location" button is gone; the old "every
  Location in the campaign" chip list is replaced by a Location-tag
  listbox (a native <select>, not chips, per direct clarification) that
  filters a candidate panel of matching Locations, clicking one adds it
  to a new curated "present here" list (context.where.entityIds — a
  schema field that existed since Phase 3A but was dead in the UI until
  now; new addContextEntity/removeContextEntity mutators, keyed generically
  so WHO/WHY could reuse them later). Found and fixed a real pre-existing
  bug along the way: WHO/WHY's own "+ Type" buttons had never had a click
  handler at all.
- Doc management: confirmed (no code needed) that a hand-typed
  @[docname#page] already becomes a real link once it matches a library
  title, regardless of how it was typed. The Table of Contents ask became
  domain/toc.js + ui/tocScan.js: a Settings button (full-library rescan)
  and an upload-time path (gated behind a window.confirm, per your
  explicit answer) both read a PDF's real bookmarks via PDF.js's
  getOutline() (new integration — never used in this app before) and
  write a linked table of contents per document into the Guide, under a
  "Table of Contents" entry. Needs `npm run serve` (same file://
  restriction as the Mechanics Index scan it mirrors). Verified against
  the real Reference Library — 15 of 27 PDFs had usable bookmarks.
- Latest Scene: sensory/driver/clue/complication are now real,
  individually-editable fields, each with its own 🔮 oracle-jump icon; the
  combined text view is recomposed live from them (recomposeSceneText) as
  a one-directional derivation, not a second editable copy — matches "keep
  using the full combined statement... update the related text when the
  separate field is revised" literally.
- Text editor: added Tab-indent, small/large text (~text~/^large^, per
  your "Small/Large toggles" answer), and a table markup type (a
  toolbar-inserted GFM-style pipe-table skeleton, left-aligned/thin-
  bordered by default, per your "insert markup skeleton" answer — no
  dedicated row/column UI; more rows/columns come from typing more
  "| cell |" syntax by hand).
-->

- Make all text fields into full featured editors per the markup approach already decided. Then make the Jounral entries have an edit icon that opens it up for modification and save changes. 
On the "Where it happens" tab: 
- remove the "Change Location" button since we don't need a popup entry field to add text to the text box.
- Redesign from the many links of all locations to a list of tags that then show a list of entities in a field to the right which will add the entity to the list when selected. The goal is to show location concepts and narrow down tot he desired entities that would likely be streamlined to fit the concepts through tags.

### DOC MANAGMENT
- Allow an externally written textblock containing a structured doc link (e.g., @[docname#pgnumber]) to covert to a valid link if it successfully matches a doc in the library.

- Add a button to the Settings to do a onetime extract of tables of content with links to the pages referenced for each doc in the library and generate a Guide entry. Then create the table of contents with page links on each addition of a new document. 

### LATEST SCENE
Create separate text boxes to put each section of the LATEST SCENE into separate text boxes that should be linked to appropriate oracles. Keep using the full, combined statement updated tot eh Latest Scene textbox, but update the realted text when the separate field is revised. This supports the GM empowerment to craft the story from the generated concept suggestion.

### TEXT EDITOR

- Include options for a tab indent, bullet points, numbered lists, font sizes, and table editor where tables are aligned left and have thin borders by default.