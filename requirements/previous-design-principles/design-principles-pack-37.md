# Saga Atlas Design Constitution

# Pack 37 --- Decision Engine, Adaptive Guidance & Autonomous Campaign Assistance

## Purpose

The Decision Engine is the orchestration layer that coordinates every
recommendation produced by Saga Atlas.

Unlike the Story Engine, which reasons about narrative, the Decision
Engine reasons about **what assistance the GM needs next**.

## Design Philosophy

The GM should never wonder:

-   What should I do now?
-   Which subsystem should I open?
-   Which oracle fits this situation?
-   Which rules system should I use?
-   Which NPC matters?

Instead, Saga Atlas should surface the most relevant next actions.

## Decision Pipeline

Current Context

↓

Context Graph

↓

Story Engine

↓

Campaign Intelligence Engine

↓

Decision Engine

↓

Mission Control

↓

GM Decision

The GM always makes the final choice.

## Decision Categories

### Story

-   Continue Story
-   Shift Story
-   Reveal Information
-   Raise Stakes
-   Resolve Thread

### Gameplay

-   Recommended Activity
-   Recommended Rules Lens
-   Suggested Dice Method
-   Suggested Oracle

### Campaign

-   Advance Time
-   Update Resources
-   Resolve Timer
-   Review Consequences

### Reference

-   Relevant PDF
-   Related Journal Entry
-   Similar NPC
-   Connected Mission

## Recommendation Confidence

Every recommendation includes:

-   Confidence Score
-   Explanation
-   Related Context
-   Impact Estimate

The GM understands *why* the recommendation appeared.

## Adaptive Guidance

The engine adapts to:

-   Campaign maturity
-   GM experience
-   Session length
-   Preferred play style
-   Rules preferences

Short sessions emphasize rapid play.

Long sessions encourage deeper world interaction.

## Cognitive Load Reduction

The engine should continuously reduce unnecessary choices.

Examples:

Instead of selecting from 200 oracle tables,

show the 3 most relevant.

Instead of searching entities,

surface the NPCs already involved.

Instead of opening multiple rulebooks,

link directly to the required pages.

## Long-Term Vision

Future versions may coordinate:

-   AI narrative suggestions
-   Dynamic faction simulation
-   Living economy
-   Campaign analytics
-   Session planning
-   Automated continuity checking

without replacing the GM.

## Acceptance Criteria

-   Recommendations remain contextual.
-   The GM never loses authority.
-   Decision support becomes progressively more useful as campaign
    history grows.
-   Mission Control becomes increasingly proactive while remaining
    non-intrusive.
