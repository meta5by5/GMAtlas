# ADR 0006 — GitHub Pages: allowlist staging directory + "GitHub Actions" as the Pages source

## Status

Accepted

## Context

The GitHub Pages deployment (`.github/workflows/deploy-pages.yml`) was
reported as a black screen on first load, then — after a fix attempt — as
the page getting "stuck in a loop" and refusing to even refresh on mobile.
Three independent, compounding bugs were found via direct `curl` checks
against the live site and the GitHub Actions/Artifacts API (2026-07-04),
none of which were visible from the workflow's own "success" status:

1. **The whole repository was public.** The workflow uploaded `path: .` —
   the entire checked-out working tree — as the Pages artifact.
   `README.md`, `package.json`, and even `tests/domain.test.js` all served
   `200` from the live URL. Not the cause of the black screen, but a real
   over-exposure worth fixing at the same time (a grep across the tracked
   repo turned up no actual secrets/credentials — see the audit that
   accompanied this fix — but internal design docs and test files have no
   business being publicly served either).
2. **`dist/app.bundle.js` never reached the deployed site.** It's listed
   in `.gitignore` (correctly, for local dev), and even though the
   workflow's "Build bundle" step regenerates it fresh on disk before the
   upload step runs, the Pages artifact upload silently excluded it — every
   *non*-gitignored file served fine, this one alone 404'd, immediately
   after a successful build step. Since `index.html`'s
   `<script src="./dist/app.bundle.js">` then 404'd, the app never booted
   (black screen) — and `sw.js`'s own install-time precache list
   (`SHELL`, which also names `./dist/app.bundle.js`) failed for the exact
   same reason. `Cache.addAll()` rejects the whole `install` event if *any*
   listed resource isn't fetchable, so the service worker's install could
   never succeed — which is what produced the "stuck in a loop, won't even
   refresh" symptom: the browser kept retrying an install that was
   structurally incapable of completing.
3. **The above two fixes still didn't change anything live** — confirmed
   by adding an unambiguous, never-before-existing canary file
   (commit-sha-and-run-id-stamped) to the assembled output and finding it
   404'd even several minutes after a "successful" deploy. Root cause:
   the repository's **Settings → Pages → Source was "Deploy from a
   branch"**, not "GitHub Actions" — meaning GitHub was serving the raw
   `main` branch tree directly the entire time, with this workflow's
   artifact never actually wired up to anything. This retroactively
   explains bug 1 too: the "leaked" files were simply files committed to
   `main`, served as-is by the branch-based Pages mechanism, unrelated to
   the workflow's own (irrelevant, at the time) artifact upload.

## Decision

- The workflow now assembles a dedicated `_site/` staging directory
  containing only what `index.html`/`manifest.webmanifest`/`sw.js`
  actually reference (`manifest.webmanifest`, `styles/`, `assets/`, the
  built bundle) instead of `path: .`. The bundle is flattened to
  `_site/app.bundle.js` — not `_site/dist/app.bundle.js` — specifically to
  rule out any exclusion rule matching a `dist` path segment anywhere,
  given bug 2 above was never fully explained before the Pages-source
  issue was found; `index.html` and `sw.js` are copied through `sed` to
  reference the flattened path in the deployed copies only (the local
  `dist/`-relative convention is untouched for `file://`/Live Server dev).
- The repository's Pages source is now **"GitHub Actions"**, set directly
  in Settings (not something a workflow file can control) — this is the
  fix that actually mattered; the workflow content-side fixes are correct
  and worth keeping, but were inert without this.
- A `.nojekyll` marker is added to the staged output as a low-cost
  safety net against any future Jekyll-processing surprises, even though
  Actions-based Pages deploys don't run Jekyll by default.

## Alternatives Considered

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

## Consequences

- The live site now serves only the intended static app files — verified
  end to end with `curl`: `app.bundle.js`/`manifest.webmanifest`/`sw.js`/
  `styles/`/`assets/*` (including `assets/docs/*.pdf`, the Reference
  Library) all `200`; `README.md`/`package.json`/`tests/`/`src/`/
  `scripts/`/`dist/app.bundle.js` (the old unflattened path) all `404`.
- Any future "my change isn't showing up on the deployed site" report
  should check the Pages source setting *before* re-debugging the
  workflow's own logic — this is called out directly in the workflow
  file's header comment so it isn't rediscovered from scratch.
- `assets/` (the Reference Library's PDFs, ~445MB tracked in git) is
  still deployed in full, by design — the allowlist explicitly keeps it,
  since the in-app PDF viewer depends on `assets/docs/*` being servable.
  This isn't a regression from before; the repository was always this
  size, and Pages' effective content limits (site content is more tightly
  bounded than the flexible 10GB artifact-storage ceiling GitHub allows
  for build artifacts) are worth keeping in mind if the Reference Library
  grows substantially further.

## Related Packs

Article VIII of the Constitution ("campaign data is sacred", `docs/adr/
0001`) is about the app's own data, but the same "don't let something
silently not work" spirit applies here — a "successful" deploy that
serves nothing new is exactly the kind of silent failure Article VIII
exists to rule out for user data, extended here to the deploy pipeline
itself.
