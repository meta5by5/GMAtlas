# Saga Atlas Design Constitution

# Pack 20 --- AI Co-Pilot Design & Decision Support

## Purpose

The Co-Pilot is an intelligent campaign assistant.

It does not replace the Game Master.

Its responsibility is to observe campaign state, identify opportunities,
and present useful suggestions at the right moment.

## Core Philosophy

The Co-Pilot should answer:

-   What is most important right now?
-   What is likely to happen next?
-   What might I have forgotten?
-   What options fit the current story?

It should never answer:

-   What must happen?

## Design Principles

The Co-Pilot is:

-   Context-aware
-   Explainable
-   Non-authoritative
-   Interruptible
-   Optional

Every recommendation should include an explanation.

## Observation Types

The Co-Pilot continuously observes:

-   Story momentum
-   Active threads
-   Entity relationships
-   Timers
-   Narrative trackers
-   Faction activity
-   Resource changes
-   Time progression

## Recommendation Categories

Examples include:

-   Continue Story
-   What Happens Next?
-   What Did I Overlook?
-   Suggested NPC
-   Suggested Location
-   Suggested Oracle
-   Suggested Rules Lens
-   Suggested Consequence
-   Suggested Reward
-   Suggested Discovery

## Recommendation Card

Every recommendation displays:

-   Title
-   Confidence
-   Reason
-   Related entities
-   Related threads
-   Related locations
-   Suggested action

Buttons:

-   Accept
-   Modify
-   Ignore
-   Pin

## Campaign Memory

The Co-Pilot remembers:

-   Accepted suggestions
-   Ignored suggestions
-   Frequently used story patterns
-   Preferred rules lenses
-   Recent oracle usage

Memory improves future recommendations without forcing repetition.

## Conversation Style

Responses should be:

-   Brief
-   Contextual
-   Action-oriented

Example

Observation: "The maintenance crew has not appeared in three scenes."

Suggestion: "Consider checking whether they have become a new thread."

## Explainability

Every recommendation must answer:

"Why am I seeing this?"

The explanation should reference campaign context rather than hidden
reasoning.

## Acceptance Criteria

-   The Co-Pilot supports the GM without becoming the narrator.
-   Recommendations are contextual and explainable.
-   Accepting a recommendation updates the campaign state.
-   Ignoring a recommendation has no negative effect.
