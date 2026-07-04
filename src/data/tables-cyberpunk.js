// tables-cyberpunk.js — a Cyberpunk / Shadowrun-flavored genre pack
// (Phase 9, "genre-aware, not genre-locked"). Original content in this
// project's own voice, not a transcription of any sourcebook.
//
// Deliberately mirrors data/tables.js's top-level category NAMES for the
// handful the app references by exact path (domain/copilot.js's
// suggestedOraclePath, domain/session.js's generateNpc) — Characters,
// Location Themes, Plot Engine, Miscellaneous, Trade & Cargo — so those
// features work unchanged regardless of which genre pack is active. The
// category label stays put; only the entries underneath carry genre
// flavor. Everything else is additional depth, not required by any code
// path.
export const CYBERPUNK_TABLES = {
  "Core Oracles": {
    "Action": [
      "Infiltrate", "Extract", "Betray", "Hack", "Sabotage", "Negotiate", "Evade", "Expose",
      "Steal", "Erase", "Protect", "Track", "Bribe", "Intimidate", "Smuggle", "Frame",
      "Recruit", "Burn", "Ghost", "Leverage"
    ],
    "Theme": [
      "Debt", "Loyalty", "Corporate control", "Identity", "Surveillance", "Scarcity", "Augmentation",
      "Memory", "Trust", "Obsolescence", "Rebellion", "Isolation", "Addiction", "Legacy",
      "Exposure", "Ownership", "Complicity", "Reinvention", "Paranoia", "Freedom"
    ]
  },
  "Characters": {
    "First Look": [
      "chrome arm left deliberately bare",
      "designer suit over a street-cheap dermal patch",
      "eyes that don't quite track together",
      "corporate pin worn like armor",
      "hands that shake between jobs",
      "voice modulated to hide an accent",
      "old analog watch on a fully augmented arm",
      "scar tissue where an ID chip was cut out",
      "expensive haircut, secondhand boots",
      "smile that arrives half a second late"
    ],
    "Role": [
      "fixer", "corporate deniable asset", "street medic", "netrunner", "rigger", "gang lieutenant",
      "ex-corporate security", "information broker", "smuggler captain", "augmentation clinic owner",
      "union organizer", "black-market cyberdoc", "bounty hunter", "conspiracy journalist", "awakened talent"
    ],
    "Goal": [
      "pay off a body-shop debt", "get a family member out of corporate custody",
      "prove a hit was a corporate hit, not an accident", "disappear completely",
      "collect enough to retire from the life", "protect a crew from a burned contract",
      "expose a data-broker's client list", "win back a seat at a corp's table",
      "keep an illegal augmentation clinic running", "settle a score with a former handler"
    ],
    "Revealed Aspect": [
      "is still reporting to their old corporate handler",
      "has a black-market augmentation nobody's supposed to know about",
      "owes a debt to someone at this table",
      "is running a long con on their own crew",
      "has already sold out once and regrets it",
      "carries evidence that could burn a whole corp",
      "is more machine than they let on",
      "is protecting someone the crew hasn't met yet",
      "has a kill order out with their name half-redacted",
      "knows the job is a setup and hasn't said so"
    ],
    "Disposition": [
      "helpful but transactional", "openly hostile to corp affiliates", "professionally unreadable",
      "desperate and hiding it badly", "friendly until the money runs out", "paranoid about surveillance",
      "insulted by amateur hour", "curious about the crew's angle", "polite but stalling",
      "burned out and past caring"
    ],
    "Name": [
      "Mireille Okoye", "Dashiell Cruz", "Priya Renfield", "Kato Suarez", "Nyla Voss",
      "Reiner Achebe", "Talise Marsh", "Osei Callahan", "Farrin Dubois", "Zeke Larsen",
      "Wren Adeyemi", "Cassius Ibarra", "Sable Nakamura", "Denny Okonkwo", "Ilya Castellan"
    ]
  },
  "Location Themes": {
    "Sensory Detail": [
      "neon bleeding through rain-slick glass", "ozone smell from overworked cooling units",
      "advertisements that recognize your face", "static hum of a jammed comm frequency",
      "corridor lights that flicker on a delay", "the bass of a club felt through the floor",
      "recycled air that never quite clears", "graffiti that updates itself overnight",
      "drone traffic loud enough to drown conversation", "the smell of solder and cheap noodles"
    ],
    "District Type": [
      "corporate arcology", "flooded underlevel", "black-market night market", "gang-controlled block",
      "abandoned megastructure squat", "augmentation clinic row", "data-haven server farm",
      "gated executive enclave", "transit hub black spot", "off-grid maker district"
    ]
  },
  "Plot Engine": {
    "Plot Target": [
      "a data shard with a corp's dirty ledger", "a defector with a price on their head",
      "a prototype augmentation still in trials", "a rigged election inside a corp arcology",
      "a black-market AI fragment", "a witness to a cover-up", "a smuggled shipment of gray-market cyberware",
      "a hostage held for corporate leverage", "a compromised security key", "a memory that shouldn't exist"
    ],
    "Plot Method": [
      "blackmail through leaked biometric data", "sabotage disguised as a routine outage",
      "a staged extraction to build false trust", "planted evidence against a convenient scapegoat",
      "a controlled leak timed to a earnings call", "debt markers called in all at once",
      "a manufactured PR crisis to justify a crackdown", "quiet replacement of key personnel",
      "a weaponized recall notice", "a false flag hack routed through the crew"
    ],
    "Scene Driver": [
      "a routine job goes sideways the moment payment is due",
      "an old contact resurfaces with an offer too good to be clean",
      "a security sweep forces an early move",
      "a rival crew is already on-site",
      "the client changes the terms mid-job",
      "someone the crew trusts turns out compromised",
      "a countdown starts nobody agreed to",
      "the target already knows they're coming"
    ]
  },
  "Miscellaneous": {
    "Story Complication": [
      "the data is real but already sold to someone else",
      "the extraction target doesn't want to be extracted",
      "the safest route is owned by a rival gang",
      "the client is also the target's next of kin",
      "the hack succeeds but leaves an unmistakable signature",
      "the evidence implicates an ally, not the enemy",
      "the payment clears but the account is flagged",
      "the safehouse was never actually safe",
      "the getaway driver is the one being hunted",
      "the job was a test, and it's still being graded"
    ],
    "Story Clue": [
      "a corp ID badge with the photo scratched off",
      "a burner comm with one saved number",
      "biometric data that doesn't match the registered owner",
      "a maintenance log with a suspicious gap",
      "an augmentation serial number traced to a shell company",
      "a receipt for a room that was never booked",
      "a voice-print buried in a routine broadcast",
      "an access log timestamped during a blackout",
      "a nickname only insiders would use",
      "a payment routed through one too many shells"
    ]
  },
  "Trade & Cargo": {
    "Cargo Problem": [
      "the shipment is gray-market cyberware, tagged if scanned",
      "the buyer wants proof of origin the crew doesn't have",
      "the goods are stolen from someone worse than the client",
      "customs drones are running an unscheduled sweep",
      "the cargo is a person, and they know it",
      "the manifest lists something other than what's inside",
      "a rival fence wants the same buyer",
      "the payment is in a currency about to crash",
      "the cargo needs cold storage the crew doesn't have",
      "half the shipment is already spoken for"
    ],
    "Trade Opportunity": [
      "black-market medical nanites in short supply", "decommissioned corp security drones, lightly used",
      "a data-broker paying premium for clean biometrics", "smuggled augmentation firmware updates",
      "a fence looking to offload hot electronics fast", "off-grid solar cells for a squat community",
      "counterfeit corp credentials, surprisingly good work", "a buyer for salvaged AI cores",
      "clean identities for sale, no questions", "bulk nutrient paste before a supply run dries up"
    ]
  },
  "Missions": {
    "Mission Type": [
      "extract a person before a corp buries them", "steal data before it's wiped",
      "sabotage a product launch", "protect a witness through a hostile district",
      "broker a truce between two crews", "plant evidence to frame a rival",
      "recover a stolen prototype", "deliver a package no one can trace",
      "expose a cover-up", "settle a debt with someone dangerous"
    ],
    "Patron": [
      "corporate fixer", "street gang boss", "data-broker", "disgraced executive",
      "underground journalist", "rival crew's handler", "augmentation clinic owner",
      "anonymous encrypted contact", "family of a victim", "a corp itself, through cutouts"
    ],
    "Twist": [
      "the patron caused the problem", "the target wants to be found",
      "success hands a rival crew everything they need", "the reward is access, not money",
      "the real client is hidden three cutouts deep", "the threat is a symptom of something bigger",
      "the official story is corporate-approved fiction", "the job is legal and still wrong",
      "the evidence is a person, not a file", "the deadline is shorter than stated"
    ],
    "Reward": [
      "clean identity papers", "corporate favor owed", "black-market augmentation upgrade",
      "safehouse access", "debt forgiveness", "exclusive fence contact",
      "hidden extraction route", "rare gray-market gear", "standing with a faction",
      "a name removed from a kill list"
    ],
    "Patron Benefit": [
      "pays in untraceable credit, no questions asked",
      "grants access to a corp-restricted database",
      "clears an old debt or warrant",
      "offers a standing introduction to a useful fixer",
      "throws in gear the crew actually needs",
      "guarantees follow-up work if this goes well",
      "shares intel the crew couldn't get elsewhere",
      "covers medical costs regardless of outcome",
      "puts in a good word with a wary faction",
      "looks the other way on the crew's other business"
    ],
    "Patron Hazard": [
      "isn't authorized to make this offer",
      "is being watched by someone dangerous",
      "already burned the last crew who took this job",
      "wants something the contract doesn't mention",
      "is lying about how clean this will be",
      "has a rival who will retaliate against whoever takes it",
      "can't actually deliver the promised reward",
      "is using the crew to settle a personal score",
      "will deny hiring the crew if it goes wrong",
      "is more desperate than the contract lets on"
    ],
    "Danger Pay Reason": [
      "the target has corporate security on retainer",
      "the extraction window is dangerously short",
      "there's no backup once the crew is inside",
      "the job requires burning a clean identity",
      "the last team sent didn't check back in",
      "the district alone is a threat after dark",
      "success means crossing a faction that won't forget",
      "the cargo or target fights back",
      "secrecy matters more than safety to the patron",
      "there's no way to verify the risk until it's too late"
    ]
  },
  "Factions": {
    "Faction Type": [
      "megacorp security division", "street gang", "data-haven collective", "fixer network",
      "augmentation clinic syndicate", "corporate espionage cell", "underground labor union",
      "black-market arms dealer ring", "rogue AI cult", "independent smuggler consortium"
    ],
    "Faction Goal": [
      "corner the augmentation black market", "protect a data-haven's neutrality",
      "unionize a corp's deniable-asset workforce", "expand territory before a rival does",
      "leak a corp's secrets without getting caught", "keep a compromised AI hidden and running",
      "buy legitimacy through public works", "eliminate a specific corporate liability",
      "control a district's power and water grid", "recruit talent before a rival crew does"
    ]
  },
  "Threats": {
    "Security Response": [
      "drone sweep with thermal imaging", "corporate response team, ten minutes out",
      "automated lockdown of the block", "bounty posted before the crew even leaves",
      "counter-hacker tracing the intrusion live", "private military contractor callout",
      "biometric alert flags every exit", "rival crew tipped off for a cut of the bounty",
      "surveillance drones re-tasked to the crew specifically", "a fixer quietly selling out the crew's location"
    ],
    "Enemy Encounter": [
      "corporate security detail, better equipped than expected",
      "a rival crew already mid-job",
      "an augmented enforcer with a personal grudge",
      "a rogue security AI defending its own territory",
      "gang muscle collecting on an unrelated debt",
      "a bounty hunter who's done their homework",
      "a compromised ally forced to turn",
      "a corporate netrunner counter-hacking in real time"
    ]
  },
  "Scenario Framing": {
    "Dilemma": [
      "the only clean extraction route belongs to a rival crew",
      "the fastest fix also erases the evidence that protects the crew",
      "the only cure is something the corp patented and won't release",
      "helping this block means burning trust with the block next door",
      "the truth would get everyone at this table killed"
    ],
    "Objective": [
      "recover something before a rival crew does", "get everyone out before lockdown",
      "prove what actually happened", "keep two factions from finding out about each other",
      "hold a position until an extraction window opens", "make a compromised system work one more time",
      "choose who gets the only working augmentation", "decide what the official record will say"
    ],
    "Framing NPCs": [
      "a handler whose orders don't fit the situation", "a witness who benefits from one version of events",
      "someone the crew already owes a favor", "a fixer who knows more than they're saying",
      "a bystander whose safety complicates every option", "a rival crew with the same job and fewer scruples"
    ],
    "Map Feature": [
      "a single chokepoint checkpoint everyone has to pass", "two blocks connected by a tunnel no one controls",
      "a rooftop vantage point worth fighting to hold", "a data cache that's only safe to tap once",
      "a barrier that protects and traps in equal measure", "a maintenance route only some NPCs know about"
    ]
  },
  "Environmental Hazards": {
    "Environmental Event": [
      "rolling blackout hits mid-job", "acid rain forces everyone under cover",
      "a jammed comm frequency cuts off backup", "flooding in the underlevels rises fast",
      "a drone swarm re-routes traffic without warning", "toxic runoff from a nearby plant",
      "a data-storm scrambles unshielded electronics", "structural failure in an aging arcology level",
      "a crowd surge during a public event", "extreme heat from a failed cooling grid",
      "a security lockdown seals an exit at random", "smog thick enough to blind sensors",
      "an EMP burst from a nearby skirmish", "a power surge fries unshielded cyberware",
      "a riot breaks out two blocks over", "contaminated water supply in the district",
      "a maintenance drone swarm mistakes the crew for debris", "sudden curfew enforcement",
      "an unstable structure groans under added weight", "a gas leak in an unmarked service tunnel",
      "static discharge from an overloaded grid", "a stampede triggered by a false alarm",
      "corrosive runoff eating through old infrastructure", "a sudden dead zone kills all wireless signal",
      "a scheduled demolition starts early"
    ],
    "Survey Problem": [
      "the floor plan on file doesn't match reality", "a marked safe route no longer is one",
      "sensor readings are being deliberately jammed", "a previous crew's intel was quietly falsified",
      "local contacts won't go past a certain block", "equipment interferes with itself in this district",
      "the terrain has changed since the last job here", "something here isn't on any official map",
      "the exit route is now someone else's territory", "surveillance coverage is denser than briefed"
    ]
  }
};
