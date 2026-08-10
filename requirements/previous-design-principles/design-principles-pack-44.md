# Saga Atlas Design Constitution

# Pack 44 --- Security, Trust & User Ownership

## Purpose

Saga Atlas is the steward of a user's creative work. The architecture
must ensure that users retain ownership, control, and confidence in
their campaign data.

## Guiding Principles

-   The user's campaign belongs to the user.
-   Saving should be automatic, transparent, and reliable.
-   Export should always produce a complete, portable representation.
-   Imports should never silently destroy existing work.
-   Every significant change should be recoverable.

## Data Ownership

Campaigns should remain usable even if:

-   internet access is unavailable,
-   cloud providers change,
-   integrations are removed,
-   the application is upgraded.

The canonical campaign format should remain open, documented, and
versioned.

## Trust Indicators

Mission Control should communicate:

-   Save status
-   Last successful save time
-   Current storage provider
-   Pending changes
-   Import/export history

The user should never wonder whether work has been saved.

## Recovery

Support:

-   Autosave checkpoints
-   Manual snapshots
-   Version history
-   Undo/Redo
-   Restore from backup
-   Validation before overwrite

## Security Principles

-   Least privilege for integrations.
-   Explicit consent before cloud synchronization.
-   Separate authentication from campaign data.
-   Encrypt credentials and tokens where appropriate.
-   Never require cloud storage for core functionality.

## Acceptance Criteria

-   Campaigns remain portable.
-   Users retain full ownership of their data.
-   Save operations are visible and trustworthy.
-   Recovery paths exist for accidental changes.

## Closing Principle

User trust is earned through reliability, transparency, and predictable
behavior.
