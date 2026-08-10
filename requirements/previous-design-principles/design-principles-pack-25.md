# Saga Atlas Design Constitution

# Pack 25 --- Implementation Roadmap, Milestones & Acceptance Criteria

## Purpose

This document defines how Saga Atlas evolves from the current prototype
into the complete Campaign Operating System.

Development is organized around architectural milestones rather than
isolated features.

## Guiding Principle

Every milestone should leave the application in a working, releasable
state.

New capabilities build on stable foundations.

## Milestone 1 --- Storage Foundation

Goals:

-   Storage Kernel
-   Unified campaign object
-   Autosave
-   Import / Export
-   Version migrations
-   Google Drive provider interface

Acceptance Criteria

-   Campaign survives refresh.
-   Campaign survives application upgrades.
-   Import and export are symmetrical.

## Milestone 2 --- Mission Control

Goals:

-   WHO / WHERE / WHAT / WHY / HOW
-   Adaptive workspace
-   Story Actions
-   Context Strip
-   Drawers

Acceptance Criteria

-   Entire session playable from Mission Control.

## Milestone 3 --- Context Graph

Goals:

-   Relationship engine
-   Recommendation engine
-   Knowledge Graph
-   Search
-   Breadcrumbs

Acceptance Criteria

-   Story recommendations derive entirely from graph state.

## Milestone 4 --- Gameplay Framework

Goals:

-   Activity Engine
-   Rules Lenses
-   Dice Engine
-   Character Templates
-   Oracle Engine

Acceptance Criteria

-   Switching rules systems requires no campaign conversion.

## Milestone 5 --- Campaign Intelligence

Goals:

-   Co‑Pilot
-   Story Engine
-   Consequence Engine
-   Campaign Director
-   Narrative Trackers

Acceptance Criteria

-   Recommendations become context-aware and explainable.

## Milestone 6 --- Knowledge Workspace

Goals:

-   PDF integration
-   Embedded readers
-   Linked references
-   Universal Search
-   Graph navigation

Acceptance Criteria

-   GM rarely leaves Saga Atlas during play.

## Milestone 7 --- Ecosystem

Goals:

-   Plugin SDK
-   Community oracles
-   Additional rules systems
-   Mobile companion
-   Foundry integration
-   Cloud collaboration

Acceptance Criteria

-   Core architecture remains unchanged while ecosystem grows.

## Definition of Done

A feature is complete only when:

-   Architecture is documented.
-   UI is consistent.
-   Context Graph is updated.
-   Storage migration exists.
-   Import/Export is verified.
-   Manual play session succeeds.
-   Automated tests pass.

## Long-Term Vision

Saga Atlas becomes the central operating system for tabletop roleplaying
campaigns.

It remembers the campaign, understands the current context, recommends
meaningful next steps, and allows Game Masters to move effortlessly
between stories, rules systems, and reference material while remaining
immersed in play.

The software disappears.

Only the story remains.
