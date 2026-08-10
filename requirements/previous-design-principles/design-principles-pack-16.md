# Saga Atlas Design Constitution

# Pack 16 --- Plugin Architecture, Extensibility & Future Systems

## Purpose

Saga Atlas must be extensible without requiring modifications to Mission
Control.

Every future capability should plug into existing engines through stable
interfaces.

## Philosophy

The application should grow by adding capabilities, not by increasing
complexity.

Mission Control remains unchanged while plugins contribute:

-   Templates
-   Rules Lenses
-   Story Actions
-   Oracles
-   PDFs
-   Activities
-   Entity Types
-   Drawers

## Plugin Types

### Rules Plugins

Provide:

-   Character Templates
-   Dice Methods
-   Activities
-   Roll Interpreters

Examples

-   Starforged
-   Five Parsecs From Home
-   Hostile
-   Traveller
-   Twilight: 2000

## Oracle Plugins

Supply:

-   Oracle tables
-   Categories
-   Context tags
-   Weighting metadata

The Oracle Engine selects from all registered plugins.

## PDF Plugins

Register:

-   Rulebooks
-   Indexed chapters
-   Context tags
-   Deep page links

## Entity Plugins

Introduce:

-   New entity types
-   Default templates
-   Relationships
-   Story actions

Examples

-   Mechs
-   Corporations
-   Magic
-   Star Nations

## Story Action Plugins

Contribute new narrative verbs.

Examples

-   Negotiate
-   Evacuate
-   Hack
-   Build
-   Recruit
-   Research

Mission Control displays them automatically when context matches.

## Activity Mapping

Plugins declare which activities they support.

Activity

↓

Recommended Rules Lens

↓

Suggested PDFs

↓

Suggested Oracles

↓

Dice Method

No hard-coded mappings exist inside the UI.

## Version Compatibility

Every plugin declares:

-   Minimum Saga Atlas version
-   Schema version
-   Supported engines
-   Migration requirements

## Future Opportunities

The same architecture should support:

-   Foundry integration
-   VTT synchronization
-   Cloud collaboration
-   AI providers
-   Mobile companion apps
-   Community plugins

## Acceptance Criteria

-   New rules systems require no Mission Control redesign.
-   Plugins communicate through stable interfaces.
-   Removing a plugin never corrupts campaign data.
-   Core architecture remains independent of optional content.
