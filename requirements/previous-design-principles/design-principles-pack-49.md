# Saga Atlas Design Constitution

# Pack 49 --- Design Patterns & Canonical Interaction Recipes

## Purpose

This volume documents reusable interaction patterns so new features feel
consistent with the rest of Saga Atlas.

## Pattern: Context Before Choice

Never ask the user to select information already implied by the current
campaign context.

Example:

Current Planet → suggest only valid settlements.

## Pattern: Story Action

Every major workflow begins with a narrative verb:

-   Continue Story
-   Reveal
-   Investigate
-   Travel
-   Negotiate
-   Recover
-   Escalate

Story actions invoke engines; they do not edit raw records.

## Pattern: Inspect Without Leaving

Selecting an entity opens an Inspector drawer.

Mission Control remains visible.

## Pattern: Acceptable Recommendation

A recommendation must contain:

-   Why it appeared
-   Related context
-   One-click action
-   Dismiss option

## Pattern: Progressive Detail

Summary first.

Details on demand.

Editing only when requested.

## Pattern: Linked Knowledge

Every important object should expose:

-   Related entities
-   Related journal entries
-   Related threads
-   Related PDFs
-   Related locations

## Anti-Patterns

Avoid:

-   Wizard-style workflows
-   Duplicate editors
-   Modal overload
-   Hidden state
-   Multiple save buttons

## Acceptance Criteria

New features should reuse these patterns before inventing new
interaction models.
