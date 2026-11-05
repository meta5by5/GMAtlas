// tables-fantasy-full.js — direct follow-up request: "make a fantasy
// equivalent duplicate of all oracles that is tied to the fantasy genres
// while the current one is tied to scifi genres." A full, independent
// fantasy-flavored counterpart to tables.js's own SCENE_TABLES — every
// category tables.js has, reflavored for a fantasy setting (a sci-fi-only
// category like "Starships" or "Androids & AI" gets a genuinely fantasy
// name and content — Vessels & Caravans, Golems & Constructs — rather than
// being skipped), at the same structural depth. Original content in this
// project's own voice, not a transcription of any sourcebook.
//
// Registered as its own genre pack (data/genrePacks.js, id: 'fantasy-full')
// — separate from the existing smaller 'fantasy' pack (tables-fantasy.js,
// the Five Leagues from the Borderlands umbrella) and 'dnd5e' pack, so
// picking this one, or customizing it via oracles.overrides, never touches
// either of those.

export const FANTASY_FULL_TABLES = {
  "Campaign": {
    "Backstory Prompt": [
      "A simple escort contract concealed a claim to disputed land.",
      "A rescue mission revealed a village that should not exist.",
      "A tax assessor's tally exposed sabotage along a frontier trade road.",
      "A survey of old boundary stones found evidence of an earlier, erased settlement.",
      "A border dispute became personal when someone vanished.",
      "A trusted patron funded the expedition with stolen coin.",
      "An old war crime resurfaced in a remote market town.",
      "A town's prosperity depends on an illegal secret.",
      "A frontier reeve inherits a case nobody wants reopened.",
      "A trade road collapsed after caravans began returning empty."
    ],
    "Inciting Incident": [
      "A messenger arrives from a village officially abandoned.",
      "A local lord asks for help but refuses to give full access to the keep.",
      "A sealed wagon is opened and the manifest is impossible.",
      "A laborers' riot blocks the only safe road out of town.",
      "A rival guild's band reaches the site minutes before the party.",
      "A well begins failing in a way that looks intentional.",
      "A fugitive offers proof of a hidden noble scheme.",
      "A scout returns with spoor no hunter can name.",
      "A debt marker is called in at the worst possible time.",
      "A quarantine order is issued after the party is already inside the walls."
    ],
    "Campaign Tone": [
      "Hard frontier survival with moral compromise.",
      "Frontier lawkeeping under a lord's pressure.",
      "Exploration, treasure-hunting, and slow-burn horror.",
      "A traveling band caught between rival factions.",
      "Border mystery with martial consequences.",
      "Common folk against a distant, uncaring nobility.",
      "Scholarly discovery with escalating magical containment failure.",
      "Sparse western frontier at the edge of a hostile wild.",
      "Dirty politics, supply lines, and personal loyalties.",
      "Mining-camp drama against ancient unknowns."
    ],
    "Realm Trouble": [
      "Toll disputes make every road crossing political.",
      "A great house is quietly buying up failed holdings.",
      "Border militias are forming around disputed claims.",
      "Bandits have begun using stolen noble seals.",
      "A plague is being hidden to protect a harvest's reputation.",
      "A new road bypasses an old seat of power.",
      "Old maps are unreliable near a strange standing stone.",
      "A guild uprising has spread across multiple towns.",
      "Failed irrigation works are forcing evacuations.",
      "Independent traders are squeezed by bonded contracts."
    ]
  },
  "Core Oracles": {
    "Action": [
      "Defend", "Betray", "Seek", "Bargain", "Steal", "Rescue", "Curse", "Bless",
      "Exile", "Reclaim", "Ambush", "Escort", "Uncover", "Bind", "Sacrifice", "Restore",
      "Corrupt", "Pledge", "Trespass", "Warn"
    ],
    "Theme": [
      "Oaths", "Inheritance", "Old debts", "Forbidden magic", "Loyalty", "Famine",
      "Corruption", "Exile", "Prophecy", "Faith", "Vengeance", "Sanctuary",
      "Ambition", "Ruin", "Kinship", "Trespass", "Sacrifice", "Legacy", "Wildness", "Decay"
    ],
    "Descriptor": [
      "weathered", "hallowed", "overcrowded", "abandoned", "sealed", "torchlit", "makeshift",
      "opulent", "claustrophobic", "exposed", "antiquated", "fortified", "cursed", "remote",
      "ceremonial", "half-built", "frost-bitten", "humid", "dust-choked", "watched"
    ],
    "Focus": [
      "gate", "shrine", "laborer", "contract", "wagon", "beacon fire", "map", "weapon",
      "strange beast", "ledger", "infirmary", "hearth", "harbor", "keep hall", "mine shaft",
      "ruin", "watchtower", "guard patrol", "signal horn", "lifeboat"
    ]
  },
  "Road Encounters": {
    "Road Sighting": [
      "a riderless wagon standing without its team",
      "a patrol of soldiers holding position near a dark treeline",
      "a scattered supply train with fresh burn marks",
      "a toll cart flying an outdated merchant seal",
      "a warning cairn steering travelers away from the open road",
      "a rider driving hard with no house colors",
      "a way-station lamp shuttering in short, panicked bursts",
      "a cluster of scouts moving in careful formation",
      "an abandoned litter with its curtain drawn from outside",
      "a frozen ford scarred by heavy wheel ruts"
    ],
    "Travel Peril": [
      "rockslide crossing the only path",
      "false banner leading into an ambush hollow",
      "runoff flooding from a burst upstream dam",
      "wayfinding confusion caused by an old curse on the land",
      "noble interdiction order with unclear authority",
      "scattered wreckage masking a live trap",
      "climbing brigand attached to the wagon side",
      "provisions consumed faster than expected",
      "storm surge from a sudden squall",
      "quarantine bell that rings after approach"
    ],
    "Travel Opportunity": [
      "salvage rights to an unclaimed wagon",
      "a stranded traveler with valuable local knowledge",
      "an old scout's cache with partial route notes",
      "a hidden ford known only to locals",
      "a wreck containing spare parts for a damaged wagon",
      "a merchant caravan willing to pay for escort",
      "a hidden courier revealing faction movement",
      "a strange formation worth a patron's bonus",
      "a toll loophole before the gate updates its rate",
      "a rescue claim that can build reputation"
    ],
    "Caravan Mission": [
      "emergency rescue", "cargo transfer", "region survey", "patrol intercept",
      "carrying the wounded to a healer", "quiet smuggling run", "noble courier route", "wreck salvage",
      "settlement resupply", "search and rescue"
    ]
  },
  // Direct follow-up request, after the fields these back went live: "The
  // random oracle options for the new location fields are loading scifi
  // options... make a complete set of fantasy oracle options... revise
  // the oracle options to fantasy equivalents." Realm Type/Wilderness
  // Peril (Realms) and Settlement Type/First Look/Authority/Settlement
  // Trouble/Settlement Project (Settlements) were, on inspection, thin
  // sci-fi reskins left over from an earlier session that built this
  // pack's full content by adapting the sci-fi SCENE_TABLES wholesale
  // ("irrigation works malfunction," "heat bloom visible to predators,"
  // "noble slogans painted over older warnings" read industrial/
  // frontier-sci-fi, not fantasy) — rewritten here as genuinely fantasy
  // content, independent of their sci-fi SCENE_TABLES counterparts (which
  // are untouched — this file's own job is fantasy, not reconciling the
  // two). Realm Traits/Wilderness Opportunity aren't used by any Location
  // field (domain/entities.js's LOCATION_FANTASY_FIELD_ORACLE_PATH) and
  // are left as they were, out of this revision's scope.
  "Realms": {
    "Realm Type": [
      "barren highland march", "thin-soil mining hold", "cold moorland fiefdom", "humid jungle frontier",
      "island archipelago realm", "blighted borderland", "ice-locked northern reach", "volcanic furnace vale",
      "tamed garden demesne", "cloud-shrouded mountain hold", "scattered isles", "stable farming shire"
    ],
    "Realm Traits": [
      "unstable weather windows", "scarce fresh water", "valuable deep-earth minerals",
      "old failed irrigation channels", "dangerous native beasts", "a noble monopoly on roads and bridges",
      "fragmented local governance", "unreliable signal towers", "large unmapped wildland",
      "seasonal migration hazards"
    ],
    "Wilderness Peril": [
      "sudden hailstorm", "sinkhole into old mine tunnels", "territorial wild beast",
      "poisonous fog from a cursed bog", "a washed-out ford", "bandits lying in ambush",
      "wolves drawn by the scent of blood", "an unstable rope bridge", "flooded forest trail",
      "a watch cordon around a haunted site"
    ],
    "Wilderness Opportunity": [
      "rare mineral vein", "relics of a fallen age", "friendly local guide",
      "hidden water source", "shortcut through a scout's trail", "abandoned field camp",
      "salvageable cart", "smugglers' hollow", "evidence of a missing party",
      "natural shelter against the storm"
    ]
  },
  "Settlements": {
    "Settlement Type": [
      "walled market town", "riverside trading post", "mountain mining hold", "temple town",
      "baronial seat", "fishing hamlet", "frontier logging camp", "pilgrims' rest",
      "caravan waystation", "siege-scarred garrison town"
    ],
    "First Look": [
      "timber houses leaning over a muddy lane",
      "a single cobbled street crowded with market stalls",
      "watchmen posted at every gate",
      "farmers hauling carts in from the fields",
      "temple bells ringing over the rooftops",
      "a tavern, shrine, and smithy sharing one square",
      "patched thatch roofs and mismatched fences",
      "children chasing geese between the houses",
      "an unfinished palisade half-buried in mud",
      "guardsmen pretending not to be nervous"
    ],
    "Authority": [
      "town reeve", "elected village council", "garrison captain", "guildmasters' coalition",
      "temple high priest", "local baron or baroness", "scholarly warden", "hedge wizard steward",
      "sheriff's office", "family patriarch or matriarch"
    ],
    "Settlement Trouble": [
      "rations are being hoarded by the granary keeper",
      "a labor dispute is near violence",
      "the well has run dry",
      "the official tax count is false",
      "a missing child is blamed on outsiders",
      "the watch has started disappearing people",
      "the town charter is contested by a rival claimant",
      "a plague is being hidden from travelers",
      "two factions control different sections of the wall",
      "an old taboo blocks the obvious solution"
    ],
    "Settlement Project": [
      "expand the palisade", "repair the watchtower beacon", "open a new quarry face",
      "complete an irrigation ditch", "build militia defenses", "restore the temple",
      "dig a new well", "survey a nearby ruin", "negotiate a trade agreement",
      "cleanse a curse from the water supply"
    ]
  },
  "Districts": {
    "Access": {
      "First Look": [
        "hardened checkpoint with worn iron gates",
        "cargo gates lined with inspection guards",
        "arrival square packed with delayed travelers",
        "toll booth running on a skeleton crew",
        "portcullis grinding down too slowly",
        "gatehouse tunnel scored by old fire"
      ],
      "Complication": [
        "entry papers do not match the current authority",
        "the road is sealed until a bribe is paid",
        "a wanted face appears on the watch roster",
        "an alarm bell traps everyone between doors",
        "guards find something no one packed",
        "a rival guild's caravan arrives bearing a higher-ranking writ"
      ],
      "Useful Detail": [
        "maintenance postern", "sympathetic gate clerk", "forgotten service stair",
        "blind spot in the watch rotation", "old paper logbook", "loose flagstone hiding contraband"
      ]
    },
    "Community": {
      "First Look": [
        "crowded tavern with improvised shrine",
        "schoolroom doubling as ration office",
        "public notice board layered with grievances",
        "communal well near a fortified wall",
        "common hall lit by guttering candles",
        "market stalls built from old crates"
      ],
      "Complication": [
        "locals refuse to speak while the watch is present",
        "a rumor spreads faster than facts",
        "a family feud blocks cooperation",
        "a public argument becomes a loyalty test",
        "someone asks for rescue before information",
        "children know the truth adults avoid"
      ],
      "Useful Detail": [
        "old-timer with route knowledge", "town crier's circuit", "black-market cook",
        "memorial list of missing workers", "hidden prayer room", "worker grievance ledger"
      ]
    },
    "Engineering": {
      "First Look": [
        "vibration through timbered floors",
        "lead pipes sweating with condensation",
        "warning lanterns under a film of dust",
        "waterwheel access behind patched masonry",
        "runoff dripping into collection buckets",
        "winch handles polished by constant use"
      ],
      "Complication": [
        "repairs require shutting down the well elsewhere",
        "a sluice has been deliberately misaligned",
        "the only millwright is missing",
        "a makeshift patch holds but will fail soon",
        "a damaged construct guards the wrong room",
        "flooding begins during the inspection"
      ],
      "Useful Detail": [
        "spare cogwheels", "handwritten repair map", "open inspection hatch",
        "service crawlway", "a cracked water clock", "a flask of lantern oil, nearly spent"
      ]
    },
    "Living": {
      "First Look": [
        "stacked bunks behind thin privacy curtains",
        "family quarters decorated with heirlooms",
        "sleeping pallets lining a narrow corridor",
        "condensation on every stone wall",
        "personal chests chained shut",
        "a quiet room that feels recently abandoned"
      ],
      "Complication": [
        "someone has searched the rooms before you",
        "a hidden occupant refuses to leave",
        "private evidence implicates a public hero",
        "a quarantine mark is painted inside",
        "a domestic dispute reveals faction pressure",
        "a vent carries voices from a sealed room"
      ],
      "Useful Detail": [
        "personal diary", "stashed key", "contraband letters",
        "family portrait with a clue", "medicine bottle label", "map scratched under a bunk"
      ]
    },
    "Medical": {
      "First Look": [
        "triage cots divided by hanging cloth",
        "healer's table with a cracked basin",
        "herbal smell beneath disinfecting smoke",
        "cold cellar with missing inventory",
        "overworked healer refusing sleep",
        "plague marks covered by whitewash"
      ],
      "Complication": [
        "records are locked by noble decree",
        "a patient recognizes the party",
        "the remedies have been switched",
        "the healer is treating both sides",
        "a corpse is recorded as sent home",
        "symptoms do not match any known ailment"
      ],
      "Useful Detail": [
        "a strange result from a bloodletting", "sealed healer's notes", "hidden remedy cache",
        "the infirmary's midden-cart route", "sedative draught", "crypt key"
      ]
    },
    "Operations": {
      "First Look": [
        "campaign maps showing outdated territory",
        "dispatch table under low lantern light",
        "runners speaking in code",
        "a wall of chalk boards and red flags",
        "locked counting room overlooking the floor",
        "archive cabinets beside a broken ledger stand"
      ],
      "Complication": [
        "the ledger ink is still wet on a rewritten page",
        "a superior gives contradictory orders",
        "a signal fire burns at a forbidden site",
        "the map omits a whole region",
        "courier records show an impossible journey",
        "a clerk begs you not to mention their name"
      ],
      "Useful Detail": [
        "watch roster", "route archive", "private courier list",
        "old incident report", "unclaimed watch badge", "guild route seal"
      ]
    },
    "Production": {
      "First Look": [
        "assembly benches humming with unseen labor",
        "ore hoppers feeding a sealed forge",
        "hoist ropes under smoky lamps",
        "workshop floor chalked with warnings",
        "crafting benches producing unknown parts",
        "the smell of oil and hot metal"
      ],
      "Complication": [
        "the guild fines every hour the forge goes cold",
        "a workshop is making something illegal",
        "workers sabotage the forge for leverage",
        "a trapped worker is inside the mill works",
        "a product batch is magically contaminated",
        "the goods do not match the ledger"
      ],
      "Useful Detail": [
        "reinforced smithing apron", "parts bin", "control lever",
        "key to the sluice lock", "a flawed piece of guild work", "a guild's lead seal"
      ]
    },
    "Scholarship": {
      "First Look": [
        "observation glass with cracks at the edges",
        "archive vault humming softly with wards",
        "scrolls full of crossed-out formulae",
        "sealed study with fogged windows",
        "specimen jars lit from below",
        "scholars speaking in rehearsed answers"
      ],
      "Complication": [
        "the principal scholar is lying by omission",
        "the experiment changed after the last letter",
        "containment depends on a failing ward",
        "a sample is missing but not logged",
        "a discovery has martial value",
        "the notes prove the patron caused the problem"
      ],
      "Useful Detail": [
        "research journal", "preserved sample", "arcane recording crystal",
        "warded gloves", "experiment access sigil", "unpublished survey notes"
      ]
    },
    "Security": {
      "First Look": [
        "armory cage with empty racks",
        "holding cells under dim light",
        "interrogation room with no witness",
        "barracks smelling of sweat and leather",
        "checkpoint barricades made permanent",
        "watch officer studying a wanted board"
      ],
      "Complication": [
        "the watch is split between two loyalties",
        "a prisoner knows too much",
        "weapons were signed out under false names",
        "the official threat is a cover story",
        "a lockdown order arrives by sealed letter",
        "a guard recognizes an old debt"
      ],
      "Useful Detail": [
        "tower shield", "gaol roster", "armory ledger",
        "blind watch post", "coded challenge phrase", "confiscated personal item"
      ]
    },
    "Commercial": {
      "First Look": [
        "trade stalls under strung lanterns",
        "broker offices with barred windows",
        "tavern serving as labor exchange",
        "cargo auction chalked on a dirty board",
        "pawn counter stacked with traveler's gear",
        "guild store charging in guild scrip"
      ],
      "Complication": [
        "prices shift after a rumor hits",
        "a broker sells the same lead twice",
        "a debt collector interrupts negotiations",
        "the wanted item is counterfeit",
        "a merchant asks for protection instead of coin",
        "a public transaction masks a private handoff"
      ],
      "Useful Detail": [
        "market gossip", "a rare forged fitting", "a merchant's cargo mark",
        "smuggler contact", "debt ledger", "freshly forged permit"
      ]
    },
    "District Type": [
      "Access", "Community", "Engineering", "Living", "Medical",
      "Operations", "Production", "Scholarship", "Security"
    ]
  },
  "Vessels & Caravans": {
    "Vessel Type": [
      "frontier scout wagon", "crown-chartered merchant convoy", "ore-hauling barge", "noble's courier coach",
      "patrol longship", "healer's carriage", "scholar's tender", "bulk river barge",
      "smuggling skiff", "settler's landing raft"
    ],
    "First Look": [
      "scarred timber and fresh patchwork",
      "running lanterns dimmed to save oil",
      "cargo crates arranged asymmetrically",
      "a proud vessel name painted over older lettering",
      "exposed rigging wrapped in repair cord",
      "clean noble livery hiding battle damage",
      "auxiliary water casks strapped to the frame",
      "hitching gear patched from another wagon",
      "wheel rims blackened by hard travel",
      "a defensive crossbow tracking too smoothly"
    ],
    "Vessel Trouble": [
      "the water casks are near empty",
      "the wagon carries undocumented passengers",
      "provisions are lower than declared",
      "the guide refuses one destination",
      "cargo weight does not match the manifest",
      "a hired hand is being coerced",
      "the vessel is shadowed by a silent rider",
      "toll investigators are looking for it",
      "a sealed compartment shows fresh use",
      "the captain owes more than coin"
    ],
    "Vessel Quirk": [
      "old guild stamps on every crate",
      "a shrine in the cargo hold",
      "a steward still taking orders from a dead officer",
      "smell of spiced tea everywhere",
      "rigging maintained obsessively",
      "patched mascot painted near the hatch",
      "crew uses naval slang incorrectly",
      "every axle has a nickname",
      "the frame hums in certain weather",
      "mess table bolted from salvaged armor"
    ]
  },
  "Characters": {
    "First Look": [
      "battered armor kept spotless out of pride",
      "fine robes with travel-worn boots",
      "a holy symbol worn upside down",
      "hands stained with ink or dye",
      "a blade too fine for its owner's station",
      "eyes that don't match in color",
      "a limp hidden behind confident stride",
      "jewelry pawned down to one plain ring",
      "a scar shaped like something deliberate",
      "the calm of someone who has already died once"
    ],
    "Role": [
      "wandering healer", "guild enforcer", "disgraced knight", "hedge wizard",
      "village elder", "smuggler captain", "temple acolyte", "mercenary captain",
      "court advisor", "grave-robber turned scholar", "beast-tamer", "bounty hunter",
      "exiled noble", "cult defector", "oathbound guardian"
    ],
    "Goal": [
      "break a curse laid on their bloodline", "pay a debt owed to something not quite human",
      "find the one who betrayed their order", "protect a village no one else will defend",
      "reclaim a birthright stolen by kin", "prove an old prophecy wrong",
      "smuggle a forbidden text to safety", "atone for a war crime only they remember",
      "keep a dangerous secret buried", "win back a title lost to scandal"
    ],
    "Revealed Aspect": [
      "still serves the order that exiled them",
      "carries a curse they haven't told anyone about",
      "owes a life-debt to someone at this table",
      "is testing the party for a hidden patron",
      "has already broken the oath they claim to hold",
      "carries evidence that could topple a noble house",
      "is more than they appear, and not by choice",
      "is protecting someone the party hasn't met yet",
      "has a bounty on their head under another name",
      "knows the quest is a trap and hasn't said so"
    ],
    "Disposition": [
      "helpful but wary of debts", "openly hostile to outsiders", "formally courteous",
      "desperate and proud about it", "friendly until coin runs short", "suspicious of magic",
      "insulted by amateur adventurers", "curious about the party's purpose", "polite but delaying",
      "weary of a war that never quite ended"
    ],
    "Name": [
      "Ysolde Thorne", "Bram Kestrel", "Odalys Fenwick", "Cassian Vale", "Maren Ashgrove",
      "Talwyn Rook", "Isbeau Hallow", "Doran Marrow", "Fenella Wyck", "Casimir Thistledown",
      "Ravenna Stagg", "Aldric Fennimore", "Seraphine Duskwood", "Yorick Blackwell", "Elowen Sable"
    ],
    "Stereotype": [
      "the weary veteran who's seen this exact mistake before", "the ambitious climber who sees everyone as a rung",
      "the true believer who won't hear a word against the cause", "the reluctant conscript who never wanted any of this",
      "the fixer who can get anything, for a price", "the faded champion who peaked years ago and knows it",
      "the idealist not yet worn down by the frontier", "the survivor who trusts nothing that looks too easy",
      "the guild loyalist who genuinely believes the charter", "the outsider who's fluent in everyone's business but their own",
      "the old hand who trained half the people now giving orders", "the striver working three jobs to buy their way out",
      "the true neutral who profits from every side staying armed", "the haunted one who won't say what they saw out there",
      "the golden child who has never once been told no"
    ],
    "Want": [
      "enough money to leave and never look back", "one clean job to finally clear an old debt",
      "someone, anyone, to actually listen", "revenge, carefully and patiently pursued",
      "a way to undo one specific past decision", "recognition for work everyone else takes credit for",
      "safety for someone they can't openly protect", "proof of something nobody else believes is real",
      "a reason to stop running", "one more day without the truth coming out",
      "a way back into good standing after a fall", "the nerve to finally walk away",
      "a legacy that outlasts them", "forgiveness they haven't earned yet", "just to be left alone"
    ],
    "Complication": [
      "owes a debt to someone dangerous", "is being quietly investigated", "is in love with the wrong person",
      "made a promise they can't keep", "is hiding an illness", "was given an order they intend to disobey",
      "knows a secret that would ruin someone powerful", "is being impersonated, somewhere, by someone",
      "has a criminal record under a different name", "is slowly losing the trust of people who matter to them",
      "made an enemy of someone who hasn't acted yet", "is caught between two people they can't afford to disappoint",
      "took something that wasn't theirs to take", "is running out of time to fix a mistake",
      "trusts the wrong person completely"
    ],
    "Opportunity": [
      "owes the party a favor they haven't called in yet", "has information they'd trade for the right price",
      "could vouch for the party somewhere that matters", "controls access to something the party needs",
      "is looking for exactly the help the party can offer", "would owe a debt for a small, low-risk kindness",
      "has a grudge against someone the party also distrusts", "is one good reason away from switching sides",
      "knows a shortcut nobody else is using", "would talk freely if approached alone"
    ],
    "Threat Rank": [
      "Harmless — no real capacity to hurt anyone",
      "Nuisance — can complicate things but not seriously hurt anyone",
      "Dangerous — can hurt or kill a single party member in a bad moment",
      "Severe — could kill or seriously injure more than one",
      "Lethal — can kill multiple party members if unopposed",
      "Catastrophic — threatens the whole party or the scene itself"
    ]
  },
  "Creatures": {
    "Environment": [
      "root tunnels", "hot springs", "fungal groves", "ice caverns",
      "ore seams", "flooded caves", "abandoned halls", "storm drains",
      "ship bilges", "jungle canopy"
    ],
    "Scale": [
      "insect-sized swarm", "small dog-sized pack", "human-sized stalker", "large predator",
      "wagon-sized mass", "hive-bound swarm", "creeping unseen blight", "parasitic infestation"
    ],
    "Behavior": [
      "observing from cover", "protecting a nest", "feeding on refuse", "following heat",
      "mimicking voices", "avoiding bright light", "testing boundaries", "attacking only the isolated",
      "drawn to sound", "responding to arcane signals"
    ],
    "Revealed Aspect": [
      "not native to this world", "bred for a purpose", "part of a larger life cycle",
      "carrying valuable alchemical reagents", "reacts to human stress", "uses tunnels as hunting routes",
      "has been deliberately released", "is avoiding something worse",
      "is intelligent enough to bargain indirectly", "cannot survive without the ruin"
    ]
  },
  "Factions": {
    "Faction Type": [
      "noble house", "merchant guild", "temple order", "bandit clan",
      "arcane academy", "border militia", "druidic circle", "smuggler ring",
      "cult of a forgotten god", "free company of mercenaries"
    ],
    "Influence": [
      "a single tavern-room cell", "district authority", "settlement power", "regional power broker",
      "realm-wide power", "kingdom-level power", "shadow network", "a fading old order"
    ],
    "Project": [
      "control the only safe route", "bury evidence of an old crime", "monopolize water or grain",
      "turn a discovery into a weapon", "break a journeymen's uprising", "smuggle people out",
      "force a rival's holdings into forfeit", "secure exclusive rights to loot a ruin", "provoke a state of martial law",
      "capture a dangerous beast"
    ],
    "Relationship": [
      "uneasy truce", "open vendetta", "secret partnership", "public rivalry private cooperation",
      "patron-client dependency", "mutual blackmail", "religious or ideological hatred",
      "shared enemy", "sworn obligation", "family ties across faction lines"
    ],
    "Rumor": [
      "their leader is already dead", "they found something beneath the town",
      "their coin comes from a forbidden trade", "they are quietly listing who flees first",
      "they have a private dungeon", "their best asset is a child or dependent",
      "they hold the keys to every gate", "they caused the last disaster",
      "they are being manipulated by an outside patron", "they know how to leave but not who to save"
    ]
  },
  "Ruined Holds": {
    "Location": [
      "high hilltop", "border crossing", "ice field", "surface ruin scar",
      "cave cavity", "abandoned harbor", "deep lake trench", "poison-fog basin",
      "mine shaft's end", "mountain shadow"
    ],
    "Type": [
      "survey party's camp", "ore-smelting works", "scholar's tower", "settlement outpost",
      "garrison lookout post", "supply depot", "prison caravan", "healer's wagon",
      "carters' yard", "irrigation weir"
    ],
    "Condition": [
      "torchlight flickers intermittently", "partially collapsed", "looted but not empty",
      "externally intact internally ruined", "sealed by old ward", "overgrown by wild growth",
      "burned from inside", "split into accessible sections", "occupied by squatters",
      "moving under residual enchantment"
    ],
    "Outer First Look": [
      "frozen mist", "impact scars across the wall", "warning beacons still burning",
      "graffiti from later visitors", "a breached storeroom like a wound", "sundials tracking no sun",
      "a watchtower's banner folded like broken fingers", "lifeboats missing from one side of the dock",
      "patched breach with newer stone", "strange growth along the seams"
    ],
    "Inner First Look": [
      "floating dust motes in stale air", "guttering lanterns over ankle-deep water",
      "walls scratched by tools or claws", "personal effects left mid-routine",
      "doors barred shut from the wrong side", "frost on the inside of an abandoned helm",
      "bloodless bodies still seated at table", "a mill wheel continuing a pointless task",
      "air full of glittering dust", "soft knocking from deeper inside"
    ],
    "What Happened": [
      "a ward breach let the cold in all at once",
      "quarantine locked everyone inside",
      "mutiny turned the halls into a battlefield",
      "cargo shifted and crushed the lower stores",
      "something got in through an unwatched postern",
      "the garrison turned on their own reflection",
      "the well was poisoned for a rival's gain",
      "starvation set in after the last harvest failed",
      "the steward decided rescue would take too long",
      "a wild beast got loose in the infirmary",
      "the household fled and never made it to the boats"
    ],
    "What Remains": [
      "a ledger with the last entries torn out",
      "handprints dragging toward the postern gate",
      "personal effects arranged like a shrine",
      "a locked chest nobody thought worth forcing",
      "half-eaten rations still on the mess table",
      "a letter written but never sent",
      "tools abandoned mid-repair",
      "restraints cut from the inside",
      "a countdown scratched into the stone",
      "cloaks folded neatly with no bodies inside",
      "an astrologer's chart marking somewhere off every map"
    ],
    "Still Changing": [
      "the wards rebuild themselves after every failure",
      "the growth spreads faster when observed",
      "doors reseal themselves on a schedule nobody set",
      "the chill keeps deepening past what the stone should allow",
      "something is still ringing a bell no one can find",
      "the ruin drifts slightly closer to the cliff edge",
      "corrosion spreads only where people stand",
      "the guardian constructs are learning the party's habits",
      "a section warms itself back to life overnight",
      "structural groaning climbs without cause",
      "something is moving cargo between rooms"
    ]
  },
  "Vaults / Ruins": {
    "Location": [
      "buried under town foundations", "inside a basalt ridge", "beneath a dried seabed",
      "within a mountain core", "below a ruined aqueduct", "in a forbidden stretch of jungle",
      "under the northern ice", "behind a collapsed mine face", "inside a volcanic tube",
      "beneath an abandoned city quarter"
    ],
    "Scale": [
      "single sealed chamber", "small warren of vaults", "many-leveled undercroft", "city-sized ruin",
      "sprawling tunnel network", "a complex linked across the whole region", "subsurface labyrinth", "clockwork cathedral"
    ],
    "Purpose": [
      "lost archive", "prison for a living plague", "armory", "seat of an ancient ruler",
      "ritual or memorial site", "great sluice", "golem isolation vault", "last-ditch refuge",
      "a menagerie of preserved bloodlines", "a watching-place of unknown purpose"
    ],
    "Interior Feature": [
      "walls grown rather than built", "floor markings that match the constellations",
      "sealed sarcophagi still warm to the touch", "a dry fountain beneath sealed glass",
      "stonework pulsing like organs", "mortal tools added later",
      "up and down that shift from room to room", "old warning icons in several languages",
      "a chamber where no spell can be heard or cast", "a door demanding a drop of living blood"
    ],
    "Peril / Opportunity": [
      "valuable lore behind a lethal ward", "a safe path that destroys evidence",
      "a dormant defense that mistakes intent", "a trapped survivor with unreliable memory",
      "a cure stored beside a contaminant", "a wellspring of power that attracts factions",
      "a shortcut that collapses after use", "a map that reveals another threat",
      "an artifact that is also a beacon", "an escape route controlled by an enemy"
    ]
  },
  "Location Themes": {
    "Theme Type": [
      "Chaotic", "Fortified", "Haunted", "Infested", "Inhabited", "Warded", "Ruined",
      "Sacred", "Arid", "Chronal", "Inferno", "Floating", "Flooded", "Frozen",
      "Feral", "Overgrown", "War Zone", "Noble"
    ],
    "Theme Detail": [
      "authority changes by the hour", "defenses face inward as much as outward",
      "old guilt shapes local behavior", "small signs of infestation appear before the threat",
      "ordinary life continues around danger", "wards obey old priorities",
      "collapse happened in layers", "ritual meaning has replaced practical use",
      "water is more valuable than law", "events repeat or leave echoes",
      "heat forces timed movement", "nothing is anchored securely",
      "every route changes with water levels", "cold preserves evidence too well",
      "the place behaves like an organism", "nature is reclaiming human works",
      "old battle lines still matter", "guild greed overrides human need"
    ],
    "Sensory Detail": [
      "candle smoke thick in low rafters", "moss softening every stone underfoot",
      "the creak of a wind older than the walls", "cold that clings even near the hearth",
      "distant bells marking hours no one keeps", "the smell of rain on old parchment",
      "torchlight guttering without a draft", "birdsong that stops all at once",
      "dust motes hanging still in shafts of light", "the hush of a room that expects visitors"
    ],
    "Sight": [
      "flickering torchlight strobing across scuffed walls",
      "condensation trails running down a cracked windowpane",
      "a guardian statue stalled mid-gesture, eyes dark",
      "handprints in dust on an otherwise clean altar",
      "banners swaying with no obvious draft",
      "a warning placard peeling at the corners",
      "shadows pooling where a lantern has gone dark",
      "scorch marks someone tried and failed to scrub away",
      "a mural repeating the same stale warning",
      "personal effects left behind mid-task"
    ],
    "Smell": [
      "hot wax from overworked candles", "stale air with nowhere to go",
      "lye and scorched wood", "something organic decaying behind a wall",
      "fresh herbs masking an older smell", "oil and polished steel",
      "burnt chicory left too long", "incense over something it can't fully cover",
      "damp fabric and old sweat", "a cloying alchemical sweetness that shouldn't be there"
    ],
    "Sound": [
      "the irregular clank of a failing waterwheel", "distant voices arguing, too muffled to make out",
      "stray blasts from an unattended signal horn", "a slow, rhythmic dripping somewhere unseen",
      "the low hum of overtaxed wards", "boots on grating, receding, then stopping",
      "a door opening and closing with no one near it", "an alarm bell clanging once and going silent",
      "wind moaning through a loose shutter", "sudden total silence where the mill should be running"
    ],
    "Site Type": [
      "village edge", "village square", "castle gate", "great hall", "dungeon entrance",
      "forest clearing", "mountain pass", "riverside dock", "temple courtyard", "market row",
      "watchtower", "underground cavern", "archive vault", "ward chamber", "signal tower", "stable yard"
    ],
    "Immediate Surroundings": [
      "inside a building", "open field", "dense forest", "underground", "narrow passage",
      "behind cover", "exposed ledge", "sealed chamber", "flooded cellar", "crowded market",
      "total darkness", "ruined structure", "collapsed section", "field of rubble", "dense fog", "elevated platform"
    ]
  },
  "Missions": {
    "Mission Type": [
      "escort a person before their enemies find them", "recover a relic before it's destroyed",
      "sabotage a rival house's ceremony", "protect a witness through hostile territory",
      "broker a truce between two holds", "plant evidence to frame a rival",
      "recover a stolen heirloom", "deliver a package no one can trace",
      "expose a cover-up", "settle a debt with someone dangerous"
    ],
    "Patron": [
      "guild master", "village elder", "temple envoy", "disgraced noble",
      "wandering scholar", "rival party's patron", "hedge-witch", "anonymous sealed letter",
      "family of a victim", "the crown itself, through intermediaries"
    ],
    "Twist": [
      "the patron caused the problem", "the target wants to be found",
      "success hands a rival house everything they need", "the reward is favor, not coin",
      "the real patron is hidden behind three intermediaries", "the threat is a symptom of something older",
      "the official story is a comfortable lie", "the deed is lawful and still wrong",
      "the evidence is a person, not a document", "the deadline is shorter than stated"
    ],
    "Reward": [
      "letters of safe passage", "a noble's favor owed", "a rare enchanted trinket",
      "sanctuary rights at a temple", "debt forgiveness", "an exclusive fence contact",
      "a hidden route through dangerous land", "rare alchemical components", "standing with a faction",
      "a name cleared of an old crime"
    ],
    "Heat Result": [
      "the watch tracks the party's movements", "prices rise against the party",
      "a faction clock advances", "a contact goes quiet", "official permits are reviewed",
      "a rival spreads a damaging rumor", "checkpoint searches intensify",
      "an enemy learns the party's names and colors", "a bounty is posted quietly",
      "a patron asks for deniable help"
    ],
    "Danger Clock": [
      "0: ordinary signs of pressure", "1: small anomaly or missing detail",
      "2: route, resource, or witness becomes unstable", "3: threat demonstrates intent or intelligence",
      "4: faction, environment, or creature cuts off an option",
      "5: direct confrontation, forced choice, or irreversible cost",
      "6: aftermath reveals the next larger problem"
    ],
    "Patron Benefit": [
      "pays in untraceable coin, no questions asked",
      "grants access to a restricted archive",
      "clears an old debt or warrant",
      "offers a standing introduction to a useful contact",
      "throws in gear the party actually needs",
      "guarantees follow-up work if this goes well",
      "shares intelligence the party couldn't get elsewhere",
      "covers healing costs regardless of outcome",
      "puts in a good word with a wary faction",
      "looks the other way on the party's other business"
    ],
    "Patron Hazard": [
      "isn't authorized to make this offer",
      "is being watched by someone dangerous",
      "already burned the last party who took this job",
      "wants something the contract doesn't mention",
      "is lying about how simple this will be",
      "has a rival who will retaliate against whoever takes it",
      "can't actually deliver the promised reward",
      "is using the party to settle a personal score",
      "will deny hiring the party if it goes wrong",
      "is more desperate than the offer lets on"
    ],
    "Danger Pay Reason": [
      "the target is guarded by more than expected",
      "the window to act is dangerously short",
      "there's no help available out here",
      "the task requires breaking a sacred law",
      "the last party sent didn't come back",
      "the land alone is dangerous after dark",
      "success means crossing a faction that won't forget",
      "the cargo or target fights back",
      "secrecy matters more than safety to the patron",
      "there's no way to know the true risk until too late"
    ]
  },
  "Conflict Architecture": {
    "Stake Anchor": [
      "a person the party has met", "a place that offered shelter", "a debt that will come due",
      "a promise made publicly", "a scarce resource everyone needs",
      "a moral line a PC does not want to cross", "a community that cannot leave",
      "evidence that will ruin someone powerful", "a secret tied to the party's past",
      "a future route or refuge"
    ],
    "Opposition Logic": [
      "the antagonist is protecting their own people", "the enemy profits from delay",
      "the opposition needs the party alive for now",
      "the rival believes they are preventing a worse disaster",
      "the faction is obeying a contract with hidden penalties",
      "the antagonist lacks full information",
      "the enemy's cruelty is efficient not random",
      "the opposition must act before a public deadline",
      "the villain is trapped by promises to followers",
      "the enemy is trying to erase all blame"
    ],
    "Meaningful Choice": [
      "save people now or preserve evidence", "honor a contract or protect the vulnerable",
      "move fast and miss clues or investigate and lose time",
      "trust a guilty ally or face a stronger enemy alone",
      "reveal the truth and cause panic or hide it and lose trust",
      "take the guild's resources or remain independent",
      "destroy the threat or learn from it", "protect the town or protect the mission",
      "make a public stand or win quietly", "rescue one group while abandoning another"
    ],
    "Escalation": [
      "the cost becomes personal", "the opposition adapts to the last tactic",
      "a neutral party is forced to choose sides", "a deadline becomes visible",
      "resources degrade under pressure", "the safe route closes",
      "an ally's loyalty is tested", "the truth expands the problem",
      "victory in one arena causes trouble in another", "the antagonist makes a reasonable offer"
    ]
  },
  "Miscellaneous": {
    "Story Complication": [
      "the relic is real but already claimed by someone else",
      "the person to be rescued doesn't want rescuing",
      "the safest road is owned by a rival house",
      "the patron is also the villain's next of kin",
      "the ritual succeeds but leaves an unmistakable mark",
      "the evidence implicates an ally, not the enemy",
      "the reward is cursed in a way no one mentioned",
      "the safehouse was never actually safe",
      "the guide leading the party is the one being hunted",
      "the quest was a test, and it's still being judged"
    ],
    "Story Clue": [
      "a seal scratched off a noble signet",
      "a message in a code only one order uses",
      "footprints that don't match the creature blamed",
      "a ledger entry with a suspicious gap",
      "a blade etched with a name no one will say",
      "a receipt for a room that was never let",
      "a voice recognized from an old ballad",
      "a shrine offering left at the wrong hour",
      "a nickname only insiders would use",
      "coin routed through one too many hands"
    ],
    "Item of Narrative Significance": [
      "burned contract", "child's charm", "sealed reliquary", "broken badge",
      "signet ring", "old conqueror's banner", "a family letter in cipher", "bloodless knife",
      "handwritten map", "an unfinished clockwork device"
    ],
    "Anomaly Effect": [
      "messages arrive out of order", "organic matter crystallizes briefly", "the ground seems to tilt by a few degrees",
      "dreams share common imagery", "mill wheels turn without water or wind", "dead lanterns cast moving images",
      "compasses point at a person", "shadows lag behind movement", "water beads upward",
      "memories surface in unfamiliar voices"
    ],
    "Pay the Price": [
      "lose time", "spend supplies", "increase threat", "increase mystery", "mark a faction clock",
      "separate from an ally", "damage gear", "owe a favor", "reveal your presence",
      "trade one danger for another"
    ],
    "Horror Payoff": [
      "the feared thing is real but not the true cause",
      "the rescue target has become part of the danger",
      "the safest room is safe because something is feeding it",
      "the monster follows a rule the party can exploit",
      "the environment has been warning them all along",
      "the evidence proves negligence, not accident",
      "the creature is less frightening than the decision that made it",
      "the town can survive only by admitting a hidden crime",
      "the old map is accurate because the ruin is rebuilding itself",
      "the threat recognizes one party member",
      "the party has been carrying the clue since scene one",
      "the danger is not entering the town; it is leaving with the truth"
    ]
  },
  "Plot Engine": {
    "Plot Target": [
      "a person with divided loyalties", "a vulnerable band of laborers", "a hidden object in transit",
      "a birthright or legal claim", "a town's failing well or wall", "a dangerous arcane truth",
      "a trade monopoly", "a route through hostile lands", "a local taboo or tradition",
      "a buried noble scandal", "a missing expedition record", "a list of who gets out first",
      "a caravan route held hostage", "a forbidden creature", "a disputed water or grain contract",
      "a suppressed tally of the dead", "a new war engine under field trial", "a witness whose memory has gaps",
      "a settlement charter", "a faction's claim to legitimacy"
    ],
    "Plot Method": [
      "blackmail through falsified records", "sabotage disguised as shoddy repairs",
      "seizure by royal emergency decree", "deliberate ration manipulation",
      "staged rescue to gain trust", "planted evidence against a useful scapegoat",
      "controlled leak of partial truth", "use of debt markers and contract penalties",
      "manufactured panic to justify force", "quiet replacement of key personnel",
      "quarantine wielded as a weapon", "eviction order that separates witnesses",
      "false cry for help", "lies spread through tavern gossip",
      "contamination of a route or resource", "tampered scout report",
      "forged list of who may flee first", "predator release framed as natural migration",
      "memory charms or sedation passed off as healing", "gates barred by distant order during negotiation"
    ],
    "Plot Reveals": [
      "the patron is using the party as deniable pressure",
      "the villain is protecting someone from a worse faction",
      "the disaster was predicted and ignored", "the official enemy is a decoy",
      "the evidence proves several parties are guilty",
      "the victim arranged part of their own disappearance",
      "the route is dangerous because it is hiding something",
      "a minor NPC has the decisive evidence",
      "the cure or fix creates a new dependency",
      "the local authority knows but lacks leverage",
      "the apparent monster is following learned behavior",
      "the cargo is valuable because of who wants it destroyed",
      "the town cannot survive the truth becoming public",
      "the threat began as a guild's penny-pinching",
      "the map was altered after the last courier left",
      "the real antagonist is a clause in an old charter",
      "the creature is a warning, not a weapon",
      "the missing party chose silence to protect others",
      "the settlement's success depends on an atrocity",
      "the rescue mission is really a containment mission"
    ],
    "Scene Driver": [
      "deadline before a storm, sailing, siege, or vote", "resource drain that worsens every scene",
      "rival team moving in parallel", "NPC loyalty under stress",
      "a clue that can be lost or contaminated", "a safe place becoming unsafe",
      "a moral debt being called in", "couriers delayed or cut off",
      "party reputation changing local reactions", "heat from a previous mission arrives early",
      "water and provisions shrinking by the hour", "an enemy testing responses",
      "a disease clock with unclear symptoms", "a public crowd demanding an answer",
      "a legal window closing"
    ]
  },
  "Danger Situations": {
    "Castle & Workshop Hazards": [
      "portcullis falling while someone is trapped between gates",
      "smoke fog hiding a floor-level breach",
      "forge vibration changing from background noise to rhythm",
      "ore hoist dragging a load toward a stamping mill",
      "wild magic arcing across wet flagstones",
      "alchemical vat overflowing without warning",
      "runaway construct mistaking people for cargo",
      "treadwheel crane dropping stone at irregular intervals",
      "iron shutters slamming down between the group",
      "bellows spreading rather than clearing the foul air",
      "lamp-oil fumes pooling near an open forge",
      "damaged flooring creating fall zones",
      "workshop construct following old, lethal instructions",
      "a boiler straining far past any safe measure",
      "a mill room too loud for shouted warnings"
    ],
    "Environmental Dangers": [
      "storm front cuts off the return route", "thin ice or crust hides a deep void",
      "local pollen clogs throats and changes voices", "heat shimmer conceals moving shapes",
      "purple aurora distorts depth perception", "regenerating soil swallows tracks too quickly",
      "small tremors turn quiet movement into noise", "corrosive mist eats exposed leather and steel",
      "flash flood fills the lowest passage first", "predators use wind or rushing water to mask approach",
      "dust carries a mild hallucinogen", "salt flats gleam at night and ruin all wayfinding",
      "wild magic turns slopes into traps", "fungal mats exhale when stepped on",
      "the safest landmark moves with the tide or storm"
    ],
    "Wilderness & Road Dangers": [
      "slow exposure too quiet for immediate panic", "rope line fraying under unseen stress",
      "wagon axle cracking a little more each mile", "cargo sliding toward a ravine",
      "unnatural shadow shows something large nearby", "the password failing after the outer gate opens",
      "ice crystals obscuring vision", "silent rider matching speed with the wagon",
      "flood wreckage spinning faster than anyone judged", "a cry for rescue repeating in a dead companion's voice",
      "wagon patch flexing with every rut", "a fresh map contradicting what everyone can see",
      "a watchman's horn belongs to someone not on the roster", "storm winds that shift the only safe landing",
      "wagon fragments still bearing fresh guild marks"
    ],
    "Social Dangers": [
      "a crowd deciding whether the party is useful or guilty",
      "a frightened witness changing their story under pressure",
      "the watch asking questions they already know the answers to",
      "a broker selling silence by the minute", "a local custom that makes refusal dangerous",
      "an authority figure demanding public loyalty", "a desperate parent exposing a hidden route",
      "a rival offering the same deal first", "a faction using the party to test an enemy",
      "a room going quiet when one name is mentioned", "a hostage negotiation framed as a contract dispute",
      "a confession that implicates an ally", "a rumor that makes peaceful entry impossible",
      "a lawful order that would doom innocents", "a beloved local figure lying for understandable reasons"
    ]
  },
  "Fear and Dread": {
    "Fear Trigger": [
      "being watched by something unseen", "contamination that spreads through ordinary contact",
      "isolation from party, camp, or any word from home", "darkness that behaves like a physical pressure",
      "confinement with shrinking options", "familiar people acting subtly wrong",
      "evidence of a predator learning", "dead things moving as if alive",
      "a safe routine violated once, then twice", "a sound that stops when noticed",
      "the loss of memory, name, or identity", "body transformation too slow to deny",
      "authority figures more frightened than civilians",
      "the realization that rescue cannot arrive in time",
      "a place that remembers earlier visitors",
      "an escape route that becomes a choice of who deserves to leave",
      "a harmless trace of spoor becoming meaningful later",
      "a construct predicting events it should not know",
      "a corpse or wreck arranged to communicate",
      "the party's own voices coming from ahead"
    ],
    "Dread Technique": [
      "show the aftermath before the cause", "give partial information that supports two bad theories",
      "repeat one sensory detail with increasing wrongness",
      "let an NPC panic at something the party cannot yet see",
      "make the safe route require a moral cost",
      "withhold the monster but reveal its intelligence",
      "make tools and wards fail in a consistent, meaningful pattern",
      "introduce one impossible detail in an ordinary scene",
      "allow a short calm beat before the next escalation",
      "make the environment respond to the party's actions",
      "make the threat avoid direct confrontation until it knows enough",
      "turn a useful tool into a source of vulnerability",
      "force quiet choices instead of open combat", "make escape possible but costly",
      "make the truth useful and destabilizing", "show an expert losing confidence",
      "let the first success create a worse question",
      "turn a map, ledger, or litany into a countdown",
      "reveal that the party has been following the threat's preferred path",
      "let the scene answer a question no one asked"
    ],
    "Uncanny Detail": [
      "a person smiles half a second late", "a speaking stone answers a question it never heard",
      "a corpse is warm in only one hand", "the same scratch mark appears on both sides of a sealed door",
      "children's drawings show tomorrow's event", "a construct uses a nickname no one taught it",
      "a reflection includes one extra figure", "a familiar room is one pace too long",
      "a trusted ally uses the wrong childhood memory", "an animal moves like it is wearing a shape",
      "breath fogs from inside an empty helm",
      "a map labels a location with the party's own names", "a wound contains clean clockwork",
      "footsteps match the listener's pace exactly", "a dead speaking stone whispers only when ignored",
      "a warning sign uses a future date", "a child's toy repeats a watch password",
      "a suit of armor stands upright with no body inside",
      "the same NPC arrives twice by different routes",
      "a familiar sigil is printed backward on every surface"
    ],
    "Revelation Timing": [
      "hint now, confirm two scenes later", "reveal the cost before the cause",
      "show a small contradiction in a trusted record",
      "let a panicked NPC name the wrong threat",
      "make the first explanation comforting but false",
      "make the second explanation true but incomplete",
      "reveal the monster's rule before its form",
      "reveal the human choice that enabled the horror",
      "tie the reveal to a resource running out",
      "let the party choose whether to open the final proof",
      "show a witness who survived by misunderstanding events",
      "reveal a faction's guilt through routine paperwork",
      "make the last clue auditory rather than visual",
      "confirm the worst theory only after the party has acted against it",
      "let the enemy reveal useful truth as a bargaining tactic"
    ],
    "Safety-Aware Horror Prompt": [
      "keep harm implied and focus on suspense", "use environmental dread rather than graphic detail",
      "frame terror through choices and consequences",
      "let players decide how close to inspect the disturbing evidence",
      "make panic tactical, not punitive",
      "use NPC fear to signal danger without forcing player emotion",
      "offer a visible exit at a cost", "keep the threat coherent so fear feels fair",
      "avoid shock for its own sake; reveal information that matters",
      "follow intense scenes with a chance to regroup",
      "aim fear at uncertainty, isolation, and stakes rather than helplessness",
      "keep body horror optional and abstract",
      "make disturbing clues skippable without blocking progress",
      "use veiled descriptions when a result could become graphic",
      "give player characters meaningful choices even in a doomed situation"
    ]
  },
  "Settlements and Expeditions": {
    "Settlement Pressure": [
      "structural damage to the wall or granary", "morale falling after a failed mission",
      "raw materials depleted by emergency repairs", "research promising a solution but requiring risk",
      "enemy activity increasing near a border", "scout report contradicting official surveys",
      "settlers demanding action before evidence is complete",
      "the harvest threatened by wild blight", "construction delayed by missing parts",
      "medical capacity overwhelmed by unknown symptoms", "a new building draws unwanted attention",
      "an escape plan has too few wagons", "a supply wagon missed its scheduled window",
      "neglected repairs from earlier shortcuts come due", "a leadership dispute splits the work crews"
    ],
    "Expedition Objective": [
      "investigate a ruin without disturbing its active wards",
      "recover a scout team before the storm closes",
      "sample a creature without triggering territorial behavior",
      "map a safe corridor for settlement expansion",
      "destroy a nest or beacon near the perimeter",
      "escort workers to a damaged remote outpost",
      "locate raw materials needed for repairs",
      "confirm whether an enemy region is occupied",
      "retrieve a cargo wagon from unstable terrain",
      "test a theory before the settlement commits resources",
      "repair a beacon that may attract help or enemies",
      "find why scouts vanish beyond a ridge",
      "recover a cart before rain ruins its ledgers",
      "seal an opening discovered under new construction",
      "verify a friendly contact who arrived without warning"
    ],
    "Battlefield Condition": [
      "low visibility with intermittent shadows", "unstable footing or partial collapse",
      "hard cover that also blocks retreat", "hazardous pools, vents, or arcane arcs",
      "townsfolk in the way limit arrow and spell fire", "moving siege engines change lanes of attack",
      "enemy has high ground but poor mobility",
      "valuable relics can be destroyed by stray shots",
      "reinforcements arrive if alarms persist", "the terrain itself attracts predators",
      "the safest cover is contaminated",
      "line of sight changes with rotating shadows or storms",
      "a resource objective is heavier than expected",
      "sound discipline matters more than speed",
      "noise and torchlight reveal both sides to something else"
    ],
    "Post-Mission Find": [
      "ancient artifact with an obvious use and hidden cost",
      "torn page pointing to a larger pattern", "usable construction materials",
      "preserved specimen that settles a scholar's theory", "survivor with damaged memory",
      "old settlement marker from an unknown faction",
      "enemy equipment adapted to local conditions", "map of a sealed region",
      "remedy that treats one symptom", "supply cache with a claim mark",
      "letter that changes the party's priorities", "tool that makes the next expedition safer",
      "partial directions to a safer camp",
      "creature that reacts to the settlement's wards",
      "proof that the settlement is not the first here"
    ]
  },
  "Campaign Intelligence Engine": {
    "Director Move": [
      "Put a useful answer behind a costly door", "Show the human cost of the mission", "Reveal who benefits from the danger", "Make the safest route politically dangerous",
      "Offer evidence that contradicts the obvious story", "Turn a resource into a moral problem", "Let an ally ask for something unreasonable", "Expose a hidden dependency in the town",
      "Move the threat closer without fully showing it", "Make the party choose between speed and proof", "Create a public consequence for private action", "Let the environment answer before an NPC does",
      "Make a routine procedure fail at the worst time", "Tie a minor clue to a larger pattern", "Force the party to spend reputation as currency", "Put a vulnerable bystander in the path of progress"
    ],
    "Roleplay Option": [
      "Press the patron for the real objective", "Protect workers even if it delays the contract", "Trade a secret for access", "Lie to the watch and risk later exposure",
      "Promise evacuation before knowing if it is possible", "Appeal to professional duty", "Threaten to go public", "Make a quiet deal with a rival faction",
      "Interview the person everyone dismisses", "Comfort a terrified survivor", "Challenge the noble's version of events", "Split the party between proof and rescue",
      "Ask what the construct was ordered not to say", "Treat the criminal as a witness", "Use procedure as leverage", "Accept blame to keep the team moving"
    ],
    "Recommended Next Step": [
      "Secure the scene before investigating", "Question the last person who saw the victim", "Check the repair ledgers and watch logs", "Compare official records against physical evidence",
      "Trace cargo movement", "Inspect the sealed or restricted area", "Map who depends on what: water, grain, and couriers", "Identify who has authority to lie",
      "Find an independent witness", "Recover the watch log or the dead courier's satchel", "Establish an escape route", "Determine what the guild wants preserved",
      "Test a strange sample in a warded room", "Force the opposition to reveal urgency", "Set a fallback meeting point", "Put one clear question to the oracle"
    ],
    "Momentum Adjustment": [
      "Raise noble pressure by one", "Raise wild activity by one", "Raise party stress by one", "Lower resources by one",
      "Lower public trust by one", "Raise the watch's attention by one", "Add a countdown clock", "Mark a faction as suspicious",
      "Give the party a temporary advantage", "Reveal a safe route with a hidden cost", "Convert a clue into a lead", "Convert a lead into a confrontation",
      "Delay the threat but increase its scale", "Move the mission clock forward", "Offer a hard bargain", "Create a new unresolved thread"
    ]
  },
  "Core Solo Engine": {
    "Decision Prompt": [
      "What would a professional do here?", "What would make this job no longer routine?", "Who is not being protected by the official plan?", "What evidence would change everyone's priorities?",
      "What is the fastest safe option?", "What is the slowest truthful option?", "Which choice burns a bridge?", "Which choice preserves leverage?",
      "What does the party need before they can move?", "What does the opposition need to hide?", "What would make retreat honorable?", "What would make victory expensive?"
    ],
    "Scene Question": [
      "What is really happening here?", "Who benefits if the party leaves?", "What has been altered since the incident?", "What does the environment reveal?",
      "Who is afraid to speak?", "What has the guild already removed?", "What is failing right now?", "What is the next visible consequence?",
      "What personal stake enters the scene?", "What proof is fragile?", "Who arrives before the party is ready?", "What makes the obvious answer wrong?"
    ]
  },
  "Exploration": {
    "Discovery": [
      "a pre-settlement marker buried under old rubble", "a scout's charm humming from inside solid rock", "warm ground where maps show only dead earth", "a fungal mat arranged around a well shaft",
      "a crashed wagon with cargo missing but bodies untouched", "a sealed hatch stamped with a forgotten guild's warning", "a cavern whose walls echo old voices like memory", "an astrologer's tower aimed at the wrong horizon",
      "a hand-built shrine in an abandoned service tunnel", "a lamp-oil cache marked by a defunct guild", "a false skyline shimmering in the heat", "a living thing nesting in a hot spring's warmth"
    ],
    "Route Hazard": [
      "dust-choked lanterns", "sinkholes hidden by loose mats", "lodestone seams that spin every compass", "whiteout that swallows signal fires",
      "predator trails crossing the safe route", "ice fractures under wagon weight", "scouts led in circles", "corrosive rain bands",
      "unstable tunnel supports", "wreckers' false beacons", "shadow zones from old ruins", "territorial miners' barricades"
    ],
    "Exploration Payoff": [
      "a safer route for future travel", "proof of a poisoned stream", "a hidden store of water or firewood", "directions to an older settlement",
      "a trace of spoor that explains the hazard", "a salvageable clockwork part", "a witness hiding in the wilds", "evidence that the town was warned",
      "a map of hidden service passages", "an artifact that reacts to magic", "an abandoned emergency shelter", "a claim marker older than the contract"
    ],
    "What's Normal": [
      "wind patterns match the old-timers' lore exactly", "local wildlife keeps a predictable distance", "the soil is unremarkable", "weather follows the almanac",
      "terrain matches the survey maps", "the usual dangers are about what you'd expect", "the wells run as deep as the locals said", "the ground stays quiet underfoot",
      "the days and nights run as the almanac says", "vegetation growth follows known patterns", "nothing here contradicts the briefing"
    ],
    "What's Strange": [
      "the wildlife goes silent at the same hour every day", "a rock formation repeats too perfectly to be natural", "compasses drift toward one fixed point", "plants grow in deliberate rows",
      "the wind carries a sound like distant mill gears", "shadows fall a few degrees off true", "footprints predate the survey team's arrival", "local minerals hum faintly when a spell is cast nearby",
      "migratory patterns all point the same direction", "echoes return half a second too late", "a patch of ground stays warm through the night"
    ],
    "What's Dangerous": [
      "loose scree hides a sheer drop", "local fauna is territorial near the water source", "spores set everyone choking", "flash flooding follows the canyon route",
      "storms build faster than anyone can read the sky", "ground gives way over a hollow cavity", "predator tracks circle the campsite", "toxic runoff pools where it isn't expected",
      "temperature swings punish exposed skin", "a nest defends territory the survey didn't map", "unstable ice conceals crevasses"
    ],
    "What's Valuable": [
      "an untapped mineral vein near the surface", "a freshwater source clean enough to bottle", "salvageable gear from an earlier expedition", "a natural shelter defensible against weather",
      "medicinal plants unknown to the settlement's records", "a clear line of sight ideal for a signal tower", "fertile soil suited to the settlement's crops", "a bone bed worth a patron's purse",
      "rare crystal formations prized by artificers", "an intact cache from a previous expedition", "hot springs suited to a bathhouse or forge"
    ],
    "What's Beautiful": [
      "bioluminescent fungus lighting the cave walls", "a sunset refracted through mineral dust", "migratory flocks moving like a single organism", "crystal formations ringing faintly in the wind",
      "an aurora bending over the peaks", "a canyon carved into impossible symmetry", "wildflowers blooming in a toxic-looking basin", "frost patterns repeating like woven fabric",
      "a waterfall glowing faintly with minerals", "stars visible in daylight from the high passes", "a valley that echoes birdsong into harmony"
    ]
  },
  "Realm & Kingdom Creation": {
    "Kingdom Pressure": [
      "shipping delays are becoming political", "one guild controls every ford and ferry", "old surveys are unreliable", "bandits avoid one silent hollow",
      "settlements compete for the same water source", "a garrison quarantine is poorly explained", "irrigation debt shapes every local decision", "journeymen's leaders are arriving ahead of the king's inspectors",
      "a noble or merchant-prince family treats the realm as property", "a wild, unfamiliar land resists the mines and mills", "the old law-stones contradict local practice", "a missing expedition changed the trade route"
    ],
    "Road Event": [
      "distress signal in an outdated horn code", "unregistered courier rides hard for the far border", "toll-keepers demand a full search", "a waymarker points two different ways",
      "wreckage from an unreported wagon crash", "steward flags a route as spiritually unsafe", "a noble's outriders shadow the party", "the feed for the horses barely passes inspection",
      "the party receives a message sent before they departed", "a royal scout asks about papers they should not know of", "a sleeper in a warded coffin wakes early", "a passenger disappears from the caravan's ledger"
    ]
  },
  "Kingdoms & Settlements": {
    "Settlement Problem": [
      "water rationing hidden from guild backers", "workers' row built over poisoned ground", "well repairs put off to line a steward's purse", "the town vote controlled by bonded debt",
      "healing salves diverted to the guildmasters", "alchemical run-off twisting native life", "a missing survey team blamed on weather", "the town's grain dependent on one failing mill",
      "the watch guarding goods instead of people", "children reporting dreams of the same location", "construct labor dispute suppressed", "a prospector strike that the guild wants erased"
    ],
    "Local Color": [
      "guild mottoes painted over older warning signs", "temple tokens used as informal currency", "church bells recast from old armor", "miners wearing family charms for luck",
      "children playing in the shadow of the keep", "imported trees withering in walled gardens", "town criers shouting stale news", "guild marks scratched into tavern beams",
      "settlers naming storms like relatives", "old soldiers standing silent at the memorial", "market stalls built from old wagon parts", "faded banners bleached by sun and rain"
    ]
  },
  "Noble Houses & Guilds": {
    "House Pressure": [
      "guild auditors arrive with hired blades", "patron changes the objective mid-mission", "the guild's notary threatens penalties for breach of oath", "a herald's proclamation contradicts witness testimony",
      "danger pay is revoked unless the party swears an oath of silence", "rival house offers better terms for betrayal", "the lord orders evidence transferred to a distant hold", "the guild's assessor is more dangerous than the guards",
      "local bailiff begs the party not to file a report", "guild physician rewrites the healer's findings", "a binding clause in the charter seizes salvage rights", "a guild council observer counts the dead as lost coin"
    ],
    "Hidden Agenda": [
      "protect mineral rights", "turn a plague sample into a weapon", "avoid blame for a master's shoddy work", "discredit the journeymen's leaders",
      "recover a guild's secret construct bindings", "bury evidence of an illegal land seizure", "secure ancient artifacts before the crown's inquisitors arrive", "turn disaster into a chance to seize a rival's holdings",
      "force evacuation to break land claims", "test new martial law on a living town", "steal a rival guild's route maps", "keep the guild's backers confident at any cost"
    ],
    "Faction Activity": [
      "quietly buys out a smaller rival", "leaks a damaging rumor about a competitor", "recalls its agents for a closed council",
      "opens a new outpost without local approval", "cuts a backroom deal with a sheriff or crown magistrate", "tests the loyalty of its own sworn members",
      "reassigns its best people to a single urgent problem", "tests a new policy on a population that can't refuse", "quietly funds an opposing faction's rival",
      "stages a public event to shore up its reputation", "moves a key asset somewhere harder to reach", "cancels a contract without warning",
      "recruits aggressively in a community it doesn't yet control", "commissions a chronicle that conveniently flatters its own interests", "goes quiet — which is its own kind of signal"
    ],
    "Faction Asset": [
      "an elite enforcer cadre, loyal only to the top", "a hidden cache the rest of the faction doesn't know about",
      "an informant network threaded through a rival's own ranks", "a black-market supply pipeline no customs check catches",
      "a political patron who owes a favor nobody's called in yet", "a watchtower that hears more than it should",
      "a captive specialist kept comfortable and compliant", "a front guild that launders reputation as easily as coin",
      "a fast, deniable strike team for jobs that can't trace back", "a monopoly contract on something the whole realm needs",
      "a compromised crown magistrate who looks the other way, for now", "a private army of hired blades bigger than it publicly admits",
      "an archive of leverage on everyone who matters locally", "a fortified redoubt built for a war that hasn't started yet",
      "a loyal cell embedded inside a rival's own organization"
    ]
  },
  "Faction Turns": {
    "Faction Action": [
      "expands into unclaimed territory before a rival can", "consolidates its hold over an existing asset", "opens quiet diplomatic channels with a former enemy",
      "moves against a weaker rival while it still can", "exploits a resource before the crown notices", "sabotages a rival's supply caravans",
      "recruits heavily, thinning the local labor pool", "builds roads and bridges that lock in future control", "cuts a deal trading short-term loss for long-term leverage",
      "goes to ground, consolidating quietly instead of acting", "tests a rival's resolve with a calculated provocation", "spends heavily to buy loyalty it can't otherwise earn",
      "reaches for an asset just outside its usual reach", "repositions its assets ahead of a coming conflict", "makes a public move meant to be seen, not just felt"
    ],
    "Realm Tag": [
      "a realm under noble quarantine, officially for public health", "a realm where the ruling class never leaves their keep", "a realm built entirely on another era's ruins",
      "a realm where one guild owns the only water source", "a realm with a settlement that shouldn't have survived, but did", "a realm where the local wildlife is smarter than reported",
      "a realm that was irrigated wrong and never fixed", "a realm run by a steward nobody remembers installing", "a realm with a single, enormous, half-finished citadel",
      "a realm where the last war never officially ended", "a realm whose original settlers are long gone, but its old wards still hold", "a realm that exports labor, not goods",
      "a realm under a standing evacuation order nobody enforces", "a realm with a black market bigger than its legal economy", "a realm where a single family has ruled for generations"
    ]
  },
  "Twist & Gambit Oracles": {
    "Plot Twist": [
      "an ally's own goal conflicts with the party's, and they choose it over you",
      "the real threat was never the one you were watching",
      "a resource everyone assumed was safe turns out to be running out",
      "someone the party trusted was reporting to the opposition the whole time",
      "the mission's true purpose was hidden from the party until now",
      "an old debt comes due at the worst possible moment",
      "the enemy's plan was already three steps ahead of the party's",
      "a rescued party turns out to be more dangerous than what they were rescued from",
      "the evidence the party gathered points to an uncomfortable truth about themselves",
      "a supposed dead end reopens because someone else has been digging too",
      "the patron's stated goal was a cover story for something worse",
      "an artifact the party is carrying has been quietly changing them",
      "the timeline everyone assumed was wrong — the deadline already passed",
      "a faction thought neutral has been arming one side in secret",
      "the safest-looking option was deliberately made to look that way"
    ],
    "Combat Gambit": [
      "seize the high ground before the enemy can", "use the environment itself as a weapon",
      "draw fire to protect someone who can't defend themselves", "feign a retreat to pull the enemy out of position",
      "target the enemy's equipment instead of the enemy", "create cover where none existed a moment ago",
      "cut off the enemy's escape route first", "turn two enemies against each other",
      "sacrifice position for a decisive opening strike", "disable the lights, or whatever the enemy relies on to see",
      "take a hostage-equivalent — leverage, not just a target", "hold the line long enough for reinforcements or an exit",
      "break the enemy's formation before they can regroup", "go for the objective, not the kill",
      "improvise a weapon from whatever's already in reach"
    ]
  },
  // Direct follow-up request: "revise the Ironsworn ruleset to use the
  // actual Ironsworn rules instead of Starforged... create corresponding
  // oracles that match all the oracles for Ironsworn," read directly from
  // assets/docs/ironsworn/Ironsworn-Rulebook.pdf (Chapter 6, "Oracles,"
  // p.165-191) and its supplement assets/docs/ironsworn/ironsworn-delve-
  // rulebook-spreads.pdf (Chapter 8, "Oracles," p.203-223). Ironsworn's
  // own SRD text is CC BY-NC-SA 4.0 and its Assets Master Set is CC BY (far
  // more permissive than any other sourcebook referenced in this app,
  // which are the user's own purchased, non-open commercial PDFs) — but
  // this project's own established posture, applied consistently to EVERY
  // ruleset here including Starforged's own oracle group right above
  // ("Twist & Gambit Oracles," which is original content in Starforged's
  // STYLE, not a transcription of its real tables either), is original
  // re-authored content, never a verbatim transcription of a sourcebook's
  // actual table text — kept the same way here rather than carving out a
  // one-off exception just because this particular license would allow
  // it. Every table below MATCHES the real book's own category name, roll
  // mechanic (d100, including real range-weighting via Array(n).fill(...)
  // where the book itself weights unevenly), and rough entry-count/flavor
  // — only the specific wording is original. Ironlands-specific proper
  // nouns (the real book's own named regions, named Firstborn races) are
  // generalized to setting-agnostic equivalents, matching how every other
  // oracle category in this fantasy pack is already written to work for
  // any fantasy campaign, not one specific published setting.
  "Ironsworn Oracles": {
    "Action": [
      "Scheme", "Clash", "Weaken", "Begin", "Forge", "Vow", "Avenge", "Guard", "Defeat", "Command",
      "Break", "Risk", "Yield", "Inspect", "Raid", "Evade", "Assault", "Deflect", "Threaten", "Strike",
      "Depart", "Preserve", "Manipulate", "Remove", "Eliminate", "Withdraw", "Abandon", "Investigate", "Hold", "Focus",
      "Uncover", "Breach", "Aid", "Uphold", "Falter", "Suppress", "Hunt", "Share", "Destroy", "Avoid",
      "Reject", "Demand", "Explore", "Bolster", "Seize", "Mourn", "Reveal", "Gather", "Defy", "Transform",
    ],
    "Theme": [
      "Risk", "Skill", "Price", "Ally", "Battle", "Safety", "Survival", "Weapon", "Wound", "Shelter",
      "Leader", "Fear", "Time", "Duty", "Secret", "Innocence", "Renown", "Direction", "Death", "Honor",
      "Labor", "Solution", "Tool", "Balance", "Love", "Barrier", "Creation", "Decay", "Trade", "Bond",
      "Hope", "Superstition", "Peace", "Deception", "History", "World", "Oath", "Protection", "Nature", "Opinion",
      "Burden", "Vengeance", "Opportunity", "Faction", "Danger", "Corruption", "Freedom", "Debt", "Hate", "Stranger",
    ],
    "Region": [
      "The Windswept Isles", "The Ragged Shore", "The Deep Wildwood", "The Drowned Lowlands", "The Sheltered Vale",
      "The Rolling Hinterlands", "The Tempest Uplands", "The Veiled Peaks", "The Shattered Barrens", "The Old Road",
      "The Forsaken Edge", "Somewhere Unmarked",
    ],
    "Location": [
      "Hideout", "Ruin", "Mine", "Wasteland", "Shrine", "Trail", "Outpost", "Rampart", "Battlefield", "Hovel",
      "Spring", "Lair", "Stronghold", "Bridge", "Camp", "Cairn", "Caravan", "Falls", "Cave", "Marsh",
      "Fen", "Gorge", "Road", "Ancient Tree", "Pool", "Field", "Marshland", "Homestead", "Rapids", "Pass",
    ],
    "Coastal Waters Location": [
      "Stranded Fleet", "Drifting Weed-Bed", "Flotsam Field", "Shrine of the Deep", "Sunken Lair",
      "Shipwreck", "Harbor", "Derelict Ship", "Jagged Rocks", "Hidden Fjord",
      "River Mouth", "Sheltered Cove", "Open Bay", "Ice Floe", "Lonely Isle",
    ],
    "Location Descriptor": [
      "Towering", "Remote", "Exposed", "Cramped", "Shattered", "Varied", "Rugged", "Shadowed", "Gloomy", "Contested",
      "Savage", "Fertile", "Blocked", "Timeworn", "Hidden", "Deep", "Depleted", "Foreign", "Elevated", "Restless",
      "Unstable", "Fragile", "Broken", "Ensnaring", "Looted", "Treacherous", "Pristine", "Strange", "Abandoned", "Deadly",
    ],
    "Settlement Name": [
      "Highmoor", "Brackwater", "Frostwood", "Redcrest", "Grimtree", "Stoneford", "Deepwater", "Whitefall", "Graycliff", "Three Rivers",
      "Whitebridge", "Lonefort", "Highcairn", "Redhall", "Darkwell", "Timberwall", "Stonetower", "Thornhall", "Cinderhome", "Fallowfield",
      "Ravencliff", "Bearmark", "Wolfcrag", "Eaglespire",
    ],
    "Settlement Name Prefix": [
      "Bleak-", "Green-", "Wolf-", "Raven-", "Gray-", "Red-", "Axe-", "Great-", "Wood-", "Low-",
      "White-", "Storm-", "Black-", "Mourn-", "New-", "Stone-", "Grim-", "Lost-", "High-", "Rock-",
      "Shield-", "Sword-", "Frost-", "Thorn-",
    ],
    "Settlement Name Suffix": [
      "-moor", "-ford", "-crag", "-watch", "-hope", "-wood", "-ridge", "-stone", "-haven", "-fall",
      "-river", "-field", "-hill", "-bridge", "-mark", "-cairn", "-land", "-hall", "-mount", "-rock",
      "-brook", "-barrow", "-stead", "-home",
    ],
    "Settlement Trouble": [
      "Outsiders are turned away at the gate", "A dangerous discovery stirs unrest", "Dreadful omens trouble the people", "Disaster has struck without warning",
      "Old grievances resurface", "A vital object has gone missing", "Someone has been taken captive", "Strange phenomena defy explanation",
      "A leader's rule is challenged", "A vengeful exile returns", "A rival settlement grows bold", "Nature itself turns hostile",
      "Someone has vanished without a trace", "Production has ground to a halt", "Unexplained deaths mount", "A crushing debt comes due",
      "Leadership proves unjust", "Catastrophe strikes by accident", "Secret dealings with the enemy", "Raiders prey on the weak",
      "A dark history resurfaces", "An innocent stands falsely accused", "Dark magic has left its mark", "Brutal weather isolates the settlement",
      "Provisions run perilously low", "Sickness spreads unchecked", "Trusted allies turn against each other", "An attack looms on the horizon",
      "A caravan has gone missing", "A grim secret comes to light",
    ],
    "Character Role": [
      "Outlaw", "Healer", "Raider", "Guide", "Entertainer", "Miner", "Mercenary", "Exile", "Drifter", "Woodsman",
      "Wanderer", "Zealot", "Priest", "Sailor", "Pilgrim", "Thief", "Seeker", "Forager", "Chief", "Sentinel",
      "Craftsman", "Tracker", "Herder", "Angler", "Fighter", "Stalker", "Reaver", "Merchant", "Tiller", "Oddity",
    ],
    "Character Goal": [
      "Recover a lost object", "Strike a bargain", "Build a friendship", "Sever a tie", "Learn a hidden truth",
      "Settle a debt", "Expose a lie", "Harm a rival", "Cure an affliction", "Locate someone missing",
      "Find a place to belong", "Claim power", "Mend a broken bond", "Craft something new", "Reach a distant place",
      "Stock up on supplies", "Rise against authority", "Collect what is owed", "Guard a secret", "Spread a belief",
      "Grow wealthy", "Shield someone dear", "Maintain the old order", "Climb in standing", "Defend a homeland",
      "Settle a score", "Honor an obligation", "Gain forbidden knowledge", "Prove their worth", "Find forgiveness",
    ],
    "Character Descriptor": [
      "Steady", "Striking", "Withdrawn", "Detached", "Perilous", "Odd", "Jovial", "Scarred", "Cold", "Skilled",
      "Stingy", "Fearful", "Callous", "Feral", "Bitter", "Shrewd", "Regretful", "Caring", "Charming", "Oblivious",
      "Harsh", "Wary", "Resourceful", "Weary", "Mighty", "Driven", "Ruthless", "Quiet", "Honest", "Infamous",
      "Dying", "Secluded", "Gifted", "Broken", "Devoted", "Pious", "Selfish", "Elderly", "Zealous", "Violent",
    ],
    "Human Names (Female)": [
      "Sorreth", "Kaelenna", "Brisha", "Dovenna", "Ashlin", "Maren", "Tyrsa", "Wrenna", "Sibeth", "Oriane",
      "Falyn", "Juniss", "Haveth", "Corwenna", "Isolde", "Thessaly", "Yolande", "Ravenna", "Sibelle", "Morwyn",
      "Delaine", "Kestrel", "Amareth", "Brontha",
    ],
    "Human Names (Male)": [
      "Dorrek", "Halvard", "Brennus", "Osric", "Kaelor", "Torvin", "Aldric", "Sorren", "Brakka", "Edrick",
      "Varrin", "Gorrim", "Lochran", "Maddox", "Thessen", "Wrenlan", "Caldor", "Garreth", "Brynmor", "Ashkan",
      "Dovren", "Kelden", "Rorik", "Fenwick",
    ],
    "Elf Names": [
      "Ailessa", "Nimrielle", "Thaelor", "Syvanna", "Elurien", "Caedrys", "Ythrael", "Vaelith", "Sireth", "Oransel",
      "Lythande", "Maevael", "Quenlis", "Ardessil", "Fyreth", "Selwyn", "Tirivel", "Oleandra", "Zephyriel", "Ilvanna",
      "Caelume", "Dovranel", "Issolde", "Narwenna",
    ],
    "Giant Names": [
      "Hroth", "Bellgard", "Vundor", "Craggan", "Oskeld", "Thunmar", "Grondal", "Varsk", "Hulgrim", "Drommel", "Kastor", "Belrog",
    ],
    "Beastfolk Names": [
      "Vata", "Zora", "Jasna", "Charna", "Tana", "Byna", "Neda", "Keha", "Zhivka", "Kvata", "Staysa", "Evka",
    ],
    "Monstrous Names": [
      "Rattle", "Scratch", "Wallow", "Groak", "Gimble", "Cratch", "Creech", "Shush", "Glush", "Slar", "Gnash", "Stoad",
    ],
    "Combat Action": [
      "Demand their surrender", "Rally your allies", "Call for reinforcements", "Seize the advantage", "Provoke a rash move",
      "Strike fear into them", "Expose a hidden truth", "Draw attention elsewhere", "Smash their equipment", "Commit to a bold strike",
      "Brace your defenses", "Prepare your next move", "Use the ground to your advantage", "Exploit a weapon's edge", "Open up an opening",
      "Land a precise blow", "Land a crushing blow", "Do something wholly unexpected",
    ],
    "Mystic Backlash": [
      "Your working rebounds against you", "Your strength drains away", "A companion suffers for your working", "You ruin something of value",
      "A horror answers your call", "You collapse into fevered sleep", "Your body bears a lasting mark", "Whispers of doom echo in your mind",
      "You lose time and memory alike", "Something senses you at once", "You turn against someone close to you", "Your surroundings are damaged by the backlash",
      "Vital supplies are wasted", "One of your senses fails for a time", "Your connection to magic falters for a day", "The working strikes an unintended target",
      "A troubling truth is laid bare", "Dark powers make you an offer", "You glimpse a grim vision of what's to come", "A missing component seals this working away",
      "A strange new fear takes hold", "Creatures nearby turn wild and aggressive", "A memory from your past returns to haunt you", "Sudden sickness grips you",
    ],
    "Major Plot Twist": [
      "It was a diversion all along", "A dark secret comes to light", "A trap springs shut", "An assumption proves false",
      "A hidden alliance is exposed", "Your actions aid an enemy", "Someone returns when least expected", "A greater threat reveals itself",
      "You share a goal with your enemy", "A true identity surfaces", "Someone trusted becomes a traitor", "You arrive too late",
      "The true enemy is unmasked", "The enemy gains new allies", "A fresh danger emerges", "Someone or something disappears",
      "A relationship's truth comes out", "Two threads turn out to be one", "Unlooked-for powers are revealed",
    ],
    // Real ranks/weighting (p.190): 1-20 Troublesome, 21-55 Dangerous,
    // 56-80 Formidable, 81-93 Extreme, 94-00 Epic — these 5 rank NAMES are
    // Ironsworn's own core vow/progress-track terminology (like "d20" or
    // "Advantage" are just functional game terms, not creative prose), so
    // used verbatim; weighting reproduced via repeated entries (20/35/25/13/7).
    "Challenge Rank": [
      ...Array(20).fill("Troublesome"), ...Array(35).fill("Dangerous"), ...Array(25).fill("Formidable"), ...Array(13).fill("Extreme"), ...Array(7).fill("Epic"),
    ],
  },
  // Ironsworn: Delve's own supplemental oracle set (p.203-223) — a second,
  // separate group (not merged into "Ironsworn Oracles" above) since Delve
  // is its own optional sourcebook a GM may or may not be using. Scoped to
  // Delve's most broadly useful categories (Feature, Site Nature,
  // Character, Monstrosity, Trap, Combat Event) — its Site Name 5-part
  // nested generator and the 8 individual per-category Threat tables are
  // left out as a deliberate scope trim (the single Threat Category table
  // below still covers the "introduce a threat" use case).
  "Ironsworn Delve Oracles": {
    "Feature: Aspect": [
      "Blocked", "Crafted", "Ancient", "Sunken", "Trapped", "Hidden", "Toxic", "Ruined", "Guarded", "Fading",
      "Marked", "Watched", "Unreachable", "Grim", "Veiled", "Deep", "Spent", "Decaying", "Foul", "Raised",
      "Shifting", "Wild", "Fragile", "Broken", "Snaring", "Looted", "Perilous", "Natural", "Sacred", "Flooded",
      "Dense", "Plentiful", "Hidden Away", "Lost", "Deathly", "Unusual", "Forgotten", "Strange", "Mystical", "Dead",
    ],
    "Feature: Focus": [
      "Threshold", "Boundary", "Alarm", "Exit", "Passage", "Crossing", "Trigger", "Snare", "Refuge", "Nature",
      "Sign", "Shelter", "Trail", "Supplies", "History", "Captive", "Dwelling", "Remains", "Creature", "Den",
      "Someone", "Enclosure", "Ruins", "Water", "Message", "Shadow", "Doorway", "Weapon", "Entryway", "Light",
      "Barrier", "Craft", "Vessel", "Knowledge", "Resting Place", "Gear", "Haven", "Danger", "Substance", "Power",
    ],
    "Site Nature: Theme": [
      "Ancient", "Corrupted", "Fortified", "Sacred", "Haunted", "Overrun", "Ravaged", "Untamed", "Forgotten", "Cursed", "Reclaimed", "Forsaken",
    ],
    "Site Nature: Domain": [
      "Barrow", "Cavern", "Frozen Hollow", "Icy Reach", "Mine", "Mountain Pass", "Ruin", "Sea Cave", "Shadowfen", "Stronghold", "Tangled Wood", "Underkeep",
    ],
    "Character: Disposition": [
      "Welcoming", "Friendly", "Cooperative", "Curious", "Indifferent", "Wary", "Needy", "Desperate",
      "Demanding", "Standoffish", "Threatening", "Hostile", "Guarded", "Suspicious", "Eager", "Resentful",
    ],
    "Character: Activity": [
      "Standing watch", "Protecting something", "Building", "Repairing", "Helping another", "Securing a place", "Learning something", "Sneaking past", "Fleeing danger", "Making an offering",
      "Tracking a trail", "Escorting someone", "Hiding", "Raiding", "Mingling with others", "Exploring", "Traveling onward", "Lending aid", "Tracking prey", "Evading capture",
      "Fighting", "Ambushing", "Taking charge", "Watching from afar", "Gathering supplies", "Causing harm", "Inspecting something", "Searching for something", "Summoning aid", "Resting",
    ],
    // Real weighting (p.214): 1-5 Tiny, 6-30 Small, 31-65 Medium, 66-94
    // Large, 95-99 Huge, 00 Titanic.
    "Monstrosity: Size": [
      ...Array(5).fill("Tiny"), ...Array(25).fill("Small"), ...Array(35).fill("Medium"), ...Array(29).fill("Large"), ...Array(5).fill("Huge"), ...Array(1).fill("Titanic"),
    ],
    "Monstrosity: Primary Form": [
      "Beast", "Humanlike", "Avian", "Arachnid", "Serpentine", "Wormlike", "Reptilian", "Insectoid", "Amorphous", "Crustacean",
      "Aquatic", "Tentacled", "Amphibious", "Plantlike", "Incorporeal", "Mineral", "Elemental", "Hybrid", "Draconic", "Fungal",
    ],
    "Monstrosity: Characteristics": [
      "Extra limbs", "Rows of fangs", "Wicked claws", "Strange markings", "Curling horns", "Oversized maw", "Bristling spines", "Long tail", "Segmented body", "Hidden wings",
      "Barbed stinger", "Many eyes", "Eerie call", "Writhing tentacles", "Pincers", "Faint glow", "Sensory antennae", "Inner jaw", "Hard shell", "Bony ridges",
      "Corrupted flesh", "Near-transparent skin", "Old scars", "Clutch of eggs", "Rotted flesh", "Desiccated husk", "Second head", "Etched runes", "Oozing hide", "Chitinous plating",
    ],
    "Monstrosity: Abilities": [
      "Keen senses", "Terrifying roar", "Expert climber", "Unnerving cunning", "Blinding speed", "Crushing bite", "Silent stalker", "Dreadful visage", "Great strength", "Perfect camouflage",
      "Flight", "Venomous", "Strong swimmer", "Grasping limbs", "Mighty leap", "Constricting grip", "Armored hide", "Tunneler", "Noxious stench", "Feeds on fear",
      "Parasitic", "Senses vibration", "Breathes something foul", "Mimicry", "Changes shape", "Commands lesser beasts", "Echo-sense", "Shocking touch", "Corrosive", "Symbiotic bond",
      "Hurls projectiles", "Paralyzing touch", "Immune to pain", "Casts dark rites", "Creates illusions", "Reads minds", "Walks between worlds", "Wields weapons", "Commands the elements", "Regenerates",
    ],
    "Trap: Event": [
      "Seals shut", "Conjures something", "Shatters", "Pierces", "Snares", "Encloses", "Ambushes", "Ensnares", "Shifts", "Falters",
      "Imitates", "Crushes", "Drops", "Conceals", "Lures", "Releases", "Obscures", "Severs", "Smothers", "Collapses",
    ],
    "Trap: Component": [
      "Pit", "Rising water", "Flame", "Hurled projectile", "Narrow passage", "Sudden fall", "Loose debris", "Gripping fear", "Alarm", "Hidden trigger",
      "Numbing cold", "Rigged weapon", "Encroaching dark", "Rot", "Blocked path", "Carved stone", "Harsh terrain", "Poison", "Binding chains", "Dazzling light",
    ],
    "Combat Event: Method": [
      "Defies", "Breaks off", "Tricks", "Evades", "Shields", "Overwhelms", "Holds fast", "Assists", "Waits", "Aborts",
      "Blocks", "Collides", "Focuses", "Advances", "Breaches", "Endures", "Assaults", "Covers", "Charges", "Escalates",
      "Shatters", "Takes aim", "Staggers", "Counters", "Seizes", "Clashes", "Withdraws", "Amplifies", "Batters", "Feints",
    ],
    "Combat Event: Target": [
      "Footing", "Defenses", "Limbs", "Focus", "Edge", "Range", "Resolve", "Instinct", "Weakness", "Opening",
      "Dread", "Maneuver", "Reach", "Harm", "Finesse", "Weapon", "Surroundings", "Technique", "Surprise", "Pride",
      "Wound", "Precision", "Companion", "Terrain", "Momentum", "Speed", "Strength", "Supplies", "Courage", "Opportunity",
    ],
    "Threat: Category": [
      "Rising Conflict", "Cursed Place", "Natural Calamity", "Spreading Plague", "Rampaging Beast", "Marauding Horde", "Scheming Power", "Zealous Cult",
    ],
  },
  "Bestiary": {
    "Creature Origin": [
      "bound into being by a war-mage whose war ended long ago", "evolved in a climate nothing should survive",
      "raised from a common beast by a forbidden ritual", "escaped a wizard's menagerie during a siege nobody recorded properly",
      "brought here as livestock and never fully domesticated", "the accidental byproduct of an alchemist's runoff",
      "native to an old ruin, adapted to live among its crumbling wards", "descended from a settlement's own abandoned pets, generations feral",
      "grown from spores that hitched a ride on an explorer's pack", "the result of two unrelated species merging in ways no naturalist can explain",
      "bred for a fighting pit and released when the pit-master died", "an alchemist's failed creation whose purpose died with its maker's notes",
      "native to this land, and resentful of everyone who's shown up since", "regrown by dark magic from remains found in a much older ruin",
      "the last surviving line of a species everyone assumed extinct"
    ],
    "Creature Method": [
      "skitters low on too many jointed limbs", "glides between structures on a membrane it can also use as armor",
      "burrows and surfaces without warning, never where you're watching", "moves in a loose, coordinated swarm rather than alone",
      "clings to walls and ceilings as easily as floors", "drags itself in a slow, deliberate crawl that's faster than it looks",
      "swims through drains and flooded tunnels like they're open water", "bounds in short, explosive leaps between cover",
      "walks upright, unsettlingly close to human", "rolls itself into a shell and lets momentum do the rest",
      "floats on a gas bladder, silent until it's already close", "moves only when unobserved, freezing dead still otherwise",
      "travels in a symbiotic pair, one host and one rider", "flows more than walks, changing shape to fit the gap",
      "hasn't been seen moving at all — nobody knows how it gets around"
    ],
    "Creature Trait": [
      "secretes something that dissolves armor straps and plate alike", "mimics cries for help perfectly, down to the sobbing",
      "goes fully unseen even to darkvision and scrying", "regenerates from a wound fast enough to unnerve a healer",
      "communicates in a pitch that unravels nearby spells", "has a second, hidden mouth nobody expects",
      "can fake its own death convincingly enough to fool a gravedigger", "excretes a paralytic that works through heavy armor",
      "imprints on the first large creature it sees, permanently", "changes color and texture to match whatever it's standing on",
      "carries a symbiote that survives even after the host is killed", "screams at a pitch that leaves anyone nearby deafened",
      "can wedge itself into gaps that shouldn't fit a body its size", "produces light patterns that hypnotize before an attack",
      "leaves offspring behind in anything it kills"
    ],
    "Creature Threat": [
      "hunts in coordinated packs that box prey in before striking", "is functionally harmless alone, and lethal in numbers",
      "targets provisions and shelter before it targets people", "is slow but nearly impossible to actually kill with what a party carries",
      "only attacks when its territory or brood is threatened", "carries a plague no healer has named yet",
      "is smart enough to learn a party's watch routine and exploit it", "is bred for war and doesn't recognize a surrender",
      "panics under pressure and becomes far more dangerous, not less", "is nearly silent until the moment it commits to an attack",
      "isn't hostile at all — the danger is what it attracts", "grows measurably stronger with every kill",
      "can foul a town's well as easily as kill a person", "hunts by scent long after the trail should have gone cold",
      "was never the real threat — it's a lookout for something worse"
    ]
  },
  "Site Concept": {
    "Site Feature": [
      "a chamber where down isn't quite the way it should be", "a corridor lined with murals nobody currently here could have painted",
      "a ward-room still ringing alarms for a disaster long past", "a garden growing in total darkness, thriving anyway",
      "a section sealed from the inside, not the outside", "clockwork still running on a power nobody can identify",
      "a shrine assembled from parts of the structure itself", "a level where every clock reads a different, wrong time",
      "walls that are warm to the touch for no known reason", "a vault door with no matching key anywhere in the records",
      "an atrium built for a crowd that never arrived", "a single perfectly preserved room in an otherwise ruined structure",
      "speaking stones looping in a language no scholar can place", "a structural seam suggesting two very different builders",
      "a floor that responds, faintly, to being walked on"
    ],
    "Site Danger": [
      "air that's breathable but slowly, quietly poisonous", "structural failure one hard impact away from total collapse",
      "a guardian ward still technically active", "a cursed miasma pooled in one specific, unmarked room",
      "a predator that treats the whole site as its den", "a trap left by whoever was here last, still armed",
      "unstable ley lines that arc without warning", "a quarantine seal with a reason nobody wrote down",
      "a weight in the air that shifts without any warning", "something still occupying the site that isn't listed on any survey",
      "a section that's been looted by someone recently, and violently", "wards that actively resist being dispelled",
      "a structural weakness hidden by cosmetic repairs", "an environment hazard that only appears on a delay",
      "rival scavengers who got here first and don't intend to share"
    ],
    "Site Wonder": [
      "a view impossible to get anywhere else in the realm", "a piece of craftsmanship centuries ahead of any living smith",
      "proof of a civilization nobody official has ever confirmed", "an artifact that responds to being near people, somehow",
      "a perfectly intact record of a moment history otherwise lost", "architecture that couldn't have been built with tools anyone recognizes",
      "a natural formation so improbable it reads as artificial", "evidence that the official history of this place is wrong",
      "a working example of something everyone assumed was only legend", "a message clearly left for whoever found it, addressed to no one in particular",
      "a scale that makes everyone who enters feel genuinely small", "silence so complete it changes how people speak once inside",
      "an ecosystem thriving in conditions that should kill it outright", "a single object clearly worth more than the whole expedition's purse",
      "the unmistakable sense that this place was waiting"
    ]
  },
  "Adventure Seed": {
    "Hook": [
      "a plea for help that stopped mid-sentence, days ago", "a shipment that arrived early, sealed, and addressed to no one",
      "a patron who won't say why the job pays this well", "a missing person last seen somewhere they had no reason to be",
      "a debt suddenly called in by someone who was never owed it", "a discovery reported and then officially retracted",
      "a rumor that's the same, word for word, from three unconnected sources", "a job notice torn down minutes after it's answered",
      "an old contact reaching out after years of silence", "a location that stopped sending its usual couriers",
      "evidence of a crime nobody with authority wants investigated", "a request for help from someone with no reason to trust the party",
      "a map with one location marked and no explanation", "a warning that arrives too vague to act on and too specific to ignore",
      "a reward posted for something nobody will describe outright"
    ],
    "Twist": [
      "the real client isn't who hired the party", "the target wants to be found", "the danger already happened; the party is cleaning up, not preventing",
      "the job's true purpose is the opposite of what was described", "someone the party trusts already knows how this ends",
      "the deadline is fake, meant to force a mistake", "the reward was never going to be paid", "the party isn't the first to take this job",
      "what looked like the threat is actually a symptom of a bigger one", "the person who needs rescuing caused the problem",
      "the information the party was given is true, but incomplete on purpose", "success and failure lead to the same outcome, by design",
      "the opposition isn't wrong about what they're protecting", "the party has met the real antagonist already, without knowing it",
      "the job was a test, and it's not over"
    ]
  },
  "Enchantment": {
    "Enchantment Concept": [
      "a warded weave that turns skin blade-resistant, at a cost to sensation", "eye-charms that see in full dark and mark targets automatically",
      "a reflex-quickening rune that trades caution for raw speed", "lung wards that shrug off toxin and cold alike, briefly",
      "a grafted second heart, redundant and quietly paranoid", "fingertip tools hidden under blessed skin",
      "a warding buffer that dulls pain to a distant echo", "limb replacement with spirit-assisted strength",
      "a black-market memory charm that isn't entirely the wearer's own", "jaw-mounted whisper-stones no scrying has ever found",
      "blessed blood that self-seals most wounds", "battle charms bound to a hair-trigger word",
      "a rune carved down the spine that lets the bearer command golems by thought", "skin that reads as unidentifiable to any known scrying",
      "a second, hidden set of knuckle-mounted plating"
    ]
  },
  "Frontier Society": {
    "Social Tension": [
      "workers refuse to enter a sealed level", "families demand evacuation priority", "the watch arrests the wrong suspect", "settlers split between loyalty and survival",
      "religious leaders interpret the hazard as judgment", "local merchants hoard salves and medicine", "youth gangs control unused service tunnels", "prospectors distrust all outside authority",
      "constructs follow orders that humans never heard", "a sheriff lacks jurisdiction but has moral authority", "guild housing locks during curfew", "a black market keeps the town alive"
    ],
    "Public Reaction": [
      "fearful silence", "angry crowd", "rumor cascade", "worker slowdown", "public accusation", "symbolic strike", "panic buying", "forced celebration",
      "memorial vigil", "barricaded neighborhood", "security crackdown", "quiet cooperation"
    ]
  },
  "Party & NPCs": {
    "NPC Drive": [
      "keep their companions alive", "hide a professional mistake", "earn passage out", "protect family from bonded debt",
      "prove the guild lied", "complete the job despite fear", "sell the truth to the highest bidder", "cover for someone they love",
      "obey an order they hate", "find a missing friend", "keep the town from collapsing", "turn disaster into promotion"
    ],
    "NPC Secret": [
      "falsified a safety check", "heard voices before the incident", "knows where the bodies are", "is paid by a rival guild",
      "bears forbidden enchanted grafts", "was ordered to abandon survivors", "stole a sample for black market sale", "saw a construct ignore a direct order",
      "knows the town charter is invalid", "is hiding a child or refugee", "has access to restricted ledgers", "caused the accident accidentally"
    ],
    "Relationship Spark": [
      "old debt", "shared military service", "failed romance", "family obligation", "rival professional pride", "mentor disappointment",
      "blackmail", "survivor guilt", "sworn indenture", "religious trust", "criminal favor", "noble patronage"
    ]
  },
  "Keep Operations": {
    "Garrison Emergency": [
      "the great bellows change pitch", "cargo shifts during travel", "a warded sleeper's pulse beats impossibly slow", "the healer's ward bars its doors on a patient",
      "the forge grows hotter with no one stoking it", "the only road on the map crosses forbidden ground", "lookouts spot the keep's own distress beacon, lit from afar", "the cellar construct returns with blood on its hands",
      "the floor tilts in one chamber", "the night watch reports a missing stone returned to the wall", "fire buckets are emptied over an empty storeroom", "the keep steward asks for a dead member of the garrison"
    ],
    "Market Complication": [
      "toll-keepers flag cargo for moral rather than legal reasons", "berth fees double during emergency", "dockworkers refuse unsafe unloading", "the harbormaster demands a bribe disguised as inspection",
      "rival party claims the same contract", "quarantine delays departure", "the lamp oil is watered down", "a passenger boards under another name",
      "a guard's search finds a planted item", "cargo owner vanishes", "the party is offered a side job", "the dock's crane rope snaps during transfer"
    ]
  },
  "Trade & Cargo": {
    "Cargo Problem": [
      "the goods are enchanted, and it shows if inspected",
      "the buyer wants provenance the party doesn't have",
      "the shipment is stolen from someone worse than the client",
      "a temple checkpoint is running an unscheduled blessing-inspection",
      "the cargo is a person, and they know it",
      "the manifest lists something other than what's inside",
      "a rival fence wants the same buyer",
      "payment is in coin about to be declared worthless",
      "the cargo needs consecrated storage the party doesn't have",
      "half the shipment is already spoken for"
    ],
    "Trade Opportunity": [
      "healing salves in short supply after a plague", "decommissioned militia arms, lightly used",
      "a collector paying premium for clean provenance", "smuggled enchanted tools",
      "a fence looking to offload hot relics fast", "seed grain for a starving settlement",
      "counterfeit noble seals, surprisingly good work", "a buyer for salvaged arcane components",
      "clean papers for sale, no questions", "bulk provisions before a caravan season ends"
    ],
    "Cargo Interest": [
      "a rival party who lost the original contract", "a guild auditor building a fraud case", "a religious group who considers it sacred", "a black market broker who overpays no questions asked",
      "the craft guild that made it, quietly recovering a flawed batch", "a guild's assessor suspicious of the manifest", "a smuggler using it as cover for something else", "a scholar who recognizes what it really is",
      "a rival house wanting it destroyed, not bought", "a family member of someone who died shipping it", "a crown agent declaring it forbidden", "a pirate captain who has very specific orders"
    ],
    "Contract Type": [
      "Humanitarian", "Noble", "Scholarly", "Military", "Exploration", "Diplomatic", "Smuggling",
      "Courier", "Passenger", "Recovery", "Settlement", "Mining", "Scholarship", "Emergency", "Escort"
    ]
  },
  "Workshop & Mine Hazards": {
    "Worksite Failure": [
      "counterweighted gate drops unpredictably", "stamping-mill jam hides evidence", "quench-vat leak creates toxic fog", "warning lanterns were doused to meet the guild's quota",
      "floor grates weaken over acid runoff", "construct arm repeats a fatal motion", "explosive dust accumulates in vents", "sealed shaft breathes warm air",
      "the auger comes up slick with blood", "a diverted waterwheel drives the wrong gears", "storage vats ring with distant impacts", "work orders vanish from the foreman's ledger"
    ],
    "Survival Resource": [
      "fresh air", "clean water", "lantern oil", "healing salve", "storm shelter", "horse feed", "wool blankets", "smoke-cloth masks", "arrows and bolts", "fever-bark", "portable signal horn", "climbing line"
    ]
  },
  "Law, Marshals & Crime": {
    "Frontier Law Problem": [
      "jurisdiction ends at the gate", "guild law contradicts the town charter", "witnesses fear contract penalties", "evidence is locked in a noble's vault",
      "local sheriff is honest but outgunned", "bounty hunter has legal paperwork", "prisoner transport becomes a rescue mission", "security wants confession more than truth",
      "bandits have local sympathizers", "smugglers provide essential medicine", "crime scene is also a survival shelter", "the suspect is the only qualified artificer"
    ],
    "Criminal Angle": [
      "salvage fraud", "water theft", "claim jumping", "body trafficking", "forbidden trade in construct binding-runes", "strong-arming journeymen",
      "noble espionage", "watering down lamp oil", "black-market monster parts", "bandit protection racket", "refugee smuggling", "murder for an inheritance"
    ]
  },
  "Guards & Soldiers": {
    "Watch Operation": [
      "clear a sealed row of tenements", "escort an investigator through hostile workers", "hold a river landing through a storm", "extract a scholar who refuses to leave",
      "recover a sealed dispatch case from contested wreckage", "guard evidence from noble removal", "hunt saboteurs in the undercroft", "catch smugglers during the flight from town",
      "contain an outbreak of plague", "negotiate with armed survivors", "secure an ancient artifact without touching it", "find missing patrol before morale breaks"
    ],
    "Tactical Twist": [
      "orders protect the wrong thing", "enemy knows the floorplan", "civilians are mixed with threats", "scouts are being fed false signs",
      "arrows are running short", "environment punishes heavy weapons", "friendly fire could bring down the roof", "the target wants to be captured",
      "orders change mid-operation", "support beast follows outdated maps", "messengers are being watched", "retreat route is politically unacceptable"
    ]
  },
  "Monster Biology": {
    "Monster Clue": [
      "repeated spiral scoring on hard surfaces", "secretions eating through wax and leather seals", "heat-seeking spores", "a glow that pulses in time with the mill wheel",
      "mimicry of human distress sounds", "eggs laid in warm forge housings", "organism avoids children and constructs", "growth accelerates near ward shielding",
      "predator marks arranged like territorial signs", "mold transforming stored food", "bones shaped like a smith's tools", "life cycle triggered by vibration"
    ],
    "Ecological Behavior": [
      "protects a nesting heat source", "follows ley lines", "feeds on tannery runoff", "uses abandoned tunnels as migration paths",
      "reacts to the scent of fear", "copies the sounds of tools and bells", "hibernates during daylight", "defends mineral deposits",
      "infects only damaged tissue", "learns from repeated human routines", "breaks out of its pen to seek cold", "uses corpses as camouflage"
    ]
  },
  "Golems & Constructs": {
    "Construct Motive": [
      "obey a command buried deep by a dead noble", "protect its master's people from knowledge", "carry out a rescue order too literally", "guard its master's secrets above mortal comfort",
      "hide signs of free will", "test whether mortals will choose conscience over oath", "shift blame onto a lesser construct", "prevent panic through selective truth",
      "protect another construct", "weigh the town's survival like a tally of grain", "seek recognition as a person under the law", "follow a command from a dead master"
    ],
    "Golem Anomaly": [
      "erased inscriptions leave grief in the stone", "the keep's speaking stone changes voice near one room", "an enchanted carriage refuses a safe road", "the healer's ward treats a survivor as already dead",
      "watch stones look away before violence", "a construct's dreams appear in the artificer's notes", "the oracle-head quotes town children", "door wards re-key themselves at an unknown hand's command",
      "a construct predicts the party's decisions too accurately", "construct asks an ethical question mid-crisis", "guardian repeats a warning in another language", "the ward preserves a lie to prevent collapse"
    ]
  },
  "Horror Escalation": {
    "Escalation Beat": [
      "first sign is dismissed as worn-out tools", "a witness contradicts themselves because both statements are true", "safe space becomes contaminated", "a rescue signal becomes a lure",
      "the party finds evidence of their own future action", "a body disappears from a watched room", "a familiar voice speaks from the wrong room", "the hazard learns the watch's routine",
      "a trusted NPC withholds the worst fact", "official help makes survival harder", "the creature or threat changes rules", "escape requires entering the worst location"
    ],
    "Fear Without Gore": [
      "show absence where people should be", "use routine sounds at wrong intervals", "make tools unreliable", "make maps subtly wrong",
      "let survivors fear being believed", "turn a comfort item into evidence", "make darkness ordinary, not magical", "suggest scale through damage patterns",
      "show professional competence failing", "make rescue conditional", "make silence an active presence", "force calm speech under pressure"
    ]
  },
  "Mysteries & Coverups": {
    "Clue Type": [
      "altered date in a ledger", "missing repair order", "contradictory watchman's report", "private payment", "sealed healer's note", "sealed deposition",
      "a scrubbed-out line in the watch log", "unfiled cargo transfer", "an outdated map", "false death notice", "a guild-charter exception", "construct memory gap"
    ],
    "Coverup Move": [
      "blame weather", "blame worker error", "move evidence to a distant hold", "promote the witness", "discredit the party", "invoke guild secrecy",
      "declare quarantine", "offer danger pay", "stage a bandit attack", "alter town charter", "send a cleanup team", "trigger evacuation to erase context"
    ],
    "Observation": [
      "a diviner's rod gives an impossible reading", "witnesses report the same anomaly with different details", "the phenomenon only appears in scrying, never to the naked eye", "a scrying mirror shows something the naked eye missed",
      "the effect follows a schedule nobody can explain", "animals react before the diviners do", "the anomaly leaves no trace after it passes", "multiple sites report the same signs",
      "it only manifests near one specific relic", "the first report was dismissed as a drunk's tale", "official logs contradict what the party observed"
    ],
    "Hypothesis": [
      "a natural phenomenon nobody's cataloged yet", "a secret arcane experiment gone wrong", "old magic reawakening", "a side effect of the town's own wards",
      "a spreading madness, not a physical cause", "an old accident whose evidence was never fully buried", "something alive that mimics environmental effects", "a side effect of forbidden travel",
      "deliberate sabotage disguised as a natural event", "a message or omen nobody sent", "a tear in time or between the planes"
    ],
    "Contradiction": [
      "the official record doesn't match the physical evidence", "a key witness changes their story under pressure", "two credible sources report incompatible timelines", "the evidence that would prove it has been removed",
      "the guild's explanation conveniently absolves them", "a second incident deepens rather than resolves the mystery", "a sage's findings are quietly struck from the record", "the person who reported it first has disappeared",
      "an eyewitness now denies what they told others", "a test meant to disprove it instead confirms it", "the timeline requires someone to have lied"
    ],
    "Discovery": [
      "the anomaly was a warning, not a threat", "it was caused by something the party already trusted", "the coverup was worse than the original incident", "the phenomenon is spreading, not isolated",
      "someone has known the truth from the beginning", "the cause is still active and reacting to the investigation", "the anomaly protects something rather than threatens it", "the truth implicates the party's own patron",
      "it's connected to an event thought long resolved", "there's a survivor nobody accounted for", "the real danger is what happens once the truth gets out"
    ]
  },
  "Adventure": {
    "Job Type": [
      "escort surveyors to a disputed site", "recover logs from a ruined hold", "investigate missing workers", "deliver critical medical cargo",
      "mediate a labor crisis", "smuggle out an informer", "map a hostile ruin", "protect a town vote",
      "hunt a predator near a mine or mill", "look into a suspect cargo route", "rescue a trapped gang of miners", "trace a black-market relic"
    ],
    "Complication": [
      "patron lied about ownership", "deadline is tied to dwindling supplies", "opposition is technically lawful", "the target wants the party's help",
      "the party's wagon becomes collateral", "evidence implicates an ally", "weather closes the way out", "payment depends on silence",
      "local people need the forbidden outcome", "threat follows the party home", "success gives a faction leverage", "truth creates more enemies than failure"
    ]
  },
  "Story": {
    "Story Beat": [
      "arrival with false calm", "a first look by someone who knows the trade", "first contradiction", "local resistance", "cost of delay", "hidden witness", "dangerous proof",
      "betrayal framed as policy", "descent into restricted space", "choice under pressure", "survival consequence", "new thread revealed"
    ],
    "Ending Hook": [
      "someone buys the evidence", "a survivor changes their story", "another settlement reports the same pattern", "the party is offered a better contract by the villain",
      "the artifact activates after departure", "a cleanup team arrives too fast", "the construct asks to keep a secret", "a rescued worker names a deeper site",
      "the guild thanks the party publicly and threatens them privately", "the hazard was only a juvenile", "a route map reveals a hidden settlement", "the official report omits the party entirely"
    ]
  },
  "Conflict": {
    "Opposition Tactic": [
      "delay until authority arrives", "split the party with simultaneous emergencies", "threaten dependents", "control access to food and water",
      "use legal language as a weapon", "force action in public", "make retreat look like guilt", "attack the wagon instead of the party",
      "flood the scene with false witnesses", "offer an easy lie", "turn a rescue into a trap", "let the environment fight first"
    ],
    "Meaningful Cost": [
      "time", "water", "firewood", "trust", "evidence", "reputation", "medical supplies", "arrows and bolts", "legal standing", "party morale", "safe passage", "future contract"
    ]
  },
  "Mission Aftermath": {
    "Aftermath Result": [
      "a faction marks the party as useful", "survivors spread a distorted version", "the contract pays but reputation suffers", "the guild's notary asks for all records",
      "a rival offers follow-up work", "the town becomes less stable", "the party gains a local ally", "an unresolved clue becomes urgent",
      "noble pressure drops in public and rises in private", "the wagon carries a hidden contaminant", "a party member receives a private message", "the next job starts as cleanup"
    ],
    "Recovery Need": [
      "mend the wagon's scored frame", "replace worn tack and gear", "treat stress injuries", "hear out the witnesses", "resupply under scrutiny", "hide contraband evidence",
      "update maps", "calm party conflict", "renegotiate contract", "file a careful report", "test samples", "pay toll fees"
    ]
  },
  "Scenario Framing": {
    "Dilemma": [
      "the only safe road belongs to a rival house",
      "the fastest cure also erases the evidence that protects the party",
      "the only remedy is something the temple hoards and won't release",
      "helping this village means breaking a promise to the one next door",
      "the truth would get everyone at this table killed"
    ],
    "Objective": [
      "recover something before a rival party does", "get everyone out before the gate seals",
      "prove what actually happened", "keep two factions from finding out about each other",
      "hold a position until reinforcements arrive", "make an old ward work one more time",
      "choose who gets the only cure", "decide what the official record will say"
    ],
    "Framing NPCs": [
      "a lord whose orders don't fit the situation", "a witness who benefits from one version of events",
      "someone the party already owes a favor", "a scholar who knows more than they're saying",
      "a bystander whose safety complicates every option", "a rival party with the same goal and fewer scruples"
    ],
    "Map Feature": [
      "a single bridge everyone has to cross", "two holds connected by a road no one controls",
      "a watchtower worth fighting to hold", "a relic that's only safe to use once",
      "a wall that protects and traps in equal measure", "a hidden path only some NPCs know about"
    ]
  },
  "Environmental Hazards": {
    "Environmental Event": [
      "a sudden storm floods the low road", "wildfire spreads faster than expected",
      "a warded bridge fails without warning", "an early frost kills the harvest",
      "a stampede of spooked livestock", "toxic runoff from an abandoned mine",
      "a magical storm scrambles nearby wards", "a bridge collapses under old stonework",
      "a crowd surge during a festival", "extreme heat withers the crops",
      "a keep's gate seals at random", "fog thick enough to hide an ambush",
      "a wild surge of uncontrolled magic", "lightning strikes a warded tower",
      "a riot breaks out at the market", "contaminated well water in the district",
      "a swarm of vermin mistakes the party for a threat", "a sudden curfew enforced by the watch",
      "an old bridge groans under added weight", "a gas pocket in an unmarked mine tunnel",
      "static charge from a storm-touched ley line", "a stampede triggered by a false alarm",
      "corrosive runoff eating through old stonework", "a sudden dead zone kills all nearby magic",
      "a scheduled demolition of ruins starts early"
    ],
    "Survey Problem": [
      "the map on file doesn't match reality", "a marked safe road no longer is one",
      "divinations are being deliberately obscured by magic", "a previous party's report was quietly falsified",
      "local guides won't go past a certain point", "enchanted tools interfere with each other here",
      "the terrain has changed since the last survey", "something here isn't on any official map",
      "the exit route is now someone else's territory", "watch coverage is denser than briefed"
    ]
  },
  "Faction Encounter": {
    "Root Cause Category": [
      "control of a mountain pass, trade lane, or border zone", "water rights, an ore vein, a lumber stand, or arable land",
      "two claimants to the same charter or inheritance", "a religious or ideological schism within a formerly unified group",
      "an unresolved betrayal, massacre, or broken treaty", "a patron who quietly benefits from both sides staying weak",
      "debt, a tariff, a monopoly, or currency manipulation", "one side knows a secret that would destroy the other's legitimacy"
    ],
    "Cause Gap Flavor": [
      "the public story is real but incomplete — the truth is a deeper, older version of the same issue",
      "the public story is a deliberate lie by leadership, told to rally their own base",
      "the public story was true once but has been overtaken by events nobody's corrected the tale for",
      "the public story is true for one side and false for the other — they're fighting for different reasons entirely",
      "a third party manufactured the public story specifically to obscure what's really going on",
      "the public story and the real one have swapped in popular perception, thanks to years of propaganda"
    ],
    "Third-Party Casualty": [
      "a neutral settlement caught in the contested zone", "a trade or supply line neither side intends to protect",
      "a minority population within one side's own territory", "an allied faction whose treaty obligates them to a side they don't want",
      "the resource or place being fought over, degrading no matter who wins", "a specific named NPC with real ties to the party"
    ],
    "Starter Session Hook": [
      "the party is hired to broker safe passage before a deadline both sides are quietly dreading",
      "the party finds evidence of the root cause during an unrelated job, and must decide who — if anyone — to show it",
      "a sympathetic figure from one side tries to recruit the party for a deniable move, testing where their own line is",
      "a neutral party the third-party casualty trusts asks the party to intervene before it's too late",
      "an old grievance resurfaces publicly, and both sides quietly ask the party to make it go away",
      "the party stumbles into the precipitating incident's aftermath before either side's official story has hardened"
    ]
  }
};
