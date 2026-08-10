# Saga Atlas Design Constitution

# Pack 43 --- Enterprise Architecture Principles & Sustainability

## Purpose

This document defines the architectural principles that ensure Saga
Atlas remains maintainable over decades of development.

## Architectural Sustainability

The architecture should become simpler as features are added.

Growth should occur by extending existing engines rather than
introducing parallel systems.

## Capability Layers

Core Platform - Storage Kernel - Context Graph - Event Bus

Domain Engines - Story - Entity - Activity - Oracle - Dice -
Recommendation

Experience Layer - Mission Control - Drawers - Workspaces - Co‑Pilot

Integration Layer - Google Drive - PDFs - VTT - Plugins

## Technical Debt Policy

Technical debt is acceptable only when:

-   documented,
-   time-boxed,
-   tracked,
-   and scheduled for removal.

Undocumented debt is considered a defect.

## Dependency Rules

Lower layers never depend on higher layers.

Presentation depends on engines.

Engines depend on domain objects.

Domain objects never depend on UI.

## Release Philosophy

Prefer frequent, stable releases over infrequent large rewrites.

Every release should preserve user trust.

## Acceptance Criteria

-   Architecture diagrams remain accurate.
-   Dependencies remain directional.
-   New contributors can identify ownership quickly.
-   The platform remains extensible without major rewrites.

## Closing Principle

Build the platform so future developers spend their time creating
stories---not untangling architecture.
