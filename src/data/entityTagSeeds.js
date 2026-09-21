// entityTagSeeds.js — genre-flavored tag SUGGESTIONS offered in the Cast
// entity tag editor's autocomplete (domain/entities.js's listTagVocabulary),
// the same non-destructive "seeded, never force-set" posture the Trade
// Economy Model's own Location-tag injection already uses there (a GM is
// never required to use any of these — they're just what shows up in the
// datalist before anything's been typed yet). Direct follow-up request:
// "make the scifi tags tied to the SciFi (generic) genre and create
// similar but appropriate fantasy tags for Fantasy (generic) genre."
//
// Keyed by entity type (domain/entities.js's ENTITY_TYPES), one flat array
// of plain-text suggestions per genre pack — data, not code, same posture
// as every other content catalog in src/data/. Only 'sci-fi-generic' and
// 'fantasy' are covered (the two genre packs actually named in the
// request); 'cyberpunk'/'dnd5e' fall through to no genre-specific seeds
// (entityTagSeedsFor returns []) rather than guessing unrequested content
// for them.
const ENTITY_TAG_SEEDS_BY_GENRE = {
  'sci-fi-generic': {
    npc: ['Pilot', 'Mercenary', 'Corporate', 'Smuggler', 'Android', 'Scientist', 'Soldier', 'Informant'],
    location: ['Space Station', 'Colony', 'Derelict', 'Frontier Outpost', 'Megacity', 'Asteroid Base'],
    faction: ['Corporation', 'Syndicate', 'Military', 'Rebel Cell', 'Trade Guild'],
    asset: ['Starship Part', 'Cybernetic', 'Survival Gear', 'Power Cell'],
    item: ['Blaster', 'Datapad', 'Medkit', 'Power Cell'],
    lore: ['Corporate History', 'Alien Artifact', 'Star Chart', 'Old Earth Legend'],
    conflict: ['Border Dispute', 'Resource War', 'Corporate Rivalry'],
    lifeform: ['Xenofauna', 'Synthetic', 'Parasite', 'Apex Predator'],
  },
  fantasy: {
    npc: ['Knight', 'Bandit', 'Wizard', 'Cleric', 'Noble', 'Peasant', 'Merchant', 'Ranger'],
    location: ['Village', 'Castle', 'Forest', 'Dungeon', 'Temple', 'Trade Town'],
    faction: ['Kingdom', 'Cult', 'Guild', 'Bandit Clan', 'Holy Order'],
    asset: ['Enchanted Item', 'Warhorse', 'Provisions', 'Herbal Remedy'],
    item: ['Sword', 'Potion', 'Scroll', 'Shield'],
    lore: ['Prophecy', 'Ancient History', 'Legend', 'Forbidden Rite'],
    conflict: ['Border War', 'Blood Feud', 'Succession Crisis'],
    lifeform: ['Monster', 'Beast', 'Undead', 'Fey'],
  },
};

// 'character' (domain/party.js) is the one reserved, mechanically special
// npc tag — tagging an NPC with it is what makes them a Party member, same
// significance as 'vehicle'/'starship' elsewhere — not just a descriptive
// flavor tag like the rest of this file's own seeds. Direct follow-up
// request: "include the reserved tag 'character' in the 5LFB and every
// genre that uses the Party panel" — the Party panel itself is never
// genre-gated (it's not in GATEABLE_MODULES; every Rules Profile keeps it),
// so this is offered for every npc-type vocabulary regardless of genre
// pack, INCLUDING one with no other seeds defined at all (cyberpunk/dnd5e)
// — a special case ahead of the per-genre lookup below, not one more entry
// to remember adding to each genre's own npc array.
const RESERVED_NPC_TAG_SEEDS = ['character'];

/** Plain genre-flavored suggestions for one entity type, or [] when this
 *  genre pack/entity type has none seeded. An npc lookup always leads with
 *  the reserved 'character' tag (see RESERVED_NPC_TAG_SEEDS above),
 *  regardless of genre pack. */
export function entityTagSeedsFor(genrePackId, entityType) {
  const byType = ENTITY_TAG_SEEDS_BY_GENRE[genrePackId];
  const genreSeeds = (byType && byType[entityType]) || [];
  return entityType === 'npc' ? [...RESERVED_NPC_TAG_SEEDS, ...genreSeeds] : genreSeeds;
}

// Five Leagues from the Borderlands' own canonical Location categories —
// Core rulebook p.68 (Step 2: Establish Settlements) and p.92-94 (Encounter
// Locations: Enemy Camps, Enemy Hideouts, Delves, Monster Lairs, Unexplored
// Locations) — direct follow-up request: "Make the tags reflect the types
// of locations specific to 5LFB for the entity tags of Location for 5LFB."
// These OVERRIDE the generic 'fantasy' location seeds above (rather than
// merging with them) when Five Leagues is the active ruleset: 5LFB's own
// location taxonomy (a Delve vs. a Monster Lair vs. an Enemy Hideout) means
// nothing overlaps a generic fantasy Location tag like "Village"/"Forest",
// and offering both sets at once would just be noise in the picker.
export const FIVELEAGUES_LOCATION_TAG_SEEDS = ['Settlement', 'Enemy Camp', 'Enemy Hideout', 'Delve', 'Monster Lair', 'Unexplored Location'];

/** Location-tag suggestions specifically — same shape as entityTagSeedsFor,
 *  but swaps in the 5LFB-specific list whenever Five Leagues is the active
 *  ruleset (settings.statRuleset), regardless of which genre pack a
 *  campaign happens to be on (5LFB campaigns are always 'fantasy' today,
 *  but this checks the actual ruleset rather than assuming that forever). */
export function locationTagSeedsFor(genrePackId, statRulesetId) {
  if (statRulesetId === 'fiveleagues') return FIVELEAGUES_LOCATION_TAG_SEEDS;
  return entityTagSeedsFor(genrePackId, 'location');
}
