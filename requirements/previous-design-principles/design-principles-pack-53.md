# Saga Atlas Design Constitution

# Pack 53 --- Engine Interface Contracts & API Boundaries

## Purpose

This document defines the public contracts between engines so that
implementation details remain isolated and interchangeable.

## Design Principles

-   Engines communicate through interfaces.
-   Engines never reach into another engine's internal state.
-   Public methods are deterministic and side-effect aware.
-   All mutations emit domain events.

## Core Engine Interfaces

### Storage Kernel

Responsibilities:

-   LoadCampaign()
-   SaveCampaign()
-   ImportCampaign()
-   ExportCampaign()
-   MigrateCampaign()

### Context Graph

Responsibilities:

-   AddRelationship()
-   RemoveRelationship()
-   QueryContext()
-   QueryNeighbors()
-   ResolveScope()

### Story Engine

Responsibilities:

-   ContinueStory()
-   ShiftStory()
-   ResolveScene()
-   AdvanceTime()

### Activity Engine

Responsibilities:

-   RecommendRulesLens()
-   ResolveActivity()
-   ListActivities()

### Dice Engine

Responsibilities:

-   Roll()
-   Interpret()
-   RecordResult()

### Oracle Engine

Responsibilities:

-   RecommendOracle()
-   RollOracle()
-   RecordOracle()

## Interface Rules

-   No UI references.
-   No browser APIs.
-   No storage calls outside Storage Kernel.
-   Domain objects passed by value or immutable reference where
    practical.

## Acceptance Criteria

-   Engines remain independently testable.
-   Swapping implementations does not affect callers.
-   Interface changes require versioned documentation updates.
