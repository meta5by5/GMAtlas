# Saga Atlas Design Constitution

# Pack 32 --- Implementation Philosophy & Engineering Manifesto

## Purpose

This manifesto captures the engineering mindset expected for every
contribution to Saga Atlas.

The objective is not simply to build features, but to build a durable
Campaign Operating System.

## Engineering Principles

-   Build foundations before features.
-   Prefer architecture over patches.
-   Eliminate duplicate concepts.
-   Favor composition over specialization.
-   Design for extension rather than replacement.
-   Make the common workflow effortless.
-   Make advanced workflows discoverable.
-   Never sacrifice campaign continuity.

## User-First Architecture

The application's internal structure should reflect the Game Master's
mental model:

Story

↓

Context

↓

Decision

↓

Action

↓

Mechanics

↓

Persistence

The codebase should mirror this flow.

## Refactor Triggers

A subsystem should be redesigned when:

-   the same bug reappears,
-   state exists in multiple places,
-   features require workarounds,
-   users must remember implementation details,
-   navigation becomes more complex than the story.

## Backward Compatibility

New releases should:

-   migrate existing campaigns,
-   preserve user preferences,
-   preserve layouts,
-   preserve relationships,
-   preserve imported content.

Breaking campaign compatibility requires an explicit migration strategy.

## Documentation Standard

Every major subsystem should include:

-   Purpose
-   Responsibilities
-   Public interfaces
-   Data ownership
-   Event flow
-   Examples
-   Acceptance criteria

Documentation evolves alongside the code.

## Long-Term Goal

A contributor unfamiliar with the project should understand its
architecture by reading the Design Constitution before opening the
source code.

## Final Guideline

Every implementation should answer one question:

**Does this make it easier for a Game Master to tell a better story with
less effort while preserving complete creative control?**

If not, rethink the implementation before writing code.
