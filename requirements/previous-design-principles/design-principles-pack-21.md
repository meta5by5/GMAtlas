# Saga Atlas Design Constitution

# Pack 21 --- Relationship UX, Drag & Drop, Breadcrumbs and Graph Navigation

## Purpose

Relationships are the primary editing model of Saga Atlas.

Instead of editing isolated records, the GM connects story elements.

## Relationship First

Every entity gains meaning through relationships.

Characters belong to groups.

Ships belong to crews.

Missions reference locations.

Locations reference factions.

Threads reference consequences.

## Drag and Drop

Drag any entity card onto another entity.

Examples

Character → Ship

Ship → Colony

NPC → Mission

Mission → Location

Lifeform → Planet

Drop opens a lightweight relationship chooser.

## Relationship Dialog

Contains:

-   Relationship Type
-   Notes
-   Story Importance
-   Visibility
-   Start Date
-   End Date (optional)

Defaults come from template metadata.

## Breadcrumbs

Breadcrumbs show current context.

Campaign → Act → Mission → Scene → Beat → Moment

Location chain:

Sector → System → Planet → Region → District → Structure

Clicking any crumb changes context without changing pages.

## Graph View

The graph is a drawer.

Capabilities:

-   Zoom
-   Filter by tag
-   Highlight current context
-   Show only related nodes
-   Trace shortest relationship path

## Quick Actions

Every node supports:

-   Inspect
-   Open Journal
-   Reveal in Story
-   Add Relationship
-   Pin
-   Focus Context

## Story Shifting

Changing focus updates recommendations while preserving history.

The graph never deletes relationships automatically.

Invalid links become flagged for review.

## Acceptance Criteria

-   Most relationship editing requires one drag-and-drop.
-   Breadcrumbs always explain current context.
-   Graph navigation never interrupts play.
-   Context changes are reversible and visible.
