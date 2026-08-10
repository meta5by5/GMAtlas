# Saga Atlas Design Constitution

# Pack 31 --- Developer Decision Framework & Architectural Governance

## Purpose

This document defines how future architectural decisions are evaluated
so Saga Atlas evolves without losing its identity.

## Decision Hierarchy

When evaluating any feature or refactor, apply these questions in order:

1.  Does it strengthen the story?
2.  Does it reduce cognitive load?
3.  Does it preserve campaign continuity?
4.  Does it integrate with Mission Control?
5.  Does it reuse existing engines?
6.  Does it simplify the architecture?

If the answer becomes "no" early, redesign before implementing.

## Architectural Layers

1.  Presentation (Mission Control)
2.  Workspace Controllers
3.  Engines
4.  Context Graph
5.  Storage Kernel

Dependencies always flow downward.

## Governance Rules

-   No duplicated sources of truth.
-   No UI-specific business logic.
-   No engine may directly manipulate another engine's internal state.
-   All changes pass through well-defined interfaces.

## Epic Checklist

Every major Epic should include:

-   Problem statement
-   UX rationale
-   Context Graph impact
-   Storage impact
-   Migration impact
-   Testing plan
-   Documentation update
-   Acceptance criteria

## Refactoring Policy

Refactoring is encouraged when it:

-   reduces coupling,
-   removes duplication,
-   simplifies workflows,
-   improves performance,
-   or clarifies intent.

Avoid refactors that merely rearrange code without measurable benefit.

## Success Metric

The project is succeeding when new features require **less** code and
**less** UI than earlier versions because the underlying architecture
has become more expressive.

## Closing Principle

Protect the architecture first.

Features can always be added later.
