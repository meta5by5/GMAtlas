# Saga Atlas Design Constitution

# Pack 28 --- Appendix, Terminology & Architectural Invariants

## Purpose

This appendix captures the architectural truths that should remain
stable as Saga Atlas evolves.

## Architectural Invariants

The following principles should remain true regardless of implementation
language, framework, or platform.

### Campaign First

The campaign is the primary object.

Everything else exists to support it.

### Story Before Mechanics

Mechanics are interchangeable.

Story continuity is permanent.

### Mission Control

Mission Control is the application.

Editors, inspectors and libraries support Mission Control.

### Context First

Recommendations derive from context.

Never require users to manually configure information the system already
knows.

### Relationships Over Records

Relationships determine narrative meaning.

The graph is more valuable than isolated entities.

### Progressive Disclosure

Only expose complexity when the user asks for it.

### Single Source of Truth

Every category of information has one authoritative owner.

Examples:

Storage → Storage Kernel

Relationships → Context Graph

Narrative → Story Engine

Templates → Template Engine

Presentation → Mission Control

### Frictionless Empowerment

Whenever two designs are equivalent, choose the one that:

-   requires fewer decisions,
-   requires fewer clicks,
-   preserves more context,
-   increases player agency.

## Common Terminology

Campaign
:   The complete body of story, entities, history and state.

Mission
:   A structured objective within an act.

Thread
:   A persistent unanswered narrative question.

Story Action
:   A deliberate narrative operation such as Reveal, Travel, Continue
    Story or Shift Story.

Rules Lens
:   The currently active rules system used to resolve an activity.

Activity
:   What the characters are attempting to accomplish.

Context Graph
:   The live network of relationships that defines campaign state.

Knowledge Graph
:   Searchable graph of campaign knowledge and reference material.

Co‑Pilot
:   Advisory system that observes and recommends.

Director State
:   Summary of campaign health and narrative pressure.

## Long-Term Success

Saga Atlas succeeds when Game Masters spend less time managing software
and more time experiencing memorable stories.

The ultimate measure of success is not the number of features
implemented.

It is the number of moments where the software quietly helps the Game
Master tell a better story without interrupting the experience.
