# ADR 0007 — Git LFS for the Reference Library's PDFs (with a history rewrite)

## Status

Accepted

## Context

`assets/docs/` (the Reference Library's rulebook PDFs) accounted for
~445MB tracked directly as regular git blobs, and `.git/objects` alone was
~323MB as a result — the dominant cost in every clone, fetch, and (per
ADR 0006) Pages deploy artifact.

## Decision

- `.gitattributes` now tracks `*.pdf` (and the pre-existing `*.zip`) via
  Git LFS, going forward.
- Ran `git lfs migrate import --include="*.pdf" --everything` to convert
  the *existing* history too — this rewrites every commit's SHA (15
  commits affected) and required `git push --force`. Before doing so: a
  full `git clone --mirror` backup of the pre-rewrite remote state, and
  explicit user confirmation given the destructive/irreversible nature of
  a history rewrite + force-push.
- Verified via a completely fresh clone (not just local state) that
  `.git/objects` dropped to ~532KB, with the real PDF content now served
  through LFS's separate storage/transfer path, materialized correctly
  on checkout (`git lfs checkout`).
- **Caught and fixed a real regression from this change**: `actions/
  checkout@v4` doesn't fetch LFS content by default, so the Pages deploy
  workflow's "Assemble Pages site" step was copying unresolved LFS
  *pointer files* (~130 bytes of text) into the deployed site instead of
  the real PDFs — confirmed live on `assets/docs/*.pdf` returning pointer
  text, not a PDF, immediately after the first post-migration deploy.
  Fixed with `checkout@v4`'s `with: lfs: true`, and the post-deploy smoke
  check (ADR 0006) now also verifies a sample PDF starts with `%PDF`, not
  pointer text, so this exact regression class can't silently ship again.

## Consequences

- New clones/fetches of this repo no longer pay for 323MB of PDF history
  unless they actually need the file content (LFS fetches lazily).
- Anyone with an existing local clone from before this rewrite has a
  now-incompatible history and needs to re-clone (or hard-reset to the
  new `main` and accept losing any local-only commits) — acceptable here
  since this is a single-committer repository.
- The pre-rewrite mirror backup was discarded once the fresh-clone
  verification confirmed correctness; the previous commit SHAs remain
  visible in `git log`'s inherent record of this ADR if ever needed for
  forensic purposes, but there's no supported path back to the old
  (fat-blob) history through this repository itself.

## Related

`docs/adr/0006-pages-deploy-allowlist-and-actions-source.md` (the deploy
pipeline this interacts with) and `PROGRESS.md`'s 2026-07-04 entry.
