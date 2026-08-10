# Saga Atlas Design Constitution

# Pack 51 --- Architectural Decision Records (ADR) Standard

## Purpose

Architectural Decision Records (ADRs) preserve the reasoning behind
significant technical and product decisions.

Future contributors should understand *why* a decision was made, not
just *what* was implemented.

## When to Create an ADR

Create an ADR whenever a change:

-   Alters architecture.
-   Introduces a new engine.
-   Changes campaign persistence.
-   Modifies Mission Control workflows.
-   Adds a new extension point.
-   Changes import/export behavior.
-   Affects backward compatibility.

## ADR Template

### Title

Short, descriptive decision name.

### Status

-   Proposed
-   Accepted
-   Superseded
-   Deprecated

### Context

Describe the problem being solved.

### Decision

State the chosen approach.

### Alternatives Considered

List rejected options and why they were rejected.

### Consequences

Describe positive, negative, and future implications.

### Related Packs

Reference relevant Design Constitution packs.

## Example Topics

-   Event Bus adoption
-   Storage Kernel migration
-   Mission Control redesign
-   Drawer architecture
-   Context Graph ownership
-   Plugin SDK

## Review Process

Every ADR should answer:

-   Does it reduce cognitive load?
-   Does it preserve campaign continuity?
-   Does it strengthen Mission Control?
-   Does it simplify future development?

## Acceptance Criteria

-   Significant architectural decisions are documented.
-   Future contributors can trace design rationale.
-   Superseded decisions remain available as project history.
