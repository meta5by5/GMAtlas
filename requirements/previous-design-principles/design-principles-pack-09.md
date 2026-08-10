# Saga Atlas Design Constitution

# Pack 09 --- Context Graph & Relationship Engine

## Purpose

The Context Graph is the heart of Saga Atlas.

It is the living representation of the campaign and determines what is
relevant at any moment.

Unlike a database, the Context Graph models meaning through
relationships.

## Design Goals

-   Single source of narrative context.
-   Relationship-first architecture.
-   Dynamic recommendations.
-   Minimal manual filtering.
-   Reusable across all rules systems.

## Core Principle

Relationships are more valuable than records.

A character with no relationships contributes little to the story.

A well-connected character can influence recommendations, scene
generation, and campaign continuity.

## Graph Objects

Nodes

-   Character
-   Group
-   Ship
-   Vehicle
-   Colony
-   Planet
-   Location
-   Mission
-   Thread
-   Faction
-   Asset
-   Lifeform
-   Journal Entry
-   Rulebook
-   PDF

Edges

-   Member Of
-   Owns
-   Controls
-   Located At
-   Assigned To
-   Allied With
-   Opposed To
-   Encountered
-   Investigating
-   Related To
-   Uses
-   References

## Relationship Weights

Relationships may include:

-   Strength
-   Confidence
-   Story Importance
-   Last Used
-   Visibility

These values influence Co‑Pilot recommendations.

## Dynamic Context

The active context is computed from:

Current Mission

↓

Current Group

↓

Current Location

↓

Open Threads

↓

Current Activity

↓

Relevant Relationships

Only related entities should appear in Mission Control.

## Automatic Suggestions

The graph supports:

-   Suggested NPCs
-   Suggested factions
-   Nearby locations
-   Recommended assets
-   Relevant PDFs
-   Recommended oracles
-   Story consequences

## Manual Relationships

Drag-and-drop should create relationships.

Users should never need to edit IDs or lookup tables.

## Invalid Relationships

When context changes:

Valid relationships remain unchanged.

Invalid relationships become flagged rather than deleted.

The GM decides how to resolve them.

## Acceptance Criteria

-   Relationship creation requires one interaction.
-   Recommendations are graph-driven.
-   Graph updates occur immediately after edits.
-   Story context always derives from the graph.
