# Licenses, the Rules Constitution, and a campaign-scoped Docs library

**Status:** Accepted (v0.83.0)

## Context

Game System Activation used to be a per-profile checkbox list that both
claimed ownership of a book and turned it on. Supplements were all-or-nothing
and needed their parent book. Every campaign's Docs library listed every PDF
in the catalog, regardless of which games the campaign played. The Rules
Constitution was an 18-row table, and only one of those rows changed
anything.

The goal is to switch game systems on individually, per campaign, and to
make each campaign feel localized to its own selection of games. That
covers its rules, its Turn Steps and its sourcebooks.

## Decision

1. **Licenses are a registry of owned sourcebooks** (`src/data/licenses.js`).
   - Each license stands alone: a Compendium never needs its core book.
     Planetfall and the 5PFH Compendium (Bug Hunt) are standalone games.
   - A game's plain supplements ride on that game's single license. For
     example, all 14 Hostile books sit under the Hostile license, Traveller's
     supplements under Traveller, Starsmith under Starforged, and Delve under
     Ironsworn.
   - Ironsworn, Ironsworn: Starforged and the D&D 5e SRD are **open**
     (CC-BY). They're always owned, with no checkbox, and are the default
     fantasy and sci-fi rules.
   - Ownership is install-wide (`appConfig.licenses`). Settings → Licenses
     writes it directly, and store.js overlays it onto every doc's
     `settings.licenses`.
2. **Owning a license turns nothing on.** A Game System is *in use* when it
   is owned AND either the profile's Module for Profile or picked in a Rules
   Constitution area. `isGameSystemActivated()` means exactly this.
3. **The Rules Constitution has 6 areas that switch real functionality:**
   Campaign turn, Colony management, Character creation, Bestiary & enemies,
   Factions and Frontier setting.
   - Every dropdown leads with **Module for Profile**. It's stored as no
     pick, so it follows the module, and its label shows what it resolves to.
   - Next come only the owned providers. A supplement (the Five Leagues
     Compendium) is offered only while its parent system is in use, because
     its content only applies to that game.
   - Supplements switch on per area (`isSupplementInUse`), so a GM can take
     the Compendium's Origins without its enemies.
4. **Turn Steps follow Turn-Step areas only.** Campaign turn and Colony
   management are flagged `turnSteps`. A Campaign-panel tab, its Crew Tasks
   and its Navigator workflow card show only while that system is what such
   an area resolves to (`isTurnStepSystemActive`). Being in use for any other
   area (SWN for Factions, a Compendium for Bestiary) never brings Turn Steps
   along. In Settings → Modules, the Turn Step and Crew Tasks sub-tabs, the
   Turn Step Lists and the per-tab assignments all show only the selected
   profile's Turn-Step systems.
5. **The Docs library is campaign-scoped and has no default entries**
   (`listCampaignReferenceDocuments`).
   - It lists a sourcebook only when it has been pulled into this browser's
     document store, its license is owned, and one of its game systems is
     designated in this campaign. Open licenses are included only when
     designated too. Nothing shows just because it exists on the web server.
   - The Docs library has no load controls. Pulling books from the web
     server is an admin action that lives only on the Licenses tab (item 6),
     and access controls will isolate it later. Over time a browser can
     hold every sourcebook, but each campaign still lists only its own game
     systems' books.
   - A license with no rules of its own comes along with a related game via
     `alsoWith`: Cities Without Number with SWN, and Intergalactic Space
     Trader with Traveller or Hostile.
   - Scoping applies to the Documents drawer, @-mention suggestions, search
     and tag chips. Mention resolution, import matching and export use the
     full catalog, so an existing link never breaks.
6. **Every sourcebook is listed under its license in Settings → Licenses,
   with Load available once that license is activated.** Load fetches the
   PDF from the web server into this browser's document store, once. After
   that the row shows "☁ Loaded" with an Overwrite button, which asks first
   and replaces the same stored copy. It is keyed by its `assets/docs/`
   path, so a second copy is never stored. A license with several unstored
   books also gets "Load all" (one at a time). This is an admin function
   that access controls will isolate later. The row also shows
   the PDF's Sourcebook Inventory status. This replaces both the Modules
   tab's per-module Load button and its Sourcebook Inventory list.
7. **Migrations** run at store load:
   - `migrateLicensesFromActivations` runs while `appConfig.licenses` is
     absent. Every activated book becomes owned, and each profile gets the
     unset area picks that preserve what it showed.
   - `migrateLicensesV2` runs while `licensesVersion < 2`. Hostile and
     Traveller were free before, so an install gets the Hostile license if
     a profile picks Hostile for Frontier setting, and the Traveller license
     if a profile's module is Traveller.
   - The old `gameSystemActivations` stays on each profile, inert.
8. **The faction catalog default resolves through the Factions area.** With
   no pick that means GMAtlas Core. A stored SWN pick is honored even if the
   book is later un-owned, so existing faction data never switches catalogs.
9. **Source Data** (Settings → Campaigns, under Plugins) lists the content
   packs and data packs whose sourcebook's license is in use in the campaign
   (`isPackInUse`, the same test as the Docs library). Each has its own
   Import, and each Hostile zone imports separately. This replaces the
   Modules tab's old "Available Packs" list.
10. **Activity → Rules Lens** suggestions carry their own provider lists in
   `domain/activities.js`.

## Consequences

- A campaign shows only the rules, Turn Steps and sourcebooks of the game
  systems its profile designates.
- Each area allows a single pick. Assigning Campaign turn to another game
  replaces the module's own Turn Steps rather than adding to them.
- The catalog's old flat-path entries (from before `assets/docs/` had
  per-game subfolders) belong to no license, so they no longer appear in any
  campaign's Docs library. A blob loaded under one of those old keys is kept,
  just not listed.
- The D&D 5e license is open because of the SRD, but it also lists the
  Monster Manual, which is a commercial book.
- `store.update()` mutators see the raw doc, which has no `licenses` and no
  profile overlay. In-use checks inside a mutator must be given the
  overlaid settings explicitly.
- Option-by-option detail: `design/rules-constitution-mapping.md`.
