# Saga Atlas Design Constitution

# Pack 52 --- Canonical Data Schema & Versioning Strategy

## Purpose

This document defines the canonical campaign schema that every subsystem
should rely upon.

## Guiding Principles

-   One canonical campaign document.
-   Explicit schema version.
-   Forward-compatible migrations.
-   Stable identifiers.
-   Human-readable JSON.

## Top-Level Objects

Campaign - metadata - story - entities - groups - relationships -
templates - activities - trackers - journal - oracles - settings -
documents

## Versioning

Every campaign stores:

-   schemaVersion
-   applicationVersion
-   created
-   modified
-   migrationHistory

## Stable IDs

Every persistent object receives a globally unique identifier that never
changes.

Relationships reference IDs instead of names.

## Migration Rules

Each schema version provides:

-   validator
-   upgrader
-   downgrade policy (if possible)
-   compatibility notes

Migrations must be idempotent.

## Serialization Rules

Exports should:

-   preserve ordering where practical,
-   omit transient UI state,
-   include all campaign data,
-   remain portable across platforms.

## Acceptance Criteria

-   Every release can load previous campaign versions.
-   Canonical schema remains the only persisted representation.
-   Engines communicate through domain objects rather than raw JSON.
