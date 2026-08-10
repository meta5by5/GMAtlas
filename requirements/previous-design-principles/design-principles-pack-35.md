# Saga Atlas Design Constitution

# Pack 35 --- Reference Integration, External Tools & Workspace Federation

## Purpose

Saga Atlas should become the central workspace for roleplaying, while
allowing specialized external tools to contribute without breaking
immersion.

## Philosophy

Bring tools to the story.

Do not force the Game Master to leave the story to use tools.

## Federated Workspace

Mission Control remains the primary interface.

External tools appear as integrated workspaces or drawers.

Examples:

-   PDF viewer
-   Star charts
-   Ship designer
-   Dice visualizer
-   Character creator
-   Foundry VTT
-   Campaign wiki
-   Google Drive

## Integration Levels

### Level 1 --- Deep Link

Open an external application or website at the relevant page.

### Level 2 --- Embedded View

Display the external application inside an iframe or embedded panel.

### Level 3 --- Data Integration

Synchronize entities, journal entries, or campaign state with the
external system.

### Level 4 --- Workflow Integration

Allow Saga Atlas to launch, coordinate, and retrieve results from
external tools while preserving context.

## Integration Contracts

Every integration should expose:

-   Capabilities
-   Supported entity types
-   Supported activities
-   Context requirements
-   Return data schema

Mission Control communicates through interfaces rather than custom code.

## Context Preservation

Opening an external tool must not lose:

-   Current workspace
-   Selected entity
-   Current mission
-   Current activity
-   Breadcrumb context
-   Story recommendations

Returning to Mission Control should feel instantaneous.

## Acceptance Criteria

-   External tools enhance rather than replace Mission Control.
-   Integrations preserve story context.
-   New integrations require adapters instead of architectural changes.
-   The GM remains in a single coherent workflow throughout play.
