# server/ — GMAtlas accounts, sync and licensing service

Lives on the **`server`** branch only, until a roadmap phase is complete and
merged into `main`. The design is `design/ACCOUNTS-SYNC-ROADMAP.md`. Read
it, and `CLAUDE.md`'s "Branches" section, before working here.

Status: empty scaffold. Phase S0 (no server needed) lands on `main`, so the
first code here is Phase S1. The hosting platform (decision D1) is still
open.

Ground rules:
- This folder has its own `package.json` once code arrives. Dev
  dependencies are fine here, but the shipped browser app stays
  zero-dependency.
- Merge rules, sync protocol and license resolution are **not** written
  here. They are the pure modules in `src/domain/` (`syncOps.js`,
  `licensing.js`, `visibility.js`), imported by both the browser bundle and
  this server, so the two can't drift.
- No document bytes are ever stored or relayed through here (roadmap G6,
  Constitution rule 6 once amended). Only metadata, encrypted ops and
  signalling.
- Keeping current with core: `git merge main` regularly. Core fixes are made
  on `main`, never on this branch alone.
- CI (`.github/workflows/test.yml`) runs the core tests on every push here.
  It also runs `npm test` in this folder once a `package.json` exists.
