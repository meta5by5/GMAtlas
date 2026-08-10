# Saga Atlas Design Constitution

# Pack 34 --- Event Bus, State Synchronization & Reactive Architecture

## Purpose

This document defines how changes propagate through Saga Atlas without
tight coupling or polling.

## Philosophy

State changes should be announced, not discovered.

Subsystems react to events instead of repeatedly checking for changes.

## Architectural Flow

User Action

↓

Workspace Controller

↓

Domain Engine

↓

Domain Event

↓

Event Bus

↓

Interested Subscribers

↓

UI Refresh

## Event Bus Responsibilities

-   Publish domain events.
-   Deliver events in order.
-   Prevent circular updates.
-   Batch related updates.
-   Support undo/redo checkpoints.

## Common Events

-   CampaignLoaded
-   CampaignSaved
-   EntityUpdated
-   RelationshipChanged
-   ActivityChanged
-   StoryShifted
-   TimeAdvanced
-   RecommendationAccepted
-   RecommendationDismissed
-   OracleRolled
-   DiceResolved

## Synchronization Rules

Only engines mutate domain state.

UI components render state.

Storage persists state.

No component should directly modify another component's internal state.

## Reactive Updates

Mission Control refreshes only affected panels.

Examples:

Entity changed → WHO updates

Location changed → WHERE updates

Objective changed → WHY updates

Activity changed → HOW updates

The full interface should not rerender unnecessarily.

## Undo / Redo

Major events create checkpoints.

The user may undo narrative edits without corrupting campaign history.

## Acceptance Criteria

-   No polling loops.
-   No duplicate refresh logic.
-   Changes propagate through events.
-   UI remains synchronized through reactive updates.
