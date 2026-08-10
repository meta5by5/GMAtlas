# Saga Atlas Design Constitution

# Pack 40 --- Design Review Checklist & Architectural Smell Catalog

## Purpose

This document provides a practical review checklist for every new
feature, refactor, and release. It also catalogs architectural "smells"
that indicate the design is drifting away from the Campaign Operating
System vision.

## Review Questions

Before approving a change, ask:

1.  Does this reduce cognitive load?
2.  Does it strengthen campaign continuity?
3.  Does it fit naturally into Mission Control?
4.  Can it be discovered without documentation?
5.  Does it preserve Frictionless Empowerment?
6.  Does it reuse existing engines?
7.  Does it avoid duplicate data?
8.  Does it simplify future development?

If multiple answers are "no", redesign before implementation.

## Architectural Smells

### Multiple Sources of Truth

Symptoms: - Same value stored in multiple places. - Synchronization
bugs. - Import/export inconsistencies.

Remedy: - Move ownership to the appropriate engine.

### UI Owns Business Logic

Symptoms: - Large click handlers. - Conditional rules scattered across
components.

Remedy: - Move behavior into domain engines.

### Navigation Explosion

Symptoms: - More pages. - More menus. - More tabs.

Remedy: - Replace navigation with contextual workspaces and drawers.

### Feature Silos

Symptoms: - Standalone modules. - Duplicate editors. - Inconsistent
workflows.

Remedy: - Integrate with Mission Control and the Context Graph.

### Configuration Before Context

Symptoms: - User asked to select information already known. - Long setup
dialogs.

Remedy: - Infer from campaign context first.

## UX Smells

-   Excessive scrolling
-   Hidden primary actions
-   Dense forms
-   Unexplained recommendations
-   Multiple confirmation dialogs
-   Unclear ownership of data

## Release Gate

A feature should not ship until:

-   Architecture reviewed
-   Documentation updated
-   Acceptance criteria satisfied
-   Manual play session completed
-   Existing campaigns verified

## Closing Principle

When in doubt, optimize for the Game Master's attention.

Attention is Saga Atlas's most valuable resource.
