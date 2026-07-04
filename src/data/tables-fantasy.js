// tables-fantasy.js — a Fantasy (D&D-style) genre pack (Phase 9,
// "genre-aware, not genre-locked"). Original content in this project's
// own voice, not a transcription of any sourcebook.
//
// Deliberately mirrors data/tables.js's top-level category NAMES for the
// handful the app references by exact path (domain/copilot.js's
// suggestedOraclePath, domain/session.js's generateNpc) — Characters,
// Location Themes, Plot Engine, Miscellaneous, Trade & Cargo — so those
// features work unchanged regardless of which genre pack is active. The
// category label stays put; only the entries underneath carry genre
// flavor. Everything else is additional depth, not required by any code
// path.
export const FANTASY_TABLES = {
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
    ]
  },
  "Location Themes": {
    "Sensory Detail": [
      "candle smoke thick in low rafters", "moss softening every stone underfoot",
      "the creak of a wind older than the walls", "cold that clings even near the hearth",
      "distant bells marking hours no one keeps", "the smell of rain on old parchment",
      "torchlight guttering without a draft", "birdsong that stops all at once",
      "dust motes hanging still in shafts of light", "the hush of a room that expects visitors"
    ],
    "District Type": [
      "walled market town", "flooded ruin district", "temple quarter", "thieves' warren",
      "abandoned noble estate", "frontier trading post", "sacred grove", "mining settlement",
      "river port", "besieged border keep"
    ]
  },
  "Plot Engine": {
    "Plot Target": [
      "an heir with a disputed claim", "a village bound by an old and hungry pact",
      "a relic sealed away for good reason", "a rigged succession within a noble house",
      "a forbidden grimoire", "a witness to a massacre no one admits happened",
      "a smuggled shipment of enchanted contraband", "a hostage held for political leverage",
      "a compromised holy site", "a memory a god wants forgotten"
    ],
    "Plot Method": [
      "blackmail through a forged confession", "sabotage disguised as bad omens",
      "a staged rescue to earn misplaced trust", "planted evidence against a convenient scapegoat",
      "a controlled rumor timed to a festival", "old debts called in all at once",
      "a manufactured miracle to justify a crackdown", "quiet replacement of a trusted advisor",
      "a curse dressed up as coincidence", "a false prophecy routed through a willing oracle"
    ],
    "Scene Driver": [
      "a simple errand goes wrong the moment payment is due",
      "an old ally resurfaces with an offer too good to be clean",
      "a patrol forces an early move",
      "a rival party is already on-site",
      "the patron changes the terms mid-quest",
      "someone the party trusts turns out compromised",
      "a countdown starts nobody agreed to",
      "the quarry already knows the party is coming"
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
  "Factions": {
    "Faction Type": [
      "noble house", "merchant guild", "temple order", "bandit company",
      "arcane academy", "border militia", "druidic circle", "smuggler ring",
      "cult of a forgotten god", "free company of mercenaries"
    ],
    "Faction Goal": [
      "corner the trade in enchanted goods", "protect a sacred site's neutrality",
      "unionize a guild's indentured workers", "expand territory before a rival does",
      "expose a rival house's secrets without being caught", "keep a dangerous bloodline hidden",
      "buy legitimacy through public works", "eliminate a specific political liability",
      "control a region's trade routes", "recruit talent before a rival party does"
    ]
  },
  "Threats": {
    "Security Response": [
      "militia patrol with hounds", "a knightly order response, an hour out",
      "a magical ward sealing every exit", "a bounty posted before the party leaves town",
      "a rival mage tracing the working live", "a mercenary company called in on retainer",
      "a blessing that flags the party at every threshold", "a rival party tipped off for a cut",
      "watchful spirits re-tasked to the party specifically", "a contact quietly selling out the party's plans"
    ],
    "Enemy Encounter": [
      "a garrison detail, better equipped than expected",
      "a rival party already mid-quest",
      "a knight with a personal grudge",
      "a bound spirit defending its own territory",
      "bandits collecting on an unrelated debt",
      "a bounty hunter who's done their homework",
      "a compromised ally forced to turn",
      "a rival mage countering the working in real time"
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
  }
};
