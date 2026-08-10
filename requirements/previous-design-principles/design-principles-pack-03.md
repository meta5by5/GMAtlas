# Saga Atlas Design Constitution

# Pack 03 --- WHO Workspace & Entity Philosophy

## Purpose

The WHO workspace answers one question:

**Who matters right now?**

Rather than exposing an entity database, it presents only the people,
groups, factions, assets, and lifeforms that are relevant to the current
story context.

## Design Philosophy

The user should never think:

> "I need to edit an NPC."

Instead:

> "I need to introduce a scientist."

The workspace provides actions that accomplish narrative goals rather
than exposing records.

## Context Summary

Always visible:

-   Current Group
-   Active Party
-   Nearby NPCs
-   Nearby Factions
-   Nearby Assets
-   Nearby Lifeforms

Each summary displays relationship counts.

## Story Actions

Primary actions:

-   Add Character
-   Add NPC
-   Recruit Ally
-   Introduce Rival
-   Link Asset
-   Assign Mission
-   Change Active Group
-   Reveal Hidden Contact

These actions update the Context Graph rather than isolated records.

## Entity Philosophy

Everything is an Entity.

Examples:

-   Character
-   NPC
-   Creature
-   Vehicle
-   Starship
-   Colony
-   Settlement
-   Planet
-   Location
-   Faction
-   Organization
-   Mission
-   Objective
-   Asset
-   Rulebook
-   PDF

Behavior is determined by templates and relationships rather than
specialized classes.

## Relationship Rules

Relationships are first-class objects.

Examples:

Character → Member Of → Group

Character → Owns → Asset

Faction → Controls → Colony

Mission → Occurs At → Location

Lifeform → Encountered At → Planet

These relationships drive recommendations throughout Mission Control.

## Drag and Drop

Every entity card should support drag-and-drop.

Examples:

Drag Character onto Group

→ Add Member

Drag Ship onto Crew

→ Assign Vessel

Drag Mission onto NPC

→ Mission Giver

Drag Asset onto Character

→ Ownership

Dropping invokes a relationship dialog rather than editing multiple
forms.

## Entity Inspector

Selecting an entity opens the Inspector drawer.

The current workspace remains visible.

The drawer contains:

-   Templates
-   Relationships
-   Notes
-   Inventory
-   History
-   Linked PDFs
-   Dice Actions

Closing the drawer immediately returns focus to the story.

## Acceptance Criteria

-   WHO fits on one screen.
-   Common story actions require one interaction.
-   Relationships are editable without leaving Mission Control.
-   Entity editing never interrupts gameplay.
