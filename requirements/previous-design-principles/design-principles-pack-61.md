# Saga Atlas Design Constitution

# Pack 61 --- Implementation Principles for AI-Assisted Development

## Purpose

This document defines how AI-assisted implementation should interact
with the Saga Atlas architecture.

## Guiding Philosophy

AI should accelerate implementation while preserving architectural
integrity.

Generated code should conform to the Design Constitution rather than
inventing new patterns.

## AI Responsibilities

AI should:

-   Follow existing architecture.
-   Reuse engines before creating new ones.
-   Preserve backward compatibility.
-   Generate tests with new features.
-   Update documentation alongside code.

AI should not:

-   Introduce duplicate sources of truth.
-   Bypass the Storage Kernel.
-   Hard-code workflows already represented by templates.
-   Replace domain logic with UI logic.

## Prompting Standard

Implementation requests should specify:

-   User workflow
-   Architectural impact
-   Domain objects affected
-   Acceptance criteria
-   Migration considerations

## Review Checklist

Before accepting AI-generated code, verify:

-   Uses existing engine interfaces.
-   Preserves campaign continuity.
-   Emits appropriate domain events.
-   Includes documentation updates.
-   Passes regression tests.

## Acceptance Criteria

AI-generated contributions remain indistinguishable from manually
designed architecture and strengthen the long-term Campaign Operating
System.
