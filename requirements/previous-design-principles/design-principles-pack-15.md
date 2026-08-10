# Saga Atlas Design Constitution

# Pack 15 --- Coding Standards, Architecture & Development Rules

## Purpose

This document establishes the engineering rules that govern Saga Atlas.

Architecture is preserved through standards rather than convention.

## Guiding Principles

-   Mission Control owns the user experience.
-   The Context Graph owns narrative context.
-   The Storage Kernel owns persistence.
-   Engines own behavior.
-   Components own presentation.

No responsibility should overlap.

## Folder Structure

/core - StorageKernel - ContextGraph - EntityEngine - GroupEngine -
StoryEngine - DiceEngine

/services - ImportExport - GoogleDrive - PdfService

/ui - MissionControl - Workspaces - Components - Drawers

/docs - Design Constitution - Architecture - API

## Component Rules

Components must:

-   Be reusable.
-   Be stateless where practical.
-   Receive data through interfaces.
-   Avoid direct storage access.
-   Avoid direct engine dependencies.

## Event Flow

User Action

↓

Workspace

↓

Engine

↓

Context Graph

↓

Storage Kernel

↓

UI Refresh

No UI component writes directly to persistence.

## Forbidden Practices

-   Global mutable state.
-   Monkey-patching.
-   Multiple definitions of the same function.
-   Polling with setInterval for synchronization.
-   Direct localStorage access outside StorageKernel.
-   Hard-coded character sheets.

## Required Practices

-   Single source of truth.
-   Explicit interfaces.
-   Versioned schemas.
-   Context-first design.
-   Progressive enhancement.
-   Automated migration support.

## Testing

Every Epic should include:

-   Unit tests
-   Integration tests
-   Import/export regression tests
-   Save/restore tests
-   Performance checks
-   Manual play-session validation

## Acceptance Criteria

-   The architecture remains modular.
-   New rules systems require templates rather than rewrites.
-   UI changes never bypass the Context Graph.
-   Campaign data survives upgrades without user intervention.
