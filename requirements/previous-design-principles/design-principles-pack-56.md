# Saga Atlas Design Constitution

# Pack 56 --- Canonical Error Handling & Resilience Principles

## Purpose

This document defines how Saga Atlas should respond to failures while
preserving user trust and campaign integrity.

## Guiding Principle

Errors should never threaten the campaign.

Whenever possible:

-   Preserve user work.
-   Explain the problem.
-   Offer recovery.
-   Continue operating.

## Error Categories

### Validation Errors

User input is incomplete or inconsistent.

Response:

-   Highlight affected fields.
-   Explain the issue.
-   Preserve entered values.

### Persistence Errors

Saving or loading fails.

Response:

-   Keep the campaign in memory.
-   Warn the user.
-   Offer retry/export options.

### Integration Errors

Cloud or external services fail.

Response:

-   Continue local operation.
-   Degrade gracefully.
-   Retry only when appropriate.

### Plugin Errors

A plugin fails.

Response:

-   Isolate the failure.
-   Disable the plugin.
-   Preserve campaign data.

## User Messaging

Messages should be:

-   Specific
-   Actionable
-   Non-technical when possible

Avoid exposing stack traces in the primary UI.

## Recovery Strategy

Preferred order:

1.  Retry automatically.
2.  Recover locally.
3.  Restore from checkpoint.
4.  Request user intervention.

## Acceptance Criteria

-   Campaign data is never silently discarded.
-   Recoverable errors remain recoverable.
-   Failures are isolated whenever possible.
-   User trust is preserved through transparency.
