> Rejected-alternatives companion to `docs/adr/0006-pages-deploy-allowlist-
> and-actions-source.md` — split out 2026-07-23 per `docs/adr/0042-design-
> doc-consolidation.md`'s ADR-cleanup extension, so the live ADR reads as
> pure accepted architecture. This file is never itself a decision record;
> it holds the "what was considered and rejected, and why" detail for the
> ADR above, preserved verbatim rather than deleted.

# ADR 0006 — Rejected alternatives

## From "Alternatives Considered"

- **Un-gitignore `dist/`** so it's a normal tracked file the branch-based
  Pages source could serve directly, avoiding a build step in CI
  entirely. Rejected: `CLAUDE.md` is explicit that `dist/` is a build
  artifact, never committed (`git status` showing no changes there after
  a rebuild is the expected, documented state) — inverting that for
  deploy convenience would mean two different mental models depending on
  which context you're building the site for.
- **Investigate exactly why `.gitignore`'d-but-freshly-generated paths get
  excluded from the artifact upload**, rather than routing around it.
  Deferred: once the Pages source turned out to be branch-based all along,
  that specific question stopped mattering for *this* bug (the artifact
  was never being consulted at all) — the allowlist approach is a strict
  improvement regardless (fixes bug 1 too) and isn't worth further
  investigation purely to satisfy curiosity about a GitHub Actions
  implementation detail.
