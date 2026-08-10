# Saga Atlas Design Constitution

# Pack 08 --- Storage Kernel, Persistence & Campaign Integrity

## Purpose

The Storage Kernel is the single source of truth for every campaign.

No subsystem reads from or writes directly to browser storage.

All persistence flows through the Storage Kernel.

## Design Goals

-   One campaign object.
-   One save pipeline.
-   One load pipeline.
-   One import pipeline.
-   One export pipeline.
-   Automatic migrations.
-   Automatic autosave.
-   Version-aware persistence.

## Canonical Campaign Object

Campaign - Metadata - Entities - Groups - Relationships - Templates -
Story - Journal - Oracles - Trackers - Rules Settings - Campaign
Settings - UI Preferences

All modules receive references to this object.

## Persistence Pipeline

UI Change

↓

Campaign Object

↓

Storage Kernel

↓

Autosave

↓

Browser Storage

The UI never writes directly to LocalStorage.

## Autosave

Autosave occurs after every meaningful state change.

Requirements:

-   Debounced writes.
-   Dirty-state detection.
-   Visible save status.
-   Timestamp of last successful save.

## Import

Import performs:

1.  Read file.
2.  Validate JSON.
3.  Detect version.
4.  Run migrations.
5.  Merge or replace campaign.
6.  Refresh Context Graph.
7.  Autosave.
8.  Display import report.

The report includes:

-   Imported entities
-   Imported groups
-   Imported templates
-   Warnings
-   Errors
-   Migration steps

## Export

Export always contains the complete campaign.

Never export fragmented storage keys.

The exported document must be sufficient to reconstruct the campaign on
another device.

## Google Drive

Storage providers should be interchangeable.

Local Storage

↓

Storage Kernel

↓

Provider

Examples:

-   Local browser
-   JSON file
-   Google Drive
-   Future cloud services

Mission Control remains unaware of the provider.

## Versioning

Every campaign stores:

-   Schema version
-   App version
-   Migration history
-   Created date
-   Last modified date

## Acceptance Criteria

-   Refreshing the page restores the campaign.
-   Updating the application preserves campaign data.
-   Import and export are symmetrical.
-   Only the Storage Kernel communicates with browser persistence APIs.
