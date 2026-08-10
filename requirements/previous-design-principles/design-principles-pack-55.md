# Saga Atlas Design Constitution

# Pack 55 --- Architectural Glossary & Shared Vocabulary

## Purpose

This glossary establishes a single vocabulary for developers, designers,
and Game Masters.

Consistent language reduces ambiguity and keeps documentation aligned.

## Canonical Terms

### Campaign

The complete persistent body of story, entities, history, relationships,
settings, and player progress.

### Mission Control

The primary workspace from which the Game Master runs the campaign.

### Context Graph

The network of relationships describing what is currently relevant.

### Story Engine

The subsystem that evaluates narrative state and proposes story
progression.

### Decision Engine

The subsystem that determines which recommendations should be surfaced.

### Activity

A system-neutral description of what the characters are attempting to
accomplish.

### Rules Lens

The rules system currently being used to resolve an activity.

### Story Action

A narrative operation initiated by the GM such as Continue Story, Shift
Story, Reveal, or Travel.

### Knowledge Graph

The interconnected reference network spanning entities, journals, PDFs,
maps, and rules.

### Co‑Pilot

The advisory interface presenting explainable recommendations.

### Drawer

A contextual panel that supplements Mission Control without replacing
it.

## Naming Conventions

Prefer domain language over implementation language.

Examples:

Use: - Story Action - Thread - Relationship - Activity

Avoid: - Module - Record - Dialog State - Feature Page

## Acceptance Criteria

-   Documentation uses consistent terminology.
-   UI labels match architectural language.
-   New contributors can understand discussions without translating
    between different vocabularies.
