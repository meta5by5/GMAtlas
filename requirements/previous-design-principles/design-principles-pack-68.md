# Saga Atlas Design Constitution

# Pack 68 --- Performance, Scalability & Longevity

## Purpose

This document defines how Saga Atlas should remain responsive as
campaigns grow from a handful of entities to decades of accumulated
history.

## Performance Philosophy

Optimize for the Game Master's flow.

Small delays during play have greater impact than longer background
operations.

## Scalability Goals

The platform should comfortably support:

-   Thousands of entities
-   Tens of thousands of relationships
-   Years of journal history
-   Large PDF libraries
-   Multiple rules systems
-   Numerous plugins

without requiring workflow changes.

## Performance Principles

-   Lazy-load large datasets.
-   Index searchable content.
-   Cache derived context.
-   Batch expensive graph updates.
-   Debounce autosaves.
-   Virtualize long lists.

## Background Work

Run asynchronously when practical:

-   Search indexing
-   Graph analysis
-   Recommendation precomputation
-   PDF indexing
-   Cloud synchronization

Mission Control should remain responsive.

## Memory Management

Avoid retaining unnecessary UI state.

Dispose inactive workspaces.

Release cached data when no longer needed.

## Acceptance Criteria

-   Large campaigns remain responsive.
-   Performance scales predictably.
-   Background processing never blocks storytelling.
-   Long-term campaign growth does not require architectural redesign.
