# Saga Atlas Design Constitution

# Pack 11 --- PDF Integration, IFrames & Knowledge System

## Purpose

Saga Atlas should become the central workspace for the GM.

Reference material should come to the story rather than forcing the GM
to leave the application.

## Design Goals

-   Keep the GM in a single browser tab.
-   Surface rule references contextually.
-   Link entities directly to source material.
-   Support both local and online PDFs.

## PDF Entity

Rulebooks, supplements, adventures and notes are entities.

Each PDF entity contains:

-   Title
-   Source
-   Author
-   URL or Local Path
-   Tags
-   Chapters
-   Indexed Topics
-   Page References

## Deep Links

Relationships may point directly to pages.

Examples

Hostile.pdf Page 82

Starforged.pdf Page 145

Planetfall.pdf Page 31

Opening a reference should navigate directly to the linked page.

## Embedded Viewer

The preferred workflow uses an iframe or embedded PDF viewer.

Mission Control remains visible.

The PDF opens in a resizable drawer.

The GM never loses campaign context.

## Contextual References

The Context Graph recommends PDF pages.

Examples

Current Activity

Combat

↓

Suggested Rules

Hostile p.82

Current Oracle

Settlement Trouble

↓

Planetfall p.31

Current Asset

Dropship

↓

Vehicle Rules p.64

## Hover Cards

Hovering a reference displays:

-   Title
-   Page
-   Section
-   Summary
-   Open button

## Rulebook Links

Entities may reference:

-   Characters
-   Locations
-   Vehicles
-   Creatures
-   Equipment
-   Factions
-   Oracles

References should be many-to-many.

## Search

Searching "Medical"

Returns

PDF Pages

NPCs

Locations

Journal Entries

Threads

Assets

All in one result set.

## Acceptance Criteria

-   Rulebooks never replace Mission Control.
-   References open in drawers when possible.
-   Page links are persistent.
-   PDFs behave like knowledge nodes within the Context Graph.
