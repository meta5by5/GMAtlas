> Rejected-alternatives companion to `docs/adr/0010-traveller-swn-content.md`
> — split out 2026-07-23 per `docs/adr/0042-design-doc-consolidation.md`'s
> ADR-cleanup extension, so the live ADR reads as pure accepted
> architecture. This file is never itself a decision record; it holds the
> "what was considered and rejected, and why" detail for the ADR above,
> preserved verbatim rather than deleted.

# ADR 0010 — Rejected alternatives

## From "Alternatives Considered"

- **Leave ADR 0002's rejection standing and decline the request, or silently override it without comment.** Rejected — the user gave a direct, current instruction; declining would be unresponsive, and silently overriding without a record would leave ADR 0002 and this repo's actual code permanently disagreeing about why Traveller does or doesn't have a character template, which is exactly the kind of drift `CLAUDE.md` asks to be corrected explicitly, not left to be rediscovered.
- **Build out Traveller/SWN as full genre packs** (a `tables-traveller.js`/`tables-swn.js` the way Cyberpunk/Fantasy got in Phase 9). Rejected as scope well beyond "content" — Traveller and SWN are both already sci-fi settings overlapping heavily with Hostile's own default flavor, unlike Cyberpunk/Fantasy's genuinely distinct genres; a full parallel table set would duplicate Hostile's own content rather than adding something distinct. The targeted additions above (one character ruleset, one small oracle group) serve the *specific* gameplay areas each system is actually named for.
- **Replicate Traveller's literal 2-12 UPP scores plus a separately-tracked derived DM.** Rejected — adds a second attribute-representation concept this app's field model doesn't have anywhere else, for marginal authenticity gain; the existing small-modifier abstraction is simpler and consistent with every other ruleset here.
