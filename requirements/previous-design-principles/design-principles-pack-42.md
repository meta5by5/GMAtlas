# Saga Atlas Design Constitution

# Pack 42 --- Product Principles Audit & Future Decision Matrix

## Purpose

This document serves as a standing architectural audit that future
contributors can use before implementing features.

## The Four Filters

Every proposal must pass four filters:

1.  Story Filter
    -   Does this strengthen storytelling?
2.  Workflow Filter
    -   Does this reduce friction?
3.  Architecture Filter
    -   Does it fit existing engines instead of creating another
        subsystem?
4.  Longevity Filter
    -   Will this still make sense five years from now?

If any answer is no, redesign first.

## Decision Matrix

  Question              Preferred Answer
  --------------------- ---------------------------------------
  New page?             No---extend Mission Control
  Duplicate data?       Never
  New entity type?      Use templates
  New workflow?         Integrate with existing Story Actions
  New storage?          Route through Storage Kernel
  New recommendation?   Explain why it exists

## Product Compass

Always optimize for:

-   Campaign continuity
-   Cognitive simplicity
-   Story awareness
-   Context-driven interaction
-   Extensibility
-   Reliability

Never optimize for feature count.

## Architectural North Star

The ideal Saga Atlas session is one where:

-   the GM never searches for information,
-   the correct tools appear automatically,
-   recommendations are timely,
-   campaign memory is complete,
-   and the software fades into the background.

## Final Principle

Saga Atlas is successful when it becomes an invisible creative partner
that quietly helps Game Masters tell better stories.

End of Design Constitution.
