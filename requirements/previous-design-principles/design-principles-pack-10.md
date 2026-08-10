# Saga Atlas Design Constitution

# Pack 10 --- Entity Templates & Dynamic Forms

## Purpose

Entity Templates define how entities behave, display, and interact.

Templates eliminate hard-coded forms and allow new game systems, entity
types, and rules to be added without modifying Mission Control.

## Philosophy

Data drives layout.

The UI should never contain hard-coded character sheets.

Instead:

Template

↓

Renderer

↓

Entity Card

## Template Components

Each template defines:

-   Display Name
-   Entity Type
-   Icon
-   Tags
-   Attribute Groups
-   Display Order
-   Dice Methods
-   Default Relationships
-   Default Trackers
-   Actions

## Layout Model

Templates use a grid:

Column Group

Row

Order

Width

Visibility

The renderer builds the interface automatically.

## Example

Starforged Character

Left Column

-   Edge
-   Heart
-   Iron
-   Shadow
-   Wits

Right Column

-   Health
-   Spirit
-   Supply
-   Momentum

Five Parsecs Character

Left

-   Combat
-   Toughness
-   Speed

Right

-   Savvy
-   Reactions
-   Luck

Mission Control renders both from template definitions.

## Dynamic Dice

Each field may specify a dice method.

Examples

Starforged

Action Die + Challenge Dice

Five Parsecs

d6 + Attribute

Traveller

2d6 + Skill

The dice engine queries the template to determine behavior.

## Conditional Display

Templates may display sections only when tags match.

Example

Tag

#Character

Displays

Character Sheet

Tag

#Starship

Displays

Ship Systems

Tag

#Lifeform

Displays

Encounter Information

## Crew Integration

Crew assignments should reference entities rather than duplicate data.

Changing the entity automatically updates every crew roster.

## Acceptance Criteria

-   No hard-coded character sheets.
-   Templates fully define layout.
-   Rules systems add templates rather than pages.
-   Dice behavior derives from templates.
