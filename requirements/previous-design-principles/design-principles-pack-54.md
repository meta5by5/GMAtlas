# Saga Atlas Design Constitution

# Pack 54 --- Canonical UI State Model & Workspace Lifecycle

## Purpose

This document defines how user interface state is represented and
managed independently from campaign data.

## Principle

Campaign state and UI state are separate concerns.

Campaign data is portable.

UI state is disposable.

## UI State Categories

Persistent: - Preferred theme - Drawer widths - Last workspace - Panel
layout

Session: - Open drawers - Selected entity - Current search - Temporary
filters

Transient: - Hover targets - Drag operations - Selection rectangles -
Pending dialogs

## Workspace Lifecycle

Initialize

↓

Bind Context

↓

Render

↓

Respond to Events

↓

Dispose

Workspaces should not own campaign data.

## Restoration

When reopening a campaign:

-   Restore layout
-   Restore workspace
-   Restore drawer positions
-   Restore filters (optional)

Never overwrite campaign content.

## Acceptance Criteria

-   UI refreshes do not lose campaign state.
-   UI preferences remain optional.
-   Workspace behavior is deterministic.
-   Presentation remains independent of domain logic.
