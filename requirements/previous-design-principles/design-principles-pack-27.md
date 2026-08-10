# Saga Atlas Design Constitution

# Pack 27 --- Testing Strategy, Quality Assurance & Release Process

## Purpose

Quality is measured by whether Saga Atlas improves the experience of
running a campaign, not simply by whether code compiles.

## Testing Pyramid

1.  Unit Tests
2.  Engine Integration Tests
3.  UI Workflow Tests
4.  Manual GM Play Sessions

Every release should satisfy all four levels.

## Unit Tests

Required for:

-   Storage Kernel
-   Context Graph
-   Story Engine
-   Entity Engine
-   Group Engine
-   Dice Engine
-   Oracle Engine

## Integration Tests

Verify interactions between:

-   Import / Export
-   Storage and UI
-   Context Graph and Story Engine
-   Templates and Dice
-   Activities and Rules Lenses

## Regression Tests

Every resolved defect receives a regression test.

Priority areas:

-   Autosave
-   Campaign restore
-   Import compatibility
-   Relationship integrity
-   Scene continuity
-   Workspace navigation

## Manual Play Validation

Before release, complete a short campaign session using Mission Control.

Validate:

-   Continue Story
-   Shift Story
-   End Scene
-   Journal
-   Dice
-   Entity updates
-   Recommendations

If play feels awkward, treat it as a defect.

## Performance Targets

-   Fast startup
-   Responsive workspace changes
-   Debounced autosave
-   Smooth drawer animations
-   No polling-based synchronization

## Release Checklist

-   Documentation updated
-   Schema version incremented (if needed)
-   Migration verified
-   Sample campaign loads
-   Existing campaigns preserved
-   New features demonstrated

## Acceptance Criteria

Every release should improve:

-   Reliability
-   Simplicity
-   Continuity
-   Discoverability
-   Frictionless Empowerment

No feature is complete until it has been tested in actual gameplay.
