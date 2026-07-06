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

## Add 7/5/26
- Have the entity Cybernetics section collapse and be collapsed by default. When rolling on a cybernetics list, add it to the edit field for installing a new item instad of displaying in a popup window. Each roll just overwrites the field until the install button is clicked. 
- Also, move Cybernetics under the statblock section. Regarding the Deepening button, have the Wants and Complication moved to Revealed/Hidden textbox. 
- Also, have the Revealed/Hidden section collapseable so the textbox is hidden initially. Once revealed for the entity, keep it revealed on future loading of the given entity. Also, once entity type is selected, changing it needs to have a popup to confirm Y/N. 
- Also have the Cast search field be able to search on entity type too. Also, for the Cybernetics reference used throughout the game, rename it to Enhancements and then have a dropdown per item that defines the type of enhancement such as cybernetics, psionics, gene-modification, etc. (whatever the available game systems call it). remove it if no active game systems have rules for enhancements. 
- Also, include a predetermined or automated creation of the PDF and page number linked in the Guide as a table of contents for all of the game mechanics such as strain, Supply, Momentum, etc. 
- Add a button in Settings for refreshing the items per active game system so that the new PDFs should be scanned and added to the table of contents.
- Revise 0004-merchant-rules-lens.md with the ideas below and prioritize these trade economy ideas when conflicts arise.
- update Trade mechanics to reference different economy types using Location tags derived from either a custom model or from the Traveller system that would be used to determine available commodities, supply and demand. 
- Considering the Lore, the economy types must be comptable with the worlds in Hostile as determined in the world descriptions found in the Hostile Settings and other Hostile references. If the game system doesn't have an appropriate economy for a certain type of biome, government type, tech level, then create it. However, still maintain the concept that swapping game systems should not break the system.
- Very important priority that flexibility in game systems to the type of mechanics is critical but cannot break the system if swapped out. The ongoing campaign will just use the new game system mechanics without breaking any historical information.
- When using Traveller, ensure the tech levels are all appropriate to the worlds in Hostile. Because of the Hostile setting, try to avoid direct reference to tech level and build everything off a simlar tech level but different scarcity and manufacturing capability.
- The custom Trade engine would be inspired by the game "Intergalactic Space Trader" but be fully compatble with the lore and setting in "Hostile". Strongly prefer Hostile rules and lore if conflicts arise. 
- Track Location economy types in Settings according to their game system and ensure they are always availabile by default in the Location entity tag list. Remove the tag reference from the list if the source game system for that location type is removed.
- No copyright conflicts can exist for custom systems or oracles that are built. Where a component is assigned a copywritten game mechanic but then creates a conflict with another custom mechanic if implemented, then create a bridge that prefers the copywritten material to make it clear that functionality aligns to that system. An example might be the trade mechanic conflicts with space ship or travel mechanics. Another example might be to create another oracle with a similar name but lists the game system as a suffix to know when to pick one over another.
- Only have one Trade exconomy model operating at a time. 
- Ensure that it is not game breaking to change models during a campaign.
- Also, the recent Styling creatures mentions "Creature Concept" oracle that doesn't come up in an oracles seach in the latest update. 
Make a generic cybernetics framework based off CWN that fits the bio-genetic concept in Hostile. Maybe call it Wetware or bio-genetics. It shouldn't conflict with the copyright of the design, but give the option for either or use frameworks if CWN is added as a game engine. 