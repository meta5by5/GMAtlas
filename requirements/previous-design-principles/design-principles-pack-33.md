# Saga Atlas Design Constitution

# Pack 33 --- Object Model, Data Ownership & Domain Architecture

## Purpose

This document defines the conceptual domain model that underpins Saga
Atlas.

The architecture should model the campaign domain rather than the user
interface.

## Core Domain Objects

Primary objects:

-   Campaign
-   Story
-   Mission
-   Scene
-   Beat
-   Entity
-   Group
-   Relationship
-   Activity
-   Rules Lens
-   Journal Entry
-   Tracker
-   Oracle
-   PDF Reference

These objects remain stable regardless of UI changes.

## Data Ownership

Each object has a single authoritative owner.

Campaign
:   Storage Kernel

Relationships
:   Context Graph

Story State
:   Story Engine

Templates
:   Template Engine

Activities
:   Activity Engine

Dice
:   Dice Engine

Recommendations
:   Campaign Intelligence Engine

Presentation
:   Mission Control

## Entity Lifecycle

Create

↓

Tag

↓

Template Applied

↓

Relationships Added

↓

Referenced by Story

↓

Archived (never deleted unless explicitly requested)

## Immutable History

Campaign history should be append-only where practical.

Edits create revisions rather than silently replacing significant
narrative events.

## References vs Copies

Objects should reference one another instead of duplicating data.

Examples:

-   Crew references Character entities.
-   Missions reference Locations.
-   Threads reference Journal Entries.
-   PDFs reference Topics.

## Domain Events

Meaningful changes emit events:

-   EntityCreated
-   RelationshipAdded
-   StoryAdvanced
-   TimeAdvanced
-   TrackerChanged
-   ActivityChanged

Engines react to events rather than polling state.

## Acceptance Criteria

-   Every major concept maps to a domain object.
-   Ownership is unambiguous.
-   Data duplication is minimized.
-   UI remains independent of domain model.
