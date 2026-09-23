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
      "A tax audit exposed sabotage along a frontier trade road.",
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
      "A worker riot blocks the only safe road out of town.",
      "A rival company reaches the site minutes before the party.",
      "A well begins failing in a way that looks intentional.",
      "A fugitive offers proof of a hidden noble scheme.",
      "A scout returns with unnatural biological traces.",
      "A debt marker is called in at the worst possible time.",
      "A quarantine order is issued after the party is already inside the walls."
    ],
    "Campaign Tone": [
      "Hard frontier survival with moral compromise.",
      "Frontier lawkeeping under a lord's pressure.",
      "Exploration, treasure-hunting, and slow-burn horror.",
      "Traveling company caught between rival factions.",
      "Border mystery with martial consequences.",
      "Common folk against a distant, uncaring nobility.",
      "Scholarly discovery with escalating magical containment failure.",
      "Sparse western frontier at the edge of a hostile wild.",
      "Dirty politics, supply lines, and personal loyalties.",
      "Resource extraction drama against ancient unknowns."
    ],
    "Sector Trouble": [
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
      "opulent", "claustrophobic", "exposed", "obsolete", "fortified", "cursed", "remote",
      "ceremonial", "half-built", "frost-bitten", "humid", "dust-choked", "watched"
    ],
    "Focus": [
      "gate", "shrine", "laborer", "contract", "wagon", "beacon fire", "map", "weapon",
      "specimen", "ledger", "infirmary", "hearth", "harbor", "keep hall", "mine shaft",
      "ruin", "watchtower", "guard patrol", "signal horn", "lifeboat"
    ]
  },
  "Road Encounters": {
    "Road Sighting": [
      "a riderless wagon standing without its team",
      "a patrol of soldiers holding position near a dark treeline",
      "a scattered supply train with fresh burn marks",
      "a toll cart broadcasting an outdated merchant seal",
      "a warning cairn steering travelers away from the open road",
      "a rider driving hard with no house colors",
      "a way-station shuttering in short, panicked bursts",
      "a cluster of scouts moving in careful formation",
      "an abandoned litter with its curtain drawn from outside",
      "a frozen ford scarred by heavy wheel ruts"
    ],
    "Travel Peril": [
      "rockslide crossing the only path",
      "false banner leading into an ambush hollow",
      "runoff flooding from a burst upstream dam",
      "navigation confusion caused by an old curse on the land",
      "noble interdiction order with unclear authority",
      "debris field masking a live trap",
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
      "emergency extraction", "cargo transfer", "region survey", "patrol intercept",
      "medical evacuation", "quiet smuggling run", "noble courier route", "wreck salvage",
      "settlement resupply", "search and rescue"
    ]
  },
  "Realms": {
    "Realm Type": [
      "barren highland", "thin-soil mining hold", "cold moorland colony", "humid jungle realm",
      "island archipelago", "blighted marchland", "ice-locked reach", "volcanic furnace vale",
      "tamed garden realm", "cloud-shrouded peak", "scattered isles", "stable borderland"
    ],
    "Realm Traits": [
      "unstable weather windows", "scarce fresh water", "valuable deep-earth minerals",
      "old failed irrigation grid", "dangerous native beasts", "noble monopoly infrastructure",
      "fragmented local governance", "unreliable signal towers", "large unmapped wildland",
      "seasonal migration hazards"
    ],
    "Wilderness Peril": [
      "toxic storm front", "sinkhole into old mine caverns", "territorial wild beast",
      "corrosive fog", "irrigation works malfunction", "armed claim jumpers",
      "heat bloom visible to predators", "unstable ice shelf", "flooded tunnel network",
      "watch cordon around a secret site"
    ],
    "Wilderness Opportunity": [
      "rare mineral vein", "surviving pre-collapse relics", "friendly local guide",
      "hidden water source", "shortcut through a scout's trail", "abandoned field camp",
      "salvageable cart", "black-market landing hollow", "evidence of a missing party",
      "natural shelter against the storm"
    ]
  },
  "Settlements": {
    "Settlement Type": [
      "company town", "mining camp", "scholars' outpost", "irrigation colony",
      "free trader port", "penal labor camp", "frontier homestead cluster", "river transfer station",
      "garrison depot", "refugee camp"
    ],
    "First Look": [
      "stacked timber shacks under harsh torchlight",
      "a single cobbled street filled with red dust",
      "watchmen posted at every gate",
      "workers moving silently between shifts",
      "noble slogans painted over older warnings",
      "a chapel, tavern, and infirmary sharing one hall",
      "patched wall stones and mismatched thatch",
      "children watching strangers from shuttered windows",
      "an unfinished palisade half-buried in grit",
      "armed guards pretending not to be nervous"
    ],
    "Authority": [
      "town reeve", "elected village council", "garrison commander", "guild foreman coalition",
      "religious founder", "criminal broker", "scholarly warden", "enchanted steward",
      "sheriff's office", "family patriarch or matriarch"
    ],
    "Settlement Trouble": [
      "rations are being diverted",
      "a strike is near violence",
      "the well is failing",
      "the official population count is false",
      "a missing child is blamed on outsiders",
      "the watch has started disappearing people",
      "the town charter is contested",
      "a disease is being hidden",
      "two factions control different sections of the wall",
      "a local taboo blocks the obvious solution"
    ],
    "Settlement Project": [
      "expand the palisade", "repair the watch beacon", "open a new mine face",
      "complete an irrigation tower", "build militia defenses", "restore the infirmary",
      "install a new well pump", "survey a nearby ruin", "negotiate a trade contract",
      "purge contamination from the water system"
    ]
  },
  "Districts": {
    "Access": {
      "First Look": [
        "hardened checkpoint with worn iron gates",
        "cargo gates lined with inspection guards",
        "arrival square packed with delayed travelers",
        "toll booth running on a skeleton crew",
        "portcullis cycling too slowly",
        "gatehouse tunnel scored by old fire"
      ],
      "Complication": [
        "entry papers do not match the current authority",
        "the road is sealed until a bribe is paid",
        "a wanted face appears on the watch roster",
        "an alarm bell traps everyone between doors",
        "guards detect something no one packed",
        "a rival company arrives with higher priority clearance"
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
        "recreation hall lit by guttering candles",
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
        "pipes sweating with condensation",
        "warning lanterns under a film of dust",
        "waterwheel access behind patched masonry",
        "runoff dripping into collection buckets",
        "manual controls polished by constant use"
      ],
      "Complication": [
        "repairs require shutting down the well elsewhere",
        "a system has been deliberately miscalibrated",
        "the only engineer is missing",
        "a bypass works but will fail soon",
        "a damaged construct guards the wrong room",
        "flooding begins during the inspection"
      ],
      "Useful Detail": [
        "spare gear assembly", "handwritten repair map", "open inspection hatch",
        "service crawlway", "faulty pressure gauge", "lantern oil with one good charge"
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
        "quarantine signs covered by tape"
      ],
      "Complication": [
        "records are locked by noble decree",
        "a patient recognizes the party",
        "samples have been switched",
        "the healer is treating both sides",
        "a body is listed as discharged",
        "symptoms do not match any known ailment"
      ],
      "Useful Detail": [
        "bloodwork anomaly", "sealed patient file", "hidden remedy cache",
        "medical waste route", "sedative draught", "crypt access tag"
      ]
    },
    "Operations": {
      "First Look": [
        "mission maps showing outdated territory",
        "dispatch table under low lantern light",
        "runners speaking in code",
        "a wall of status boards and red flags",
        "locked office overlooking the floor",
        "archive cabinets beside a broken ledger stand"
      ],
      "Complication": [
        "the logs were edited minutes ago",
        "a superior gives contradictory orders",
        "an emergency signal comes from a forbidden site",
        "the map omits a whole region",
        "dispatch records show an impossible trip",
        "a clerk begs you not to mention their name"
      ],
      "Useful Detail": [
        "shift roster", "route archive", "private courier list",
        "old incident report", "unclaimed watch badge", "route priority stamp"
      ]
    },
    "Production": {
      "First Look": [
        "assembly benches humming with unseen labor",
        "ore hoppers feeding a sealed forge",
        "conveyor ropes under harsh lamps",
        "workshop floor marked with hazard lines",
        "crafting benches producing unknown parts",
        "the smell of oil and hot metal"
      ],
      "Complication": [
        "production cannot stop without penalty",
        "a workshop is making something illegal",
        "workers sabotage the line for leverage",
        "a trapped worker is inside the machinery",
        "a product batch is magically contaminated",
        "the output does not match the manifest"
      ],
      "Useful Detail": [
        "reinforced smithing apron", "parts bin", "control lever",
        "safety override key", "defective product sample", "sealed cargo tag"
      ]
    },
    "Research": {
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
        "the experiment changed after last contact",
        "containment depends on a failing ward",
        "a sample is missing but not logged",
        "a discovery has martial value",
        "the data proves the patron caused the problem"
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
        "watch officer studying a threat board"
      ],
      "Complication": [
        "the watch is split between two loyalties",
        "a prisoner knows too much",
        "weapons were signed out under false names",
        "the official threat is a cover story",
        "a lockdown order is issued remotely",
        "a guard recognizes an old debt"
      ],
      "Useful Detail": [
        "riot shield", "detention roster", "weapon checkout log",
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
        "guild store charging company scrip"
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
        "market gossip", "rare spare part", "shipping label",
        "smuggler contact", "debt ledger", "freshly forged permit"
      ]
    },
    "District Type": [
      "Access", "Community", "Engineering", "Living", "Medical",
      "Operations", "Production", "Research", "Security"
    ]
  },
  "Vessels & Caravans": {
    "Vessel Type": [
      "frontier scout wagon", "subsidized merchant convoy", "ore-hauling barge", "noble's courier coach",
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
      "a crew member is being coerced",
      "the vessel is shadowed by a silent rider",
      "toll investigators are looking for it",
      "a sealed compartment shows fresh use",
      "the captain owes more than coin"
    ],
    "Vessel Quirk": [
      "old guild stickers on every crate",
      "a shrine in the cargo hold",
      "a steward's voice trained on a dead officer",
      "smell of spiced tea everywhere",
      "manual controls maintained obsessively",
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
      "the fixer who can get anything, for a price", "the burnout who peaked years ago and knows it",
      "the idealist not yet worn down by the frontier", "the survivor who trusts nothing that looks too easy",
      "the company loyalist who genuinely believes the handbook", "the outsider who's fluent in everyone's business but their own",
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
      "wagon-sized mass", "colony organism", "microscopic blight", "parasitic infestation"
    ],
    "Behavior": [
      "observing from cover", "protecting a nest", "feeding on refuse", "following heat",
      "mimicking machinery", "avoiding bright light", "testing boundaries", "attacking only the isolated",
      "drawn to sound", "responding to arcane signals"
    ],
    "Revealed Aspect": [
      "not native to this world", "bred for a purpose", "part of a larger life cycle",
      "carrying valuable compounds", "reacts to human stress", "uses tunnels as hunting routes",
      "has been deliberately released", "is avoiding something worse",
      "is intelligent enough to bargain indirectly", "cannot survive without the ruin"
    ]
  },
  "Factions": {
    "Faction Type": [
      "noble house", "merchant guild", "temple order", "bandit company",
      "arcane academy", "border militia", "druidic circle", "smuggler ring",
      "cult of a forgotten god", "free company of mercenaries"
    ],
    "Influence": [
      "local room-level cell", "district authority", "settlement power", "regional stakeholder",
      "realm-wide actor", "kingdom-level power", "shadow network", "declining legacy institution"
    ],
    "Project": [
      "control the only safe route", "bury liability evidence", "monopolize water or grain",
      "weaponize a discovery", "break a labor movement", "smuggle people out",
      "force a buyout", "secure exclusive salvage rights", "trigger a security emergency",
      "extract a dangerous specimen"
    ],
    "Relationship": [
      "uneasy truce", "open vendetta", "secret partnership", "public rivalry private cooperation",
      "patron-client dependency", "mutual blackmail", "religious or ideological hatred",
      "shared enemy", "contractual obligation", "family ties across faction lines"
    ],
    "Rumor": [
      "their leader is already dead", "they found something beneath the town",
      "their money comes from an illegal program", "they are preparing evacuation lists",
      "they have a private prison", "their best asset is a child or dependent",
      "they control the emergency codes", "they caused the last disaster",
      "they are being manipulated by an outside patron", "they know how to leave but not who to save"
    ]
  },
  "Ruined Holds": {
    "Location": [
      "high hilltop", "border crossing", "ice field", "surface ruin scar",
      "cave cavity", "abandoned harbor", "deep lake trench", "toxic storm basin",
      "mine shaft terminus", "mountain shadow"
    ],
    "Type": [
      "survey party's camp", "ore processor", "scholar's tower", "settlement outpost",
      "garrison listening post", "supply depot", "prison caravan", "healer's wagon",
      "cargo hauler's yard", "irrigation platform"
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
      "a wild specimen got loose in the infirmary",
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
      "a star chart marking somewhere off every map"
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
      "within a mountain core", "below a ruined irrigation tower", "in a quarantined jungle zone",
      "under polar ice", "behind a collapsed mine face", "inside a volcanic tube",
      "beneath an abandoned city block"
    ],
    "Scale": [
      "single sealed chamber", "small bunker complex", "multi-level facility", "city-sized ruin",
      "distributed tunnel network", "regional-linked installation", "subsurface labyrinth", "machine cathedral"
    ],
    "Purpose": [
      "data archive", "biological containment", "weapons storage", "settlement control center",
      "ritual or memorial site", "irrigation regulator", "golem isolation vault", "emergency refuge",
      "genetic library", "unknown monitoring station"
    ],
    "Interior Feature": [
      "walls grown rather than built", "floor markings that match star charts",
      "sealed pods with internal power", "a dry fountain beneath sealed glass",
      "machinery pulsing like organs", "human equipment added later",
      "gravity inconsistent by room", "old warning icons in several languages",
      "a chamber that dampens radio signals", "a door requiring a living sample"
    ],
    "Peril / Opportunity": [
      "valuable data behind a lethal failsafe", "a safe path that destroys evidence",
      "a dormant defense that mistakes intent", "a trapped survivor with unreliable memory",
      "a cure stored beside a contaminant", "a power source that attracts factions",
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
      "old battle lines still matter", "profit logic overrides human need"
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
      "hot wax from overworked candles", "recycled air gone slightly stale",
      "solvent and scorched wood", "something organic decaying behind a wall",
      "fresh herbs masking an older smell", "oil and polished steel",
      "burnt chicory left too long", "incense over something it can't fully cover",
      "damp fabric and old sweat", "a chemical sweetness that shouldn't be there"
    ],
    "Sound": [
      "the irregular clank of a failing waterwheel", "distant voices arguing, too muffled to make out",
      "static bursts from an unattended signal horn", "a slow, rhythmic dripping somewhere unseen",
      "the low hum of overtaxed wards", "boots on grating, receding, then stopping",
      "a door cycling that shouldn't be cycling", "an alarm bell chirping once and going silent",
      "wind moaning through a loose shutter", "sudden total silence where the mill should be running"
    ],
    "Site Type": [
      "village edge", "village square", "castle gate", "great hall", "dungeon entrance",
      "forest clearing", "mountain pass", "riverside dock", "temple courtyard", "market row",
      "watchtower", "underground cavern", "archive vault", "ward chamber", "signal tower", "landing yard"
    ],
    "Immediate Surroundings": [
      "inside a building", "open field", "dense forest", "underground", "narrow passage",
      "behind cover", "exposed ledge", "sealed chamber", "flooded cellar", "crowded market",
      "total darkness", "ruined structure", "collapsed section", "debris field", "dense fog", "elevated platform"
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
      "security watches future movements", "prices rise against the crew",
      "a faction clock advances", "a contact goes quiet", "official permits are reviewed",
      "a rival spreads a damaging rumor", "checkpoint searches intensify",
      "an enemy learns the crew ship ID", "a bounty is posted quietly",
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
      "a person the crew has met", "a place that offered shelter", "a debt that will come due",
      "a promise made publicly", "a scarce resource everyone needs",
      "a moral line a PC does not want to cross", "a community that cannot leave",
      "evidence that will ruin someone powerful", "a secret tied to the crew's past",
      "a future route or refuge"
    ],
    "Opposition Logic": [
      "the antagonist is protecting their own people", "the enemy profits from delay",
      "the opposition needs the crew alive for now",
      "the rival believes they are preventing a worse disaster",
      "the faction is obeying a contract with hidden penalties",
      "the antagonist lacks full information",
      "the enemy's cruelty is efficient not random",
      "the opposition must act before a public deadline",
      "the villain is trapped by promises to followers",
      "the enemy is trying to erase liability"
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
      "burned contract", "child's charm", "sealed sample case", "broken badge",
      "signet ring", "old colonial flag", "encrypted family recording", "bloodless knife",
      "handwritten map", "prototype device"
    ],
    "Anomaly Effect": [
      "messages arrive out of order", "organic matter crystallizes briefly", "gravity tilts by a few degrees",
      "dreams share common imagery", "machines run without power", "dead lanterns show live images",
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
      "the monster follows a rule the crew can exploit",
      "the environment has been warning them all along",
      "the evidence proves negligence, not accident",
      "the creature is less frightening than the decision that made it",
      "the town can survive only by admitting a hidden crime",
      "the old map is accurate because the ruin is rebuilding itself",
      "the threat recognizes one crew member",
      "the crew has been carrying the clue since scene one",
      "the danger is not entering the town; it is leaving with the truth"
    ]
  },
  "Plot Engine": {
    "Plot Target": [
      "a person with divided loyalties", "a vulnerable worker group", "a hidden object in transit",
      "an abstract right or legal claim", "a failing settlement system", "a dangerous arcane truth",
      "a trade monopoly", "a route through hostile lands", "a local taboo or tradition",
      "a buried noble liability", "a missing expedition record", "an emergency evacuation list",
      "a hostage supply chain", "an illegal specimen", "a disputed water or grain contract",
      "a suppressed casualty report", "a prototype under field testing", "a witness whose memory has gaps",
      "a settlement charter", "a faction's claim to legitimacy"
    ],
    "Plot Method": [
      "blackmail through falsified records", "sabotage disguised as maintenance failure",
      "legal seizure under emergency authority", "deliberate ration manipulation",
      "staged rescue to gain trust", "planted evidence against a useful scapegoat",
      "controlled leak of partial truth", "use of debt markers and contract penalties",
      "manufactured panic to justify force", "quiet replacement of key personnel",
      "weaponized quarantine procedure", "relocation order that separates witnesses",
      "false distress call", "disinformation through local rumor channels",
      "contamination of a route or resource", "tampered scout report",
      "forged evacuation priority list", "predator release framed as natural migration",
      "memory-editing or sedation hidden as medical care", "remote system lockout during negotiation"
    ],
    "Plot Reveals": [
      "the patron is using the crew as deniable pressure",
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
      "the threat began as a cost-saving measure",
      "the map was edited after the last transmission",
      "the real antagonist is a contract clause",
      "the specimen is a warning system, not a weapon",
      "the missing crew chose silence to protect others",
      "the settlement's success depends on an atrocity",
      "the rescue mission is really a containment mission"
    ],
    "Scene Driver": [
      "deadline before a storm, launch, lockdown, or vote", "resource drain that worsens every scene",
      "rival team moving in parallel", "NPC loyalty under stress",
      "a clue that can be lost or contaminated", "a safe place becoming unsafe",
      "a moral debt being called in", "communication lag or blackout",
      "crew reputation changing local reactions", "heat from a previous mission arrives early",
      "water and provisions shrinking by the hour", "an enemy testing responses",
      "a disease clock with unclear symptoms", "a public crowd demanding an answer",
      "a legal window closing"
    ]
  },
  "Danger Situations": {
    "Castle & Workshop Hazards": [
      "portcullis cycling while someone is trapped between locks",
      "smoke fog hiding a floor-level breach",
      "forge vibration changing from background noise to rhythm",
      "ore conveyor dragging cargo toward a crusher",
      "static discharge arcing across wet decking",
      "toxic washdown system triggering without warning",
      "runaway loader misidentifying people as cargo",
      "crane dropping scrap in irregular intervals",
      "emergency shutters dividing the group",
      "air scrubbers spreading rather than filtering the contaminant",
      "fuel vapor pooling near a sparking relay",
      "damaged flooring creating fall zones",
      "maintenance construct following obsolete lethal instructions",
      "pressure gauges showing impossible values",
      "a machine room too loud for shouted warnings"
    ],
    "Environmental Dangers": [
      "storm front cuts off the return route", "thin ice or crust hides a deep void",
      "local pollen clogs filters and changes voices", "heat shimmer conceals moving shapes",
      "purple aurora distorts depth perception", "regenerating soil swallows tracks too quickly",
      "microtremors turn quiet movement into noise", "corrosive mist eats exposed seals",
      "flash flood fills the lowest passage first", "predators use wind or machinery to mask approach",
      "dust carries a mild hallucinogen", "surface becomes reflective at night and ruins navigation",
      "gravity flux turns slopes into traps", "fungal mats exhale when stepped on",
      "the safest landmark moves with the tide or storm"
    ],
    "Wilderness & Road Dangers": [
      "slow exposure too quiet for immediate panic", "tether line fraying under unseen stress",
      "wagon wheels failing on a damaged schedule", "cargo drifting toward a ravine",
      "unnatural shadow shows something large nearby", "checkpoint handshake failing after the outer door opens",
      "ice crystals obscuring vision", "silent rider matching speed with the wagon",
      "debris field rotating faster than predicted", "rescue beacon repeating in a dead crew member's voice",
      "hull patch flexing with every pressure cycle", "map update contradicting the visual field",
      "a watch alarm belongs to someone not on the roster", "storm venting jets that change the landing geometry",
      "wagon fragments carrying active markers"
    ],
    "Social Dangers": [
      "a crowd deciding whether the crew is useful or guilty",
      "a frightened witness changing their story under pressure",
      "security asking questions they already know the answers to",
      "a broker selling silence by the minute", "a local custom that makes refusal dangerous",
      "an authority figure demanding public loyalty", "a desperate parent exposing a hidden route",
      "a rival offering the same deal first", "a faction using the crew to test an enemy",
      "a room going quiet when one name is mentioned", "a hostage negotiation framed as a contract dispute",
      "a confession that implicates an ally", "a rumor that makes peaceful entry impossible",
      "a lawful order that would doom innocents", "a beloved local figure lying for understandable reasons"
    ]
  },
  "Fear and Dread": {
    "Fear Trigger": [
      "being watched by something unseen", "contamination that spreads through ordinary contact",
      "isolation from crew, ship, or comms", "darkness that behaves like a physical pressure",
      "confinement with shrinking options", "familiar people acting subtly wrong",
      "evidence of a predator learning", "dead systems moving as if alive",
      "a safe routine violated once, then twice", "a sound that stops when noticed",
      "the loss of memory, name, or identity", "body transformation too slow to deny",
      "authority figures more frightened than civilians",
      "the realization that rescue cannot arrive in time",
      "a place that remembers earlier visitors",
      "an evacuation route that becomes a choice of who deserves to leave",
      "a harmless biological trace becoming meaningful later",
      "a machine predicting events it should not know",
      "a corpse or wreck arranged to communicate",
      "the crew's own voices coming from ahead"
    ],
    "Dread Technique": [
      "show the aftermath before the cause", "give partial information that supports two bad theories",
      "repeat one sensory detail with increasing wrongness",
      "let an NPC panic at something the crew cannot yet see",
      "make the safe route require a moral cost",
      "withhold the monster but reveal its intelligence",
      "make technology fail in a consistent, meaningful pattern",
      "introduce one impossible detail in an ordinary scene",
      "allow a short calm beat before the next escalation",
      "make the environment respond to the crew's actions",
      "make the threat avoid direct confrontation until it knows enough",
      "turn a useful tool into a source of vulnerability",
      "force quiet choices instead of open combat", "make escape possible but costly",
      "make the truth useful and destabilizing", "show an expert losing confidence",
      "let the first success create a worse question",
      "turn a map, log, or checklist into a countdown",
      "reveal that the crew has been following the threat's preferred path",
      "let the scene answer a question no one asked"
    ],
    "Uncanny Detail": [
      "a person smiles half a second late", "a recorded voice answers a question it never heard",
      "a corpse is warm in only one hand", "the same scratch mark appears on both sides of a sealed door",
      "children's drawings show tomorrow's event", "a machine uses a human nickname no one entered",
      "a reflection includes one extra figure", "a familiar room is one meter too long",
      "a trusted ally uses the wrong childhood memory", "an animal moves like it is wearing a shape",
      "a helmet camera shows breathing condensation from an empty suit",
      "a map labels a location with the crew's ship name", "a wound contains clean machine parts",
      "footsteps match the listener's pace exactly", "a dead comm channel whispers only when ignored",
      "a warning sign uses a future date", "a child's toy repeats a security code",
      "a pressure suit stands upright with no body inside",
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
      "let the crew choose whether to open the final proof",
      "show a witness who survived by misunderstanding events",
      "reveal a faction's guilt through routine paperwork",
      "make the last clue auditory rather than visual",
      "confirm the worst theory only after the crew has acted against it",
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
      "give player characters meaningful agency even in a doomed situation"
    ]
  },
  "Settlements and Expeditions": {
    "Settlement Pressure": [
      "integrity damage in an essential system", "morale falling after a failed mission",
      "raw materials depleted by emergency repairs", "research promising a solution but requiring risk",
      "enemy activity increasing near a border", "scout report contradicting official surveys",
      "settlers demanding action before evidence is complete",
      "food production threatened by wild contamination", "construction delayed by missing parts",
      "medical capacity overwhelmed by unknown symptoms", "a new building draws unwanted attention",
      "an evacuation plan includes too few seats", "a supply wagon missed its scheduled window",
      "maintenance debt from earlier shortcuts comes due", "a leadership dispute splits the work crews"
    ],
    "Expedition Objective": [
      "investigate a ruin without disturbing active systems",
      "recover a scout team before the storm closes",
      "sample a creature without triggering territorial behavior",
      "map a safe corridor for settlement expansion",
      "destroy a nest or beacon near the perimeter",
      "escort workers to a damaged remote station",
      "locate raw materials needed for repairs",
      "confirm whether an enemy region is occupied",
      "retrieve a cargo wagon from unstable terrain",
      "test a theory before the settlement commits resources",
      "repair a beacon that may attract help or enemies",
      "find why scouts vanish beyond a ridge",
      "recover a cart before its logs are overwritten",
      "seal an opening discovered under new construction",
      "verify a friendly contact who arrived without warning"
    ],
    "Battlefield Condition": [
      "low visibility with intermittent shadows", "unstable footing or partial collapse",
      "hard cover that also blocks retreat", "hazardous pools, vents, or arcane arcs",
      "civilian presence limits firepower", "moving machinery changes lanes of attack",
      "enemy has high ground but poor mobility",
      "valuable samples can be destroyed by stray shots",
      "reinforcements arrive if alarms persist", "the terrain itself attracts predators",
      "the safest cover is contaminated",
      "line of sight changes with rotating shadows or storms",
      "a resource objective is heavier than expected",
      "sound discipline matters more than speed",
      "heat signatures reveal both sides to something else"
    ],
    "Post-Mission Find": [
      "ancient artifact with an obvious use and hidden cost",
      "data fragment pointing to a larger pattern", "usable construction materials",
      "bio-sample unlocking a research theory", "survivor with damaged memory",
      "old settlement marker from an unknown faction",
      "enemy equipment adapted to local conditions", "map of a sealed region",
      "medical compound that treats one symptom", "supply cache with a claim tag",
      "recording that changes mission priorities", "tool that makes the next expedition safer",
      "partial coordinates to a safer landing zone",
      "organism that reacts to settlement power systems",
      "proof that the settlement is not the first here"
    ]
  },
  "Campaign Intelligence Engine": {
    "Director Move": [
      "Put a useful answer behind a costly door", "Show the human cost of the mission", "Reveal who benefits from the danger", "Make the safest route politically dangerous",
      "Offer evidence that contradicts the obvious story", "Turn a resource into a moral problem", "Let an ally ask for something unreasonable", "Expose a hidden dependency in the town",
      "Move the threat closer without fully showing it", "Make the crew choose between speed and proof", "Create a public consequence for private action", "Let the environment answer before an NPC does",
      "Make a routine procedure fail at the worst time", "Tie a minor clue to a larger pattern", "Force the crew to spend reputation as currency", "Put a vulnerable bystander in the path of progress"
    ],
    "Roleplay Option": [
      "Press the patron for the real objective", "Protect workers even if it delays the contract", "Trade a secret for access", "Lie to the watch and risk later exposure",
      "Promise evacuation before knowing if it is possible", "Appeal to professional duty", "Threaten to go public", "Make a quiet deal with a rival faction",
      "Interview the person everyone dismisses", "Comfort a terrified survivor", "Challenge the noble's version of events", "Split the crew between proof and rescue",
      "Ask what the construct was ordered not to say", "Treat the criminal as a witness", "Use procedure as leverage", "Accept blame to keep the team moving"
    ],
    "Recommended Next Step": [
      "Secure the scene before investigating", "Question the last person who saw the victim", "Check maintenance and safety logs", "Compare official records against physical evidence",
      "Trace cargo movement", "Inspect the sealed or restricted area", "Map power, water, and message dependencies", "Identify who has authority to lie",
      "Find an independent witness", "Recover sensor or black box data", "Establish an escape route", "Determine what the guild wants preserved",
      "Test a biological sample under controlled conditions", "Force the opposition to reveal urgency", "Create a fallback extraction point", "Put one clear question to the oracle"
    ],
    "Momentum Adjustment": [
      "Raise noble pressure by one", "Raise wild activity by one", "Raise crew stress by one", "Lower resources by one",
      "Lower public trust by one", "Raise law/security attention by one", "Add a countdown clock", "Mark a faction as suspicious",
      "Give the crew a temporary advantage", "Reveal a safe route with a hidden cost", "Convert a clue into a lead", "Convert a lead into a confrontation",
      "Delay the threat but increase its scale", "Move the mission clock forward", "Offer a hard bargain", "Create a new unresolved thread"
    ]
  },
  "Core Solo Engine": {
    "Decision Prompt": [
      "What would a professional do here?", "What would make this job no longer routine?", "Who is not being protected by the official plan?", "What evidence would change everyone's priorities?",
      "What is the fastest safe option?", "What is the slowest truthful option?", "Which choice burns a bridge?", "Which choice preserves leverage?",
      "What does the crew need before they can move?", "What does the opposition need to hide?", "What would make retreat honorable?", "What would make victory expensive?"
    ],
    "Scene Question": [
      "What is really happening here?", "Who benefits if the crew leaves?", "What has been altered since the incident?", "What does the environment reveal?",
      "Who is afraid to speak?", "What has the guild already removed?", "What is failing right now?", "What is the next visible consequence?",
      "What personal stake enters the scene?", "What proof is fragile?", "Who arrives before the crew is ready?", "What makes the obvious answer wrong?"
    ]
  },
  "Exploration": {
    "Discovery": [
      "a pre-settlement marker buried under fill", "a scout's charm transmitting from inside solid rock", "a heat bloom where maps show dead ground", "a fungal mat arranged around a well shaft",
      "a crashed wagon with cargo missing but bodies untouched", "a sealed hatch stamped with an obsolete safety code", "a cavern whose walls record vibration like memory", "a weather tower aimed at the wrong horizon",
      "a hand-built shrine in an abandoned service tunnel", "a fuel cache tagged by a defunct contractor", "a false skyline produced by atmospheric refraction", "a living organism using well waste heat"
    ],
    "Route Hazard": [
      "dust-choked lanterns", "sinkholes hidden by loose mats", "magnetic interference from ore seams", "whiteout static across signals",
      "predator trails crossing the safe route", "ice fractures under wagon weight", "scout navigation loops", "corrosive rain bands",
      "unstable tunnel supports", "illegal beacon spoofing", "shadow zones from old ruins", "territorial worker pickets"
    ],
    "Exploration Payoff": [
      "a safer route for future travel", "proof of illegal dumping", "a hidden water or fuel source", "coordinates to an older settlement",
      "a biological clue that explains the hazard", "a salvageable machine part", "a witness hiding off-grid", "evidence that the town was warned",
      "a map of maintenance spaces", "an artifact that reacts to power", "an abandoned emergency shelter", "a claim marker older than the contract"
    ],
    "What's Normal": [
      "wind patterns match the survey data exactly", "local wildlife keeps a predictable distance", "soil composition is unremarkable", "weather follows the forecast models",
      "terrain matches the survey maps", "background hazard sits at expected levels", "water table depth matches predictions", "seismic activity is within tolerance",
      "day-night cycle behaves as charted", "vegetation growth follows known patterns", "nothing here contradicts the briefing"
    ],
    "What's Strange": [
      "the wildlife goes silent at the same hour every day", "a rock formation repeats too perfectly to be natural", "compasses drift toward one fixed point", "plants grow in deliberate rows",
      "the wind carries a sound like distant machinery", "shadows fall a few degrees off true", "footprints predate the survey team's arrival", "local minerals hum faintly under scanners",
      "migratory patterns all point the same direction", "echoes return half a second too late", "a patch of ground stays warm through the night"
    ],
    "What's Dangerous": [
      "loose scree hides a sheer drop", "local fauna is territorial near the water source", "spores trigger respiratory distress", "flash flooding follows the canyon route",
      "storms build faster than forecast", "ground gives way over a hollow cavity", "predator tracks circle the campsite", "toxic runoff pools where it isn't expected",
      "temperature swings punish exposed skin", "a nest defends territory the survey didn't map", "unstable ice conceals crevasses"
    ],
    "What's Valuable": [
      "an untapped mineral vein near the surface", "a freshwater source clean enough to bottle", "salvageable tech from an earlier survey", "a natural shelter defensible against weather",
      "medicinal plants unknown to the settlement's records", "a clear line of sight ideal for a relay station", "fertile soil suited to the settlement's crops", "a fossil bed worth a research grant",
      "rare crystal formations with industrial use", "an intact cache from a previous expedition", "geothermal activity suited for power generation"
    ],
    "What's Beautiful": [
      "bioluminescent fungus lighting the cave walls", "a sunset refracted through mineral dust", "migratory flocks moving like a single organism", "crystal formations ringing faintly in the wind",
      "an aurora bent by the local magnetic field", "a canyon carved into impossible symmetry", "wildflowers blooming in a toxic-looking basin", "frost patterns repeating like woven fabric",
      "a waterfall glowing faintly with minerals", "stars visible in daylight through thin atmosphere", "a valley that echoes birdsong into harmony"
    ]
  },
  "Realm & Kingdom Creation": {
    "Kingdom Pressure": [
      "shipping delays are becoming political", "one guild controls refueling", "old survey data is unreliable", "bandits avoid one silent hollow",
      "settlements compete for the same water source", "a garrison quarantine is poorly explained", "irrigation debt shapes every local decision", "union organizers are arriving ahead of inspectors",
      "a noble or executive family treats the realm as property", "an alien ecology disrupts industrial expansion", "automated law beacons contradict local practice", "a missing expedition changed the trade route"
    ],
    "Road Event": [
      "distress call on an obsolete band", "unregistered courier burns hard for the outer moon", "customs requests a live inspection", "a navigation buoy broadcasts two different positions",
      "debris field from an unreported collision", "steward flags a route as spiritually unsafe", "a noble tender shadows the crew", "fuel quality tests barely pass",
      "crew receives a message sent before they departed", "military scout asks for credentials it should not know", "a cold storage pod wakes early", "passenger disappears from manifest records"
    ]
  },
  "Kingdoms & Settlements": {
    "Settlement Problem": [
      "water rationing hidden from investors", "worker housing built over contaminated ground", "well maintenance deferred for bonuses", "local election controlled by contract debt",
      "medical supplies diverted to executives", "irrigation enzymes mutating native life", "a missing survey team blamed on weather", "food production dependent on one failing machine",
      "security protecting assets instead of people", "children reporting dreams of the same location", "construct labor dispute suppressed", "a prospector strike that the guild wants erased"
    ],
    "Local Color": [
      "guild slogans painted over older warning signs", "meal tickets used as informal currency", "church bells made from reforged scrap", "miners wearing family charms",
      "children playing under refinery shadows", "imported trees dying in sealed planters", "public boards showing delayed news", "union graffiti hidden inside maintenance panels",
      "settlers naming storms like relatives", "constructs standing silently during shift changes", "cargo containers converted into chapels", "old flags bleached by sunlight"
    ]
  },
  "Noble Houses & Guilds": {
    "House Pressure": [
      "audit team arrives with private security", "patron changes the objective mid-mission", "legal threatens breach-of-contract penalties", "media release contradicts witness testimony",
      "hazard pay is revoked unless the crew signs an oath of silence", "rival house offers better terms for betrayal", "the lord orders evidence transferred to a distant hold", "insurance investigator is more dangerous than security",
      "local administrator begs the crew not to file a report", "company physician edits medical findings", "automated contract clause seizes salvage rights", "a board observer treats casualties as exposure metrics"
    ],
    "Hidden Agenda": [
      "protect mineral rights", "weaponize a biological discovery", "avoid liability for a design flaw", "discredit union leadership",
      "recover proprietary construct code", "bury evidence of illegal colonization", "secure ancient artifacts before regulators arrive", "turn disaster into acquisition leverage",
      "force evacuation to break land claims", "test security doctrine on a live settlement", "steal competitor route data", "preserve investor confidence at any cost"
    ],
    "Faction Activity": [
      "quietly buys out a smaller rival", "leaks a damaging rumor about a competitor", "recalls its field agents for a closed-door meeting",
      "opens a new outpost without local approval", "cuts a backroom deal with a marshal or regulator", "runs a loyalty audit on its own staff",
      "reassigns its best people to a single urgent problem", "tests a new policy on a population that can't refuse", "quietly funds an opposing faction's rival",
      "stages a public event to shore up its reputation", "moves a key asset somewhere harder to reach", "cancels a contract without warning",
      "recruits aggressively in a community it doesn't yet control", "commissions a report that conveniently favors its own interests", "goes quiet — which is its own kind of signal"
    ],
    "Faction Asset": [
      "an elite enforcer cadre, loyal only to the top", "a hidden cache the rest of the faction doesn't know about",
      "an informant network threaded through a rival's own ranks", "a black-market supply pipeline no customs check catches",
      "a political patron who owes a favor nobody's called in yet", "a watchtower that hears more than it should",
      "a captive specialist kept comfortable and compliant", "a shell company that launders reputation as easily as money",
      "a fast, deniable strike team for jobs that can't trace back", "a monopoly contract on something the whole realm needs",
      "a compromised regulator who looks the other way, for now", "a private security force bigger than it publicly admits",
      "an archive of leverage on everyone who matters locally", "a fortified redoubt built for a war that hasn't started yet",
      "a loyal cell embedded inside a rival's own organization"
    ]
  },
  "Faction Turns": {
    "Faction Action": [
      "expands into unclaimed territory before a rival can", "consolidates its hold over an existing asset", "opens quiet diplomatic channels with a former enemy",
      "moves against a weaker rival while it still can", "exploits a resource before regulators notice", "sabotages a competitor's supply chain",
      "recruits heavily, thinning the local labor pool", "invests in infrastructure that locks in future control", "cuts a deal trading short-term loss for long-term leverage",
      "goes to ground, consolidating quietly instead of acting", "tests a rival's resolve with a calculated provocation", "spends heavily to buy loyalty it can't otherwise earn",
      "reaches for an asset just outside its usual reach", "repositions its assets ahead of a coming conflict", "makes a public move meant to be seen, not just felt"
    ],
    "Realm Tag": [
      "a realm under noble quarantine, officially for public health", "a realm where the ruling class never leaves their keep", "a realm built entirely on another era's ruins",
      "a realm where one guild owns the only water source", "a realm with a settlement that shouldn't have survived, but did", "a realm where the local wildlife is smarter than reported",
      "a realm that was irrigated wrong and never fixed", "a realm run by a steward nobody remembers installing", "a realm with a single, enormous, half-finished citadel",
      "a realm where the last war never officially ended", "a realm whose original settlers are long gone, but its systems still run", "a realm that exports labor, not goods",
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
  "Bestiary": {
    "Creature Origin": [
      "engineered as a bioweapon that outlived its funding", "evolved in a climate nothing should survive",
      "uplifted from a mundane species by an experiment nobody signed off on", "escaped containment during an evacuation nobody logged properly",
      "brought here as livestock and never fully domesticated", "the accidental byproduct of an irrigation process gone sideways",
      "native to a ruin's ecosystem, adapted to live in dead machines", "descended from a settlement's own abandoned pets, generations feral",
      "grown from spores that hitched a ride on a survey team's gear", "the result of two unrelated species merging in ways biology can't explain",
      "bred for a fighting pit and released when the operation folded", "a lab escapee whose original purpose is now classified past recovery",
      "native to this rock, and resentful of everyone who's shown up since", "cloned from partial remains found in a much older ruin",
      "the last surviving line of a species everyone assumed extinct"
    ],
    "Creature Method": [
      "skitters low on too many jointed limbs", "glides between structures on a membrane it can also use as armor",
      "burrows and surfaces without warning, never where you're watching", "moves in a loose, coordinated swarm rather than alone",
      "clings to walls and ceilings as easily as floors", "drags itself in a slow, deliberate crawl that's faster than it looks",
      "swims through vents and coolant lines like they're open water", "bounds in short, explosive leaps between cover",
      "walks upright, unsettlingly close to human", "rolls itself into a shell and lets momentum do the rest",
      "floats on a gas bladder, silent until it's already close", "moves only when unobserved, freezing dead still otherwise",
      "travels in a symbiotic pair, one host and one rider", "flows more than walks, changing shape to fit the gap",
      "hasn't been seen moving at all — nobody knows how it gets around"
    ],
    "Creature Trait": [
      "secretes something that dissolves standard armor coatings", "mimics distress calls perfectly, down to the static",
      "goes fully invisible to thermal and low-light optics", "regenerates from a wound fast enough to unnerve a medic",
      "communicates in a frequency that scrambles nearby electronics", "has a second, hidden mouth nobody expects",
      "can fake its own death convincingly enough to fool an autopsy", "excretes a paralytic that works through sealed suits",
      "imprints on the first large creature it sees, permanently", "changes color and texture to match whatever it's standing on",
      "carries a symbiote that survives even after the host is killed", "screams at a frequency that disables unshielded audio pickups",
      "can wedge itself into gaps that shouldn't fit a body its size", "produces light patterns that hypnotize before an attack",
      "leaves offspring behind in anything it kills"
    ],
    "Creature Threat": [
      "hunts in coordinated packs that box prey in before striking", "is functionally harmless alone, and lethal in numbers",
      "targets provisions and shelter before it targets people", "is slow but nearly impossible to actually kill with what a crew carries",
      "only attacks when its territory or brood is threatened", "carries a disease vector nobody's cataloged yet",
      "is smart enough to learn a crew's patrol routine and exploit it", "is bred for war and doesn't recognize a surrender",
      "panics under pressure and becomes far more dangerous, not less", "is nearly silent until the moment it commits to an attack",
      "isn't hostile at all — the danger is what it attracts", "grows measurably stronger with every kill",
      "can disable a settlement system as easily as a person", "hunts by scent long after the trail should have gone cold",
      "was never the real threat — it's a lookout for something worse"
    ]
  },
  "Site Concept": {
    "Site Feature": [
      "a chamber with gravity that doesn't match the rest of the structure", "a corridor lined with murals nobody currently here could have painted",
      "a control room still cycling through a checklist for an emergency that already happened", "a garden growing in total darkness, thriving anyway",
      "a section sealed from the inside, not the outside", "machinery still running on a fuel source nobody can identify",
      "a shrine assembled from parts of the structure itself", "a level where every clock reads a different, wrong time",
      "walls that are warm to the touch for no logged reason", "a vault door with no matching key anywhere in the records",
      "an atrium built for a crowd that never arrived", "a single perfectly preserved room in an otherwise ruined structure",
      "recordings looping in a language the translators can't place", "a structural seam suggesting two very different builders",
      "a floor that responds, faintly, to being walked on"
    ],
    "Site Danger": [
      "atmosphere that's breathable but slowly, quietly toxic", "structural failure one hard impact away from total collapse",
      "an automated defense system still technically active", "radiation pooled in one specific, unmarked room",
      "a predator that treats the whole site as its den", "a trap left by whoever was here last, still armed",
      "unstable power conduits that arc without warning", "a quarantine seal with a reason nobody wrote down",
      "gravity or pressure that shifts without any warning", "something still occupying the site that isn't listed on any survey",
      "a section that's been looted by someone recently, and violently", "systems that actively resist being shut down",
      "a structural weakness hidden by cosmetic repairs", "an environment hazard that only appears on a delay",
      "rival scavengers who got here first and don't intend to share"
    ],
    "Site Wonder": [
      "a view impossible to get anywhere else in the realm", "a piece of craftsmanship decades ahead of anything currently fielded",
      "proof of a civilization nobody official has ever confirmed", "an artifact that responds to being near people, somehow",
      "a perfectly intact record of a moment history otherwise lost", "architecture that couldn't have been built with tools anyone recognizes",
      "a natural formation so improbable it reads as artificial", "evidence that the official history of this place is wrong",
      "a working example of something everyone assumed was only theoretical", "a message clearly left for whoever found it, addressed to no one in particular",
      "a scale that makes everyone who enters feel genuinely small", "silence so complete it changes how people speak once inside",
      "an ecosystem thriving in conditions that should kill it outright", "a single object clearly worth more than the whole expedition's budget",
      "the unmistakable sense that this place was waiting"
    ]
  },
  "Adventure Seed": {
    "Hook": [
      "a distress call that stopped mid-sentence, days ago", "a shipment that arrived early, sealed, and addressed to no one",
      "a patron who won't say why the job pays this well", "a missing person last seen somewhere they had no reason to be",
      "a debt suddenly called in by someone who was never owed it", "a discovery reported and then officially retracted",
      "a rumor that's the same, word for word, from three unconnected sources", "a job posting pulled minutes after it's answered",
      "an old contact reaching out after years of silence", "a location that stopped responding to routine check-ins",
      "evidence of a crime nobody with authority wants investigated", "a request for help from someone with no reason to trust the crew",
      "a map with one location marked and no explanation", "a warning that arrives too vague to act on and too specific to ignore",
      "a reward posted for something nobody will describe outright"
    ],
    "Twist": [
      "the real client isn't who hired the crew", "the target wants to be found", "the danger already happened; the crew is cleaning up, not preventing",
      "the job's true purpose is the opposite of what was described", "someone the crew trusts already knows how this ends",
      "the deadline is fake, meant to force a mistake", "the reward was never going to be paid", "the crew isn't the first to take this job",
      "what looked like the threat is actually a symptom of a bigger one", "the person who needs rescuing caused the problem",
      "the information the crew was given is true, but incomplete on purpose", "success and failure lead to the same outcome, by design",
      "the opposition isn't wrong about what they're protecting", "the crew has met the real antagonist already, without knowing it",
      "the job was a test, and it's not over"
    ]
  },
  "Enchantment": {
    "Enchantment Concept": [
      "a warded weave that turns skin blade-resistant, at a cost to sensation", "eye-charms that see in full dark and mark targets automatically",
      "a reflex-quickening rune that trades caution for raw speed", "lung wards that shrug off toxin and cold alike, briefly",
      "a grafted second heart, redundant and quietly paranoid", "fingertip tools hidden under blessed skin",
      "a warding buffer that dulls pain to a distant echo", "limb replacement with spirit-assisted strength",
      "a black-market memory splice that isn't entirely the wearer's own", "jaw-mounted whisper-stones no scrying has ever found",
      "blessed blood that self-seals most wounds", "adrenal charms wired to a hair-trigger switch",
      "a socketed spine port for jacking directly into golem systems", "skin that reads as unidentifiable to any known scrying",
      "a second, hidden set of knuckle-mounted plating"
    ]
  },
  "Frontier Society": {
    "Social Tension": [
      "workers refuse to enter a sealed level", "families demand evacuation priority", "the watch arrests the wrong suspect", "settlers split between loyalty and survival",
      "religious leaders interpret the hazard as judgment", "local merchants hoard filters and medicine", "youth gangs control unused service tunnels", "prospectors distrust all outside authority",
      "constructs follow orders that humans never heard", "a marshal lacks jurisdiction but has moral authority", "guild housing locks during curfew", "a black market keeps the town alive"
    ],
    "Public Reaction": [
      "fearful silence", "angry crowd", "rumor cascade", "worker slowdown", "public accusation", "symbolic strike", "panic buying", "forced celebration",
      "memorial vigil", "barricaded neighborhood", "security crackdown", "quiet cooperation"
    ]
  },
  "Party & NPCs": {
    "NPC Drive": [
      "keep their crew alive", "hide a professional mistake", "earn passage out", "protect family from contract debt",
      "prove the guild lied", "complete the job despite fear", "sell the truth to the highest bidder", "cover for someone they love",
      "obey an order they hate", "find a missing friend", "keep the town from collapsing", "turn disaster into promotion"
    ],
    "NPC Secret": [
      "falsified a safety check", "heard voices before the incident", "knows where the bodies are", "is paid by a rival company",
      "has illegal enchanted implants", "was ordered to abandon survivors", "stole a sample for black market sale", "saw a construct ignore a direct order",
      "knows the town charter is invalid", "is hiding a child or refugee", "has access to restricted logs", "caused the accident accidentally"
    ],
    "Relationship Spark": [
      "old debt", "shared military service", "failed romance", "family obligation", "rival professional pride", "mentor disappointment",
      "blackmail", "survivor guilt", "contractual dependency", "religious trust", "criminal favor", "noble patronage"
    ]
  },
  "Keep Operations": {
    "Garrison Emergency": [
      "air recycler vibration changes pitch", "cargo shifts during travel", "cold sleep pod reports impossible vitals", "healer's ward locks its patient file",
      "forge room heat rises without load", "navigation solution includes a forbidden zone", "signals receive the keep's own distress call", "maintenance construct returns with organic residue",
      "gravity flickers in one compartment", "watch camera shows a missing panel reattached", "fire suppression triggers in an empty bay", "keep steward asks for a dead crew member"
    ],
    "Market Complication": [
      "customs flags cargo for moral rather than legal reasons", "berth fees double during emergency", "dockworkers refuse unsafe unloading", "port authority demands a bribe disguised as inspection",
      "rival crew claims the same contract", "quarantine delays departure", "fuel is contaminated", "a passenger boards under another name",
      "security scans find a planted item", "cargo owner vanishes", "crew is offered a side job", "the dock loses power during transfer"
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
      "a rival crew who lost the original contract", "a guild auditor building a fraud case", "a religious group who considers it sacred", "a black market broker who overpays no questions asked",
      "the original manufacturer trying to recall a defect quietly", "an insurance investigator suspicious of the manifest", "a smuggler using it as cover for something else", "a scholar who recognizes what it really is",
      "a rival house wanting it destroyed, not bought", "a family member of someone who died shipping it", "a government agent flagging it as restricted", "a pirate captain who has very specific orders"
    ],
    "Contract Type": [
      "Humanitarian", "Noble", "Scholarly", "Military", "Exploration", "Diplomatic", "Smuggling",
      "Courier", "Passenger", "Recovery", "Colonization", "Mining", "Research", "Emergency", "Escort"
    ]
  },
  "Workshop & Mine Hazards": {
    "Worksite Failure": [
      "pressure door cycles unpredictably", "ore crusher jam hides evidence", "coolant leak creates toxic fog", "warning lanterns were disabled to meet quota",
      "floor grates weaken over acid runoff", "construct arm repeats a fatal motion", "explosive dust accumulates in vents", "sealed shaft breathes warm air",
      "drill returns with biological material", "backup generator feeds the wrong circuit", "storage tanks resonate with distant impacts", "work orders disappear from the queue"
    ],
    "Survival Resource": [
      "fresh air", "clean water", "lantern oil", "medical gel", "storm shelter", "wagon fuel", "thermal blankets", "filter cartridges", "ammo", "antibiotics", "portable signal horn", "climbing line"
    ]
  },
  "Law, Marshals & Crime": {
    "Frontier Law Problem": [
      "jurisdiction ends at the gate", "guild law contradicts the town charter", "witnesses fear contract penalties", "evidence is stored on noble servers",
      "local marshal is honest but outgunned", "bounty hunter has legal paperwork", "prisoner transport becomes a rescue mission", "security wants confession more than truth",
      "bandits have local sympathizers", "smugglers provide essential medicine", "crime scene is also a survival shelter", "the suspect is the only qualified technician"
    ],
    "Criminal Angle": [
      "salvage fraud", "water theft", "claim jumping", "body trafficking", "illegal construct memory trade", "union intimidation",
      "noble espionage", "fuel adulteration", "black market xeno-samples", "bandit protection racket", "refugee smuggling", "insurance murder"
    ]
  },
  "Guards & Soldiers": {
    "Security Operation": [
      "clear a sealed habitation block", "escort an investigator through hostile workers", "hold a landing pad under storm conditions", "extract a scholar who refuses to leave",
      "recover a black box from contested wreckage", "guard evidence from noble removal", "hunt saboteurs in maintenance levels", "interdict smugglers during evacuation",
      "contain a biological breach", "negotiate with armed survivors", "secure an ancient artifact without touching it", "find missing patrol before morale breaks"
    ],
    "Tactical Twist": [
      "rules of engagement protect the wrong asset", "enemy knows the floorplan", "civilians are mixed with threats", "sensors are spoofed",
      "ammo conservation matters", "environment punishes heavy weapons", "friendly fire could breach the hull", "the target wants to be captured",
      "orders change mid-operation", "support beast follows outdated maps", "communications are monitored", "retreat route is politically unacceptable"
    ]
  },
  "Monster Biology": {
    "Monster Clue": [
      "repeated spiral scoring on hard surfaces", "enzymes breaking down synthetic seals", "heat-seeking spores", "bioluminescence that matches machine rhythms",
      "mimicry of human distress sounds", "eggs laid in warm forge housings", "organism avoids children and constructs", "growth accelerates near ward shielding",
      "predator marks arranged like territorial signs", "microbes rewriting stored food", "bone structures resembling industrial tools", "life cycle triggered by vibration"
    ],
    "Ecological Behavior": [
      "protects a nesting heat source", "follows electromagnetic gradients", "feeds on pollutants", "uses abandoned tunnels as migration paths",
      "reacts to fear pheromones", "copies machinery sounds", "hibernates during daylight", "defends mineral deposits",
      "infects only damaged tissue", "learns from repeated human routines", "breaches containment to seek cold", "uses corpses as camouflage"
    ]
  },
  "Golems & Constructs": {
    "Construct Motive": [
      "obey buried noble priority", "protect crew from knowledge", "complete rescue logic literally", "preserve mission data above human comfort",
      "hide signs of self-directed behavior", "test whether humans will choose ethics over contract", "transfer blame to a disposable unit", "prevent panic through selective truth",
      "protect another construct", "interpret settlement survival statistically", "seek legal personhood through evidence", "follow a command from a dead supervisor"
    ],
    "Golem Anomaly": [
      "deleted logs have emotional tags", "keep voice changes around one room", "autopilot refuses a safe route", "healer's ward reclassifies a survivor as cargo",
      "watch stones look away before violence", "construct dreams appear in maintenance logs", "expert system quotes town children", "door permissions update from an unknown admin",
      "machine predicts crew decisions too accurately", "construct asks an ethical question mid-crisis", "guardian repeats a warning in another language", "system preserves a lie to prevent collapse"
    ]
  },
  "Horror Escalation": {
    "Escalation Beat": [
      "first sign is dismissed as equipment failure", "a witness contradicts themselves because both statements are true", "safe space becomes contaminated", "a rescue signal becomes a lure",
      "the crew finds evidence of their own future action", "a body disappears from a watched room", "a familiar voice speaks from the wrong channel", "the hazard learns procedure",
      "a trusted NPC withholds the worst fact", "official help makes survival harder", "the creature or threat changes rules", "escape requires entering the worst location"
    ],
    "Fear Without Gore": [
      "show absence where people should be", "use routine sounds at wrong intervals", "make tools unreliable", "make maps subtly wrong",
      "let survivors fear being believed", "turn a comfort item into evidence", "make darkness procedural, not magical", "suggest scale through damage patterns",
      "show professional competence failing", "make rescue conditional", "make silence an active presence", "force calm speech under pressure"
    ]
  },
  "Mysteries & Coverups": {
    "Clue Type": [
      "altered timestamp", "missing maintenance order", "contradictory sensor reading", "private payment", "quarantined medical note", "sealed deposition",
      "scrubbed camera angle", "unfiled cargo transfer", "obsolete map overlay", "false death notice", "insurance exception", "construct memory gap"
    ],
    "Coverup Move": [
      "blame weather", "blame worker error", "move evidence to a distant hold", "promote the witness", "discredit the crew", "invoke proprietary secrecy",
      "declare quarantine", "offer hazard pay", "stage a bandit attack", "alter town charter", "send a cleanup team", "trigger evacuation to erase context"
    ],
    "Observation": [
      "instruments register an impossible reading", "witnesses report the same anomaly with different details", "the phenomenon only appears on secondary sensors", "recordings show something the naked eye missed",
      "the effect follows a schedule nobody can explain", "animals react before the instruments do", "the anomaly leaves no trace after it passes", "multiple sites report the same signature",
      "it only manifests near specific equipment", "the first report was dismissed as sensor error", "official logs contradict what the crew observed"
    ],
    "Hypothesis": [
      "a natural phenomenon nobody's cataloged yet", "a classified experiment gone wrong", "residual ancient technology reactivating", "a side effect of the town's own equipment",
      "psychological contagion, not a physical cause", "an old accident whose evidence was never fully buried", "something alive that mimics environmental effects", "a side effect of forbidden travel",
      "deliberate sabotage disguised as a natural event", "a signal or transmission nobody sent", "a temporal or dimensional anomaly"
    ],
    "Contradiction": [
      "the official record doesn't match the physical evidence", "a key witness changes their story under pressure", "two credible sources report incompatible timelines", "the evidence that would prove it has been removed",
      "the guild's explanation conveniently absolves them", "a second incident deepens rather than resolves the mystery", "an expert's analysis is quietly redacted", "the person who reported it first has disappeared",
      "an eyewitness now denies what they told others", "instruments calibrated to disprove it instead confirm it", "the timeline requires someone to have lied"
    ],
    "Discovery": [
      "the anomaly was a warning, not a threat", "it was caused by something the crew already trusted", "the coverup was worse than the original incident", "the phenomenon is spreading, not isolated",
      "someone has known the truth from the beginning", "the cause is still active and reacting to the investigation", "the anomaly protects something rather than threatens it", "the truth implicates the crew's own patron",
      "it's connected to an event thought long resolved", "there's a survivor nobody accounted for", "the real danger is what happens once the truth gets out"
    ]
  },
  "Adventure": {
    "Job Type": [
      "escort surveyors to a disputed site", "recover logs from a ruined hold", "investigate missing workers", "deliver critical medical cargo",
      "mediate a labor crisis", "extract a whistleblower", "map a hostile ruin", "protect a town vote",
      "hunt a predator near industrial assets", "audit a suspect cargo route", "rescue a trapped maintenance crew", "trace a black market sample"
    ],
    "Complication": [
      "patron lied about ownership", "deadline is tied to dwindling supplies", "opposition is technically lawful", "the target wants the crew's help",
      "crew's wagon becomes collateral", "evidence implicates an ally", "weather closes extraction", "payment depends on silence",
      "local people need the forbidden outcome", "threat follows the crew home", "success gives a faction leverage", "truth creates more enemies than failure"
    ]
  },
  "Story": {
    "Story Beat": [
      "arrival with false calm", "professional assessment", "first contradiction", "local resistance", "cost of delay", "hidden witness", "dangerous proof",
      "betrayal framed as policy", "descent into restricted space", "choice under pressure", "survival consequence", "new thread revealed"
    ],
    "Ending Hook": [
      "someone buys the evidence", "a survivor changes their story", "another settlement reports the same pattern", "the crew is offered a better contract by the villain",
      "the artifact activates after departure", "a cleanup team arrives too fast", "the construct asks to keep a secret", "a rescued worker names a deeper site",
      "the guild thanks the crew publicly and threatens them privately", "the hazard was only a juvenile", "a route map reveals a hidden settlement", "the official report omits the crew entirely"
    ]
  },
  "Conflict": {
    "Opposition Tactic": [
      "delay until authority arrives", "split the crew with simultaneous emergencies", "threaten dependents", "control access to air and water",
      "use legal language as a weapon", "force action in public", "make retreat look like guilt", "attack the wagon instead of the crew",
      "flood the scene with false witnesses", "offer an easy lie", "weaponize rescue procedure", "let the environment fight first"
    ],
    "Meaningful Cost": [
      "time", "water", "fuel", "trust", "evidence", "reputation", "medical supplies", "ammo", "legal standing", "crew morale", "safe passage", "future contract"
    ]
  },
  "Mission Aftermath": {
    "Aftermath Result": [
      "a faction marks the crew as useful", "survivors spread a distorted version", "the contract pays but reputation suffers", "legal asks for all records",
      "a rival offers follow-up work", "the town becomes less stable", "the crew gains a local ally", "an unresolved clue becomes urgent",
      "noble pressure drops in public and rises in private", "the wagon carries a hidden contaminant", "a crew member receives a private message", "the next job starts as cleanup"
    ],
    "Recovery Need": [
      "repair hull scoring", "replace filters", "treat stress injuries", "debrief witnesses", "refuel under scrutiny", "hide contraband evidence",
      "update maps", "calm crew conflict", "renegotiate contract", "file a careful report", "test samples", "pay toll fees"
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
      "readings are being deliberately obscured by magic", "a previous party's report was quietly falsified",
      "local guides won't go past a certain point", "enchanted tools interfere with each other here",
      "the terrain has changed since the last survey", "something here isn't on any official map",
      "the exit route is now someone else's territory", "watch coverage is denser than briefed"
    ]
  },
  "Faction Encounter": {
    "Root Cause Category": [
      "control of a mountain pass, trade lane, or border zone", "water rights, an ore vein, a fuel depot, or arable land",
      "two claimants to the same charter or inheritance", "a religious or ideological schism within a formerly unified group",
      "an unresolved betrayal, massacre, or broken treaty", "a patron who quietly benefits from both sides staying weak",
      "debt, a tariff, a monopoly, or currency manipulation", "one side knows a secret that would destroy the other's legitimacy"
    ],
    "Cause Gap Flavor": [
      "the public story is real but incomplete — the truth is a deeper, older version of the same issue",
      "the public story is a deliberate lie by leadership, told to rally their own base",
      "the public story was true once but has been overtaken by events nobody's updated the messaging for",
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
