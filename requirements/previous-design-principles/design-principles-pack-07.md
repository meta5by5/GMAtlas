# Saga Atlas Design Constitution

# Pack 07 --- HOW Workspace, Rules Lenses & Gameplay Integration

## Purpose

The HOW workspace answers one question:

**How will the current story be experienced?**

It selects mechanics without changing the narrative.

## Rules Lens Philosophy

The campaign is system-neutral.

Rules are interchangeable lenses applied to the current activity.

Examples

Conversation → Starforged

Investigation → Starforged

Exploration → Starforged

Tactical Combat → Five Parsecs From Home

Trade → Hostile

Base Building → Planetfall

Vehicle Chase → Traveller

Changing the lens never rewrites campaign history.

## Activities

Activities drive recommendations instead of rulebooks.

Core activities:

-   Conversation
-   Investigation
-   Exploration
-   Travel
-   Combat
-   Trade
-   Salvage
-   Crafting
-   Colony
-   Downtime
-   Medical
-   Research

Each activity maps to one or more supported systems.

## Dice Integration

The dice panel remains docked in the lower-right corner.

Requirements:

-   Always visible during play.
-   Minimized footprint.
-   Expandable history.
-   Context-aware roll labels.
-   Roll results can be appended to the Journal.

Supported methods:

### Starforged

Action Die + Challenge Dice

Display:

-   Strong Hit
-   Weak Hit
-   Miss

### Five Parsecs From Home

Attribute + d6

Display:

-   Roll
-   Target
-   Success / Failure

The dice engine determines the display from the selected rules lens.

## Character Templates

Each rules system contributes a template.

Templates define:

-   Fields
-   Attribute order
-   Dice method
-   Layout groups

Templates are rendered dynamically from settings rather than hard-coded
forms.

## Story Before Mechanics

Mechanics should answer the story rather than dictate it.

The workflow is:

Story Context

↓

Choose Activity

↓

Recommended Rules Lens

↓

Roll Dice

↓

Update Story

Never the reverse.

## Acceptance Criteria

-   Changing the activity updates recommended mechanics.
-   Story state remains unchanged when switching systems.
-   Dice results integrate with Journal and Context Graph.
-   New rules systems can be added without redesigning Mission Control.
