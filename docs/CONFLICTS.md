# Conflicts — ADR vs. code drift ledger

*Live ledger, not a one-time report. Add an entry whenever an ADR's
stated design and the actual code in `src/` are found to disagree, and
you're not certain which one is correct (if you're certain, just fix the
wrong one directly — this file is for genuine "needs a human to decide"
drift, per `CLAUDE.md`'s "ADRs are living documents" policy). Remove an
entry once it's reconciled (either the ADR was edited to match the code,
or the code was fixed to match the ADR) — this file should only ever
list what's currently unresolved.*

Each entry: the ADR + line reference, the conflicting code location, what
each one says, and (once decided) the resolution.

*(No open conflicts as of 2026-07-23 — the docs-cleanup pass's own working
notes at `docs/_cleanup/conflicts.md` cover 8 ADR-vs-scope-doc conflicts
found during that pass, all resolved at the time and folded into
`docs/design/LIVING-FACTION-ENGINE.md`; that file is a historical record
of that one pass, not this ledger's predecessor. Nothing outstanding here
yet.)*

## Template for a new entry

```
## <short title>

- **ADR:** `docs/adr/NNNN-name.md`, line NN — quote or paraphrase what it says.
- **Code:** `src/path/to/file.js`, line NN — what it actually does.
- **Disagreement:** one sentence on the actual conflict.
- **Resolution:** (leave blank until decided) which one wins, and why —
  once filled in, apply the fix (edit the ADR, or fix the code) and
  remove this entry.
```
