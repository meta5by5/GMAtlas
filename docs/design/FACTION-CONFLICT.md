# FACTION CONFLICT — GMAtlas Subsystem Spec

**Module name:** `faction-conflict`
**Depends on:** Faction/NPC data model (assumes GMAtlas already has faction and NPC entities; this module extends them, doesn't replace them)
**Purpose:** Generate and track inter-faction conflicts with enough historical depth, asymmetry, and forward motion that they read as ongoing situations rather than static flavor text — and that stay reactive to party action across sessions.

---

## 1. Design Principles

1. **Two causes, not one.** Every conflict has a *stated cause* (what factions say publicly) and a *root cause* (what's actually driving it). They should not match.
2. **Asymmetric factions.** Never generate mirror-image sides. Each faction gets independently rolled/authored attributes — cohesion, doctrine, dependency, position — so power is rarely balanced.
3. **A clock, not a state.** Conflicts carry a timeline object that advances on its own regardless of party input. The party is managing momentum, not choosing a frozen tableau.
4. **Someone gets hurt regardless.** Every conflict must resolve at least one third-party stakeholder who suffers no matter which faction "wins" — this is the primary party hook.
5. **Something is already broken.** At least one irreversible fact predates party involvement (a death, a destroyed asset, a broken oath) so players are never just picking a winner from a clean slate.
6. **Leverage over alignment.** The party should have access to at least one lever (information, asset, or relationship) neither faction controls, rather than simply being asked "which side are you on?"

---

## 2. Data Schema

```json
{
  "conflict_id": "string (uuid)",
  "name": "string",
  "status": "cold | simmering | active | open_war | resolved",
  "escalation_ladder": {
    "current_rung": "integer (0-5)",
    "rungs": [
      { "level": 0, "label": "string", "description": "string" }
    ],
    "next_trigger": "string (what pushes it to the next rung)"
  },
  "stated_cause": "string",
  "root_cause": "string",
  "cause_gap_hook": "string (why the gap between stated/root cause matters to the party)",
  "history": {
    "deep_root": {
      "summary": "string",
      "years_ago": "integer",
      "living_witnesses": ["npc_id"]
    },
    "precipitating_incident": {
      "summary": "string",
      "date": "string",
      "trivial_relative_to_deep_root": "boolean"
    },
    "last_deescalation_attempt": {
      "who": "npc_id | faction_id",
      "why_it_failed": "string",
      "who_got_blamed": "npc_id | faction_id"
    },
    "irreversible_facts": [
      { "summary": "string", "consequence": "string" }
    ]
  },
  "factions": [
    {
      "faction_id": "string",
      "public_position": "string",
      "private_goal": "string",
      "doctrine_red_lines": ["string"],
      "cohesion": "integer (0-5, 0=fractured, 5=monolithic)",
      "internal_factions": [
        { "label": "string (e.g. 'hawks', 'doves', 'profiteers')", "stance": "string", "key_npc": "npc_id" }
      ],
      "dependency": {
        "depends_on": "faction_id | third_party_id | resource",
        "nature": "string",
        "constraint_this_creates": "string"
      },
      "assets_at_risk": ["string"],
      "escalation_appetite": "integer (0-5, willingness to push the ladder up)"
    }
  ],
  "power_symmetry": "even | faction_a_dominant | faction_b_dominant | proxy_stalemate",
  "information_asymmetry": {
    "holder": "faction_id",
    "what_they_know": "string",
    "impact_if_revealed": "string"
  },
  "clock": {
    "event": "string",
    "trigger_date_or_condition": "string",
    "effect_on_ladder": "string"
  },
  "third_party_casualty": {
    "who": "npc_id | faction_id | settlement_id",
    "how_hurt_regardless_of_outcome": "string"
  },
  "party_leverage": {
    "unique_information": "string",
    "contested_asset": "string (wanted by both, held by neither)",
    "trusting_npc": "npc_id"
  },
  "session_hooks": ["string"],
  "gm_notes": "string"
}
```

---

## 3. Generation Procedure (Oracle Tables)

Use when the GM wants a fast procedurally-seeded conflict rather than hand-authoring one. Roll or pick; override anything.

### 3.1 Root Cause Category (d8)
| d8 | Category | Example |
|---|---|---|
| 1 | Territory/route | Control of a jump point, trade lane, or border zone |
| 2 | Resource node | Water rights, ore vein, fuel depot, arable land |
| 3 | Succession/legitimacy | Two claimants, disputed charter, contested inheritance |
| 4 | Doctrine/schism | Religious or ideological split within a formerly unified body |
| 5 | Historical atrocity | An unresolved betrayal, massacre, or broken treaty |
| 6 | Proxy/third-party benefit | A patron benefits from both sides staying weak |
| 7 | Economic squeeze | Debt, tariff, monopoly, currency manipulation |
| 8 | Information/secret | One side knows something that would destroy the other's legitimacy |

### 3.2 Stated vs. Root Cause Gap (d6)
| d6 | Gap type |
|---|---|
| 1 | Stated cause is real but incomplete — root cause is a deeper, older version of the same issue |
| 2 | Stated cause is a deliberate lie by faction leadership to rally their base |
| 3 | Stated cause was true once but has been overtaken by root cause (nobody's updated the messaging) |
| 4 | Stated cause is true for one faction, root cause is true for the other — they're fighting for different reasons |
| 5 | A third party manufactured the stated cause to obscure the root cause |
| 6 | Stated cause and root cause are swapped in public perception due to propaganda |

### 3.3 Escalation Ladder Rungs (default 6-rung template)
| Rung | Label | Description |
|---|---|---|
| 0 | Cold | Formal peace/neutrality; grievances unaddressed |
| 1 | Simmering | Economic pressure, sanctions, propaganda |
| 2 | Skirmish | Deniable proxy actions, sabotage, raids |
| 3 | Active | Open hostilities in contested zones only |
| 4 | Escalated | Direct engagement, casualties reported publicly |
| 5 | Open War | Full mobilization, no more deniability |

### 3.4 Faction Cohesion (d6, roll per faction independently)
| d6 | Cohesion | Implication |
|---|---|---|
| 1 | 0 — Fractured | Faction may fragment mid-conflict; multiple factions claim to speak for it |
| 2-3 | 1-2 — Contested | Clear hawk/dove split; party can peel off a sub-faction |
| 4-5 | 3-4 — Stable | Leadership manages dissent but it exists |
| 6 | 5 — Monolithic | Unified; internal conflict must be manufactured by party or external event |

### 3.5 Dependency Type (d6, roll per faction)
| d6 | Depends on... |
|---|---|
| 1 | The opposing faction, for a resource/trade good they can't source elsewhere |
| 2 | A third-party patron who could withdraw support |
| 3 | Public opinion/legitimacy that direct aggression would damage |
| 4 | A logistics chokepoint they don't fully control |
| 5 | Internal factions who'd defect if pushed too far |
| 6 | No major dependency — this faction is genuinely freer to act (use sparingly, max one per conflict) |

### 3.6 Third-Party Casualty (d6)
| d6 | Who suffers regardless |
|---|---|
| 1 | A neutral settlement caught in the contested zone |
| 2 | A trade/supply line neither faction intends to protect |
| 3 | A minority population within one faction's territory |
| 4 | An allied faction whose treaty obligates them to a side they don't want |
| 5 | The environment/resource itself (the thing being fought over degrades either way) |
| 6 | A specific named NPC with ties to the party |

### 3.7 Clock Type (d6)
| d6 | Clock |
|---|---|
| 1 | Seasonal/harvest cycle |
| 2 | Arrival of a ship, envoy, or reinforcement |
| 3 | Election, succession vote, or leadership term ending |
| 4 | Ritual/anniversary date with symbolic weight |
| 5 | Resource depletion countdown |
| 6 | External threat (third faction, environmental, monster/raider) arriving regardless of outcome |

---

## 4. Worked Example

```json
{
  "conflict_id": "conf-0001",
  "name": "The Kessler Strait Dispute",
  "status": "simmering",
  "escalation_ladder": {
    "current_rung": 1,
    "rungs": [
      { "level": 0, "label": "Cold", "description": "Formal non-aggression pact technically in force" },
      { "level": 1, "label": "Simmering", "description": "Tariff war and propaganda broadcasts" },
      { "level": 2, "label": "Skirmish", "description": "Deniable privateer raids on strait shipping" },
      { "level": 3, "label": "Active", "description": "Open engagement limited to the strait itself" },
      { "level": 4, "label": "Escalated", "description": "Strikes on home territory begin" },
      { "level": 5, "label": "Open War", "description": "Full mobilization" }
    ],
    "next_trigger": "A privateer raid kills strait pilots instead of just seizing cargo"
  },
  "stated_cause": "Toll rights over the Kessler Strait jump corridor",
  "root_cause": "House Vantry's shipbuilding subsidy program depends on strait toll revenue to service debt owed to a bank both factions' leadership quietly answer to",
  "cause_gap_hook": "If the party surfaces the debt records, both public-facing 'toll dispute' narratives collapse and the bank becomes the actual target",
  "history": {
    "deep_root": {
      "summary": "Forty years ago, House Vantry ceded strait access rights to the Corvine Compact in a treaty signed under duress after a naval defeat",
      "years_ago": 40,
      "living_witnesses": ["npc-elder-vantry"]
    },
    "precipitating_incident": {
      "summary": "A Compact customs officer impounded a Vantry merchant vessel over a paperwork technicality",
      "date": "3 months ago",
      "trivial_relative_to_deep_root": true
    },
    "last_deescalation_attempt": {
      "who": "npc-envoy-tessik",
      "why_it_failed": "Proposed revenue-sharing plan would have exposed the debt-servicing arrangement, so Vantry's finance minister quietly sabotaged it",
      "who_got_blamed": "npc-envoy-tessik"
    },
    "irreversible_facts": [
      { "summary": "The impounded vessel's crew was never released and one died in custody", "consequence": "Vantry hawks now have a martyr; any Compact-friendly resolution looks like a betrayal" }
    ]
  },
  "factions": [
    {
      "faction_id": "house-vantry",
      "public_position": "The strait was ours and the treaty was signed at gunpoint",
      "private_goal": "Protect the shipbuilding subsidy pipeline regardless of who technically controls the strait",
      "doctrine_red_lines": ["Will not strike Compact civilian settlements directly"],
      "cohesion": 2,
      "internal_factions": [
        { "label": "hawks", "stance": "Full reclamation of the strait", "key_npc": "npc-admiral-korr" },
        { "label": "financiers", "stance": "Quiet resolution that preserves the subsidy flow", "key_npc": "npc-minister-halevy" }
      ],
      "dependency": {
        "depends_on": "third_party_id: bank-solenne",
        "nature": "Debt servicing tied to toll revenue",
        "constraint_this_creates": "Cannot afford a resolution that removes toll income even if it wins the strait outright"
      },
      "assets_at_risk": ["3 privateer squadrons", "shipbuilding subsidy standing"],
      "escalation_appetite": 3
    },
    {
      "faction_id": "corvine-compact",
      "public_position": "The treaty is forty years settled law and Vantry is manufacturing a crisis",
      "private_goal": "Avoid war they can't afford while not looking weak to their own merchant guilds",
      "doctrine_red_lines": ["Will not be first to fire on a Vantry naval vessel"],
      "cohesion": 4,
      "internal_factions": [
        { "label": "merchant guilds", "stance": "Demand protection or compensation for strait losses", "key_npc": "npc-guildmaster-oyeka" }
      ],
      "dependency": {
        "depends_on": "resource: strait toll income funds their own fleet maintenance",
        "nature": "Direct budget dependency",
        "constraint_this_creates": "Cannot simply abandon toll collection to de-escalate"
      },
      "assets_at_risk": ["strait customs authority", "merchant guild confidence"],
      "escalation_appetite": 1
    }
  ],
  "power_symmetry": "faction_b_dominant",
  "information_asymmetry": {
    "holder": "corvine-compact",
    "what_they_know": "Bank Solenne's ledgers linking Vantry's subsidy to strait tolls",
    "impact_if_revealed": "Would let the Compact publicly reframe the conflict as Vantry profiteering, but using it burns their only quiet leverage over the bank"
  },
  "clock": {
    "event": "Bank Solenne's quarterly debt review",
    "trigger_date_or_condition": "6 weeks from session start",
    "effect_on_ladder": "If Vantry's subsidy shortfall isn't resolved, hawks gain enough backing to force a vote authorizing rung-2 privateer action"
  },
  "third_party_casualty": {
    "who": "npc-id: independent strait pilots guild",
    "how_hurt_regardless_of_outcome": "Lose livelihood under Vantry reclamation (nationalized) or under continued Compact control (guild dues rising to cover fleet costs)"
  },
  "party_leverage": {
    "unique_information": "The party can obtain the Bank Solenne ledgers before either faction weaponizes them",
    "contested_asset": "The impounded vessel's cargo manifest, which proves what was actually being shipped",
    "trusting_npc": "npc-elder-vantry, who trusts outsiders more than his own house's financiers"
  },
  "session_hooks": [
    "Party is hired by the pilots guild to broker neutral passage before the debt review deadline",
    "Party finds the Bank Solenne ledgers during an unrelated job and must decide who, if anyone, to show them",
    "Admiral Korr tries to recruit the party for a deniable strike, testing whether they'll cross the doctrine red line for him"
  ],
  "gm_notes": "Keep Minister Halevy sympathetic — she's the closest thing to a rational actor and a good pressure-release valve if the party wants a diplomatic path instead of picking a side."
}
```

---

## 5. Session-to-Session Update Rules

- **After any session touching this conflict:** re-evaluate `escalation_ladder.current_rung` based on party action and the clock — don't let it sit static.
- **If party reveals `information_asymmetry`:** resolve `impact_if_revealed`, then clear or replace the asymmetry — it shouldn't persist as a mechanic once spent.
- **If `clock.trigger_date_or_condition` passes unaddressed:** apply `effect_on_ladder` automatically, even off-screen.
- **Cohesion drift:** if the party actively supports one `internal_factions` entry over another, decrement the parent faction's `cohesion` by 1 (max once per arc) to reflect the internal split widening.
- **Irreversible facts only grow:** party actions that can't be undone (a death, a destroyed asset, a broken oath they made) get appended to `history.irreversible_facts`, never removed.

---

## 6. Implementation Notes for Claude Code

- Store conflicts as individual JSON records keyed by `conflict_id`; reference `faction_id`/`npc_id` by pointer into existing faction/NPC tables rather than duplicating data.
- Escalation ladder should be a first-class UI element (a visual rung tracker) — this is the single most GM-useful piece of state to glance at mid-session.
- Oracle tables (Section 3) should be exposed as a "Generate Conflict" wizard: roll categories, let GM accept/reroll/override each field, then auto-populate the schema.
- `session_hooks` should support a "mark used" flag so the GM can see which hooks have already been delivered to the party vs. which are still fresh.
- Consider a lightweight relationship graph view linking `conflict_id` → `faction_id` → `npc_id` so the GM can see conflict web overlap at a glance across multiple concurrent conflicts (useful for your colony/solo-campaign framework where several factions may be entangled simultaneously).
