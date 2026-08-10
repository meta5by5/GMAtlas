# Saga Atlas Design Constitution

# Pack 04 --- WHERE Workspace & Context Graph

## Purpose

The WHERE workspace answers one question:

**Where is the story happening right now?**

The workspace should describe the environment, not merely store location
records.

## Guiding Principle

Location is hierarchical.

Campaign → Sector → Star System → Planet / World → Region → Settlement →
District → Structure → Room / Encounter Site

Each level filters the levels beneath it.

Changing an upstream level only updates downstream values that are no
longer valid.

## Context Graph

Locations are connected by relationships.

Examples

Planet → contains → Region

Region → contains → Settlement

Settlement → contains → District

District → contains → Structure

Structure → contains → Encounter Site

These relationships determine suggested locations and story
possibilities.

## Workspace Layout

Current World

Current Region

Current Settlement

Current District

Current Encounter Site

Environmental Conditions

Nearby Points of Interest

Travel Connections

## Filtering Rules

Every selector filters the next.

Example

Planet = Orbital Station

Suggested Districts

✓ Operations

✓ Habitat Ring

✓ Docking

✗ Volcanic Field

✗ Ocean Basin

The system never suggests impossible environments.

## Derived Context

The workspace automatically derives:

-   Atmosphere
-   Population
-   Hazards
-   Lighting
-   Security
-   Weather
-   Gravity
-   Temperature

Derived values are suggestions and may be overridden.

## Story Actions

Travel

Discover New Location

Reveal Hidden Area

Enter Structure

Leave Area

Scan Environment

Create Landmark

## Breadcrumbs

Campaign → Act → Mission → Planet → District → Structure

Clicking any breadcrumb changes context without opening another page.

## Location Entities

Locations are entities.

Relationships may include

Located At

Adjacent To

Connected By

Owned By

Controlled By

Danger Level

Story Importance

## Acceptance Criteria

-   Upstream changes never unnecessarily modify valid downstream
    selections.
-   Every location can link to PDFs, maps, entities, and journal
    entries.
-   Travel updates campaign context.
-   Suggestions are always geographically valid.
