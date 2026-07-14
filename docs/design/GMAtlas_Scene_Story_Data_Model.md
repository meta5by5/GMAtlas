# GMAtlas — Scene & Story Data Model

**Subsystem:** Story Engine (Scene / Thread / Continuity tracking)
**Purpose:** Give the GM everything needed to run a scene cold, understand how it connects to the campaign, and never lose track of who/what/where/why/how across sessions.
**Format:** Data model spec — entities, fields, dropdowns, and derived views — for direct implementation.

---

## 1. Design Principle

Every scene is an atomic record with two layers:

1. **Scene Layer** — the who/what/where/why/how needed to run *this* scene at the table.
2. **Continuity Layer** — links from this scene outward to NPCs, factions, locations, threads, and other scenes, so the system can answer "what does this connect to?" and "what have I set up that I haven't paid off?"

Everything below is organized as: **Core Entities** (the lookup tables) → **Scene Record** (the atomic unit, broken into Who/What/Where/Why/How) → **Continuity Fields** (cross-scene links) → **Derived/Computed Views** (what the GM actually sees).

---

## 2. Core Entities (Lookup Tables)

These are campaign-level tables that scenes reference by ID rather than duplicating data.

### 2.1 NPC Roster
| Field | Type | Notes |
|---|---|---|
| npc_id | string | unique |
| name | string | |
| aliases | string[] | |
| faction_id | FK → Faction | nullable (unaffiliated) |
| role | dropdown | `Ally, Antagonist, Neutral, Patron, Rival, Contact, Wildcard` |
| status | dropdown | `Alive, Dead, Missing, Captured, Unknown` |
| disposition_to_party | dropdown (scale) | `Hostile, Wary, Neutral, Friendly, Devoted` |
| current_location_id | FK → Location | |
| motivation | text | GM-facing truth |
| public_face | text | what the party perceives |
| secret | text | hidden until revealed |
| secret_revealed | boolean | |
| voice_notes | text | mannerisms, speech pattern, quick-read for GM |
| relationship_web | array of {npc_id, relationship_type} | e.g. `rival_of, reports_to, loves, owes_debt_to` |
| last_seen_scene_id | FK → Scene | auto-updated |
| plot_significance | dropdown | `Background, Minor, Major, Linchpin` |

### 2.2 Faction Table
| Field | Type | Notes |
|---|---|---|
| faction_id | string | |
| name | string | |
| goal | text | |
| resources | text | |
| standing_with_party | dropdown (scale) | `War, Hostile, Cold, Neutral, Cordial, Allied` |
| standing_with_other_factions | array of {faction_id, relation} | `Ally, Rival, War, Vassal, Unknown` |
| heat_level | dropdown | `Dormant, Active, Alert, Mobilized` — tracks escalation |
| current_objective | text | what they're doing *right now*, updated per session |

### 2.3 Location Table
| Field | Type | Notes |
|---|---|---|
| location_id | string | |
| name | string | |
| region_id | FK → Region (optional parent) | |
| type | dropdown | `Settlement, Wilderness, Vessel/Ship, Facility, Dungeon/Site, Abstract (e.g. cyberspace)` |
| danger_level | dropdown | `Safe, Guarded, Risky, Hostile, Lethal` |
| description | text | GM prep notes |
| read_aloud_text | text | player-facing sensory description |
| connections | array of {location_id, travel_notes} | adjacency/travel graph |
| controlling_faction_id | FK → Faction | nullable |
| points_of_interest | array of {name, notes} | |

### 2.4 Plot Thread Table
| Field | Type | Notes |
|---|---|---|
| thread_id | string | |
| name | string | |
| type | dropdown | `Main Plot, Side Plot, Personal (PC), Faction, Mystery/Clue Chain, Ticking Clock` |
| status | dropdown | `Seeded, Active, Escalating, Climax, Resolved, Abandoned, Dormant` |
| owning_pc_id | FK → PC (optional) | for personal threads |
| related_scenes | array of Scene IDs | auto-populated from scene records |
| resolution_state | text | how it currently stands |
| payoff_planned | text | GM's intended resolution (private) |

### 2.5 Item / Clue / MacGuffin Table
| Field | Type | Notes |
|---|---|---|
| item_id | string | |
| name | string | |
| type | dropdown | `Physical Item, Clue/Info, Currency/Resource, Key/Access, Reputation Token` |
| significance | text | why it matters |
| current_holder | FK → NPC/PC/Location | |
| discovered | boolean | |
| discovered_in_scene_id | FK → Scene | |
| related_thread_id | FK → Thread | |

### 2.6 Clock / Countdown Table
| Field | Type | Notes |
|---|---|---|
| clock_id | string | |
| name | string | e.g. "Duke discovers the forgery" |
| segments_total | integer | e.g. 4, 6, 8 |
| segments_filled | integer | |
| trigger_conditions | text | what advances it |
| consequence_on_fill | text | what happens at zero |
| visible_to_players | boolean | GM-only clocks vs. shown clocks |

### 2.7 World State Flags
| Field | Type | Notes |
|---|---|---|
| flag_id | string | |
| description | string | e.g. "Duke aware party has the ledger" |
| value | boolean / enum | supports simple bool or multi-state (`Unknown, Suspected, Confirmed`) |
| set_in_scene_id | FK → Scene | |

---

## 3. Scene Record — Core Unit

### 3.1 Scene Meta
| Field | Type | Notes |
|---|---|---|
| scene_id | string | |
| title | string | GM-facing label |
| act / chapter | string/int | placement in campaign structure |
| sequence_order | integer | for linear default ordering |
| scene_type | dropdown | `Combat, Social/Negotiation, Exploration, Investigation, Downtime, Transition/Travel, Montage, Climax` |
| status | dropdown | `Planned, Ready, Active, Complete, Skipped, Cut` |
| estimated_duration | dropdown | `Quick (15m), Standard (30-60m), Extended (60m+)` |
| premise | text | one-line logline for the GM's own quick orientation |
| tone_tags | multi-select | `Tense, Comedic, Mysterious, Combat-heavy, Emotional, Exploratory` |

### 3.2 WHO
| Field | Type | Notes |
|---|---|---|
| npcs_present | array of FK → NPC | |
| pcs_expected | array of FK → PC | |
| factions_represented | array of FK → Faction | |
| active_relationship_tensions | array of {npc_id/pc_id pair, tension_note} | pulled/filterable from NPC relationship webs |
| npc_scene_goals | array of {npc_id, goal_this_scene} | what each NPC is trying to do *here*, distinct from their overall motivation |
| secrets_at_risk | array of FK → NPC.secret | secrets that could plausibly surface in this scene |

### 3.3 WHAT
| Field | Type | Notes |
|---|---|---|
| scene_objective | text | what needs to happen for the scene to "complete" |
| central_conflict | text | the obstacle/tension driving it |
| information_to_reveal | array of text or FK → Clue | what players can learn here |
| items_present | array of FK → Item | |
| anticipated_mechanics | array of dropdown | `Skill Check, Combat, Social Roll, Puzzle, Resource Spend, Custom Subsystem (e.g. BREACH run)` |
| possible_outcomes | array of {outcome_label, description, consequence_flags_set} | branch table — see 3.6 |
| difficulty/stakes_level | dropdown | `Low, Moderate, High, Critical` |

### 3.4 WHERE
| Field | Type | Notes |
|---|---|---|
| location_id | FK → Location | |
| sub-location/room | string | optional finer grain |
| environmental_conditions | text | weather, lighting, hazards specific to this instance |
| map_reference | string/URL | optional |

### 3.5 WHY
| Field | Type | Notes |
|---|---|---|
| related_thread_ids | array of FK → Thread | primary link to overall story |
| scene_purpose | text | why this scene exists in the campaign's arc |
| stakes_if_fail | text | |
| stakes_if_succeed | text | |
| player_facing_hook | text | the reason players *think* they're here |
| gm_only_truth | text | the real reason / hidden agenda, if different |

### 3.6 HOW
| Field | Type | Notes |
|---|---|---|
| entry_trigger | text | how/why this scene begins (player action, clock fill, scheduled event) |
| exit_conditions | array of {condition, leads_to_scene_id} | branch map — this is what turns scenes into a graph, not a list |
| pacing_notes | text | GM reminders on tempo |
| contingencies | text | "if players go off-script, do X" |
| rewards_on_success | text | XP, items, standing changes, clock advances |
| consequences_on_failure | text | |
| flags_set_on_exit | array of FK → World State Flag | |
| clocks_advanced_on_exit | array of {clock_id, segments} | |

---

## 4. Continuity Fields (Cross-Scene Layer)

These are what let the GM (and the tool) answer "what does this connect to" without re-reading the whole campaign.

| Field | Type | Notes |
|---|---|---|
| prerequisite_scenes | array of Scene ID | must occur before this is available |
| unlocked_by | {scene_id, exit_condition} | which branch leads here |
| follow_on_scenes | array of Scene ID | what this can unlock |
| parallel/alternate_scenes | array of Scene ID | mutually exclusive branches at same story beat |
| foreshadowing_planted | array of {text, intended_payoff_scene_id or thread_id} | |
| foreshadowing_payoffs_due | array of {source_scene_id, text} | auto-surfaced when prepping a scene, so nothing planted gets dropped |
| callbacks | array of Scene ID | past scenes this one references or echoes |
| session_played_in | FK → Session log | for actual-play history, distinct from planned structure |

---

## 5. Campaign-Level Overlay

Above individual scenes, the system needs a story-shape layer:

| Field | Type | Notes |
|---|---|---|
| campaign_id | string | |
| act_structure | array of {act_name, thematic_summary, key_scenes} | |
| party_goals_tracker | array of {pc_id, goal, status} | |
| faction_standing_snapshot | derived from Faction table | current relationship state, queryable at any point in time |
| session_recap_log | array of {session_number, date, scenes_played, summary} | auto-buildable from completed scenes |
| unresolved_threads_dashboard | derived view | pulls all Thread records where status ≠ Resolved/Abandoned |
| open_clocks_dashboard | derived view | all clocks not at 0 or full |

---

## 6. Derived / Computed Views (What the GM Actually Sees)

The raw data model above is for storage. The GM-facing product needs these generated views:

1. **Session Prep Sheet** — for each upcoming scene: Who/What/Where/Why/How condensed to one screen, plus any due foreshadowing payoffs and relevant NPC quick-cards.
2. **Live-Run Card** — ultra-condensed: premise, NPCs present (with disposition + goal), read-aloud text, exit branches. Meant to be glanced at mid-session.
3. **NPC Quick-Reference Card** — pulled from roster: name, voice notes, disposition, current goal, secret (GM-only toggle).
4. **Thread Status Dashboard** — all active threads, their last-touched scene, and time-since-touched (flags threads going stale).
5. **Story-So-Far Recap Generator** — auto-summarizes completed scenes per thread, usable as a "previously on..." readout for players.
6. **Continuity Graph View** — visual node graph of scenes connected by prerequisite/follow-on/parallel links, so the GM can see the campaign's actual shape, not just a linear list.
7. **World State Flag Ledger** — current value of every flag, filterable by "does the party know this is true."

---

## 7. Dropdown/Enum Summary (for schema implementation)

| Enum | Values |
|---|---|
| scene_type | Combat, Social/Negotiation, Exploration, Investigation, Downtime, Transition/Travel, Montage, Climax |
| scene_status | Planned, Ready, Active, Complete, Skipped, Cut |
| npc_role | Ally, Antagonist, Neutral, Patron, Rival, Contact, Wildcard |
| npc_status | Alive, Dead, Missing, Captured, Unknown |
| disposition_scale | Hostile, Wary, Neutral, Friendly, Devoted |
| faction_standing | War, Hostile, Cold, Neutral, Cordial, Allied |
| faction_heat | Dormant, Active, Alert, Mobilized |
| location_type | Settlement, Wilderness, Vessel/Ship, Facility, Dungeon/Site, Abstract |
| danger_level | Safe, Guarded, Risky, Hostile, Lethal |
| thread_type | Main Plot, Side Plot, Personal, Faction, Mystery/Clue Chain, Ticking Clock |
| thread_status | Seeded, Active, Escalating, Climax, Resolved, Abandoned, Dormant |
| item_type | Physical Item, Clue/Info, Currency/Resource, Key/Access, Reputation Token |
| stakes_level | Low, Moderate, High, Critical |
| tone_tags (multi) | Tense, Comedic, Mysterious, Combat-heavy, Emotional, Exploratory |

---

## 8. Implementation Notes

- **Scenes are graph nodes, not list items.** `exit_conditions`, `follow_on_scenes`, and `parallel/alternate_scenes` are what make this a branching structure instead of a linear script — build the data layer with that in mind even if the v1 UI shows a linear list.
- **Foreshadowing payoff tracking is the highest-value "consistency" feature** — it's the field GMs most often lose track of manually. Surfacing `foreshadowing_payoffs_due` in the session prep view is worth prioritizing early.
- **NPC/Faction/Location tables should be shared lookups across subsystems** — the same roster should serve this Story Engine and BREACH (e.g. an NPC who's a hacker target) and the colony/campaign framework (e.g. a faction contact for trade), so IDs need to be globally stable, not scoped per-subsystem.
- **GM-only vs. player-facing fields need a hard schema-level split** (e.g. `gm_only_truth` vs `player_facing_hook`, `secret` vs `public_face`) so a future "player recap" view can be generated safely without a filtering pass.
