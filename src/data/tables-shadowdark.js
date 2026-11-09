// tables-shadowdark.js — the Shadowdark genre pack's own oracle tables
// (direct request, 2026-11-08: "random tables for carousing"). Original
// writing for this app, not text from the Shadowdark RPG or its zines: a
// night of carousing between delves, rolled as an outcome (how the night
// went), a complication (what it cost), a boon (what it brought) and who
// the party met. The GM sets the stakes (gold spent, XP gained) by their
// own rules; these give the story.

export const SHADOWDARK_TABLES = {
  Carousing: {
    'Night Out': [
      'A long night of dice in a smoky back room',
      'A feast thrown in the party’s honour that nobody quite paid for',
      'A drinking contest with a dwarf who claims to have never lost',
      'A masked revel in a noble’s garden that spills into the street',
      'A pilgrimage of every tavern on the river road, one after another',
      'A quiet night of stories with old soldiers by the hearth',
      'A wedding the party gatecrashes and ends up hosting',
      'A wager on a rat race that escalates into a city-wide event',
      'A night at the opera that ends with someone on stage',
      'A bonfire with travelling players outside the walls',
      'A temple festival where the wine is blessed and the priests are not',
      'An auction of “relics” that the party bids on far too freely',
    ],
    'Complication': [
      'Wakes in a stranger’s bed with a borrowed name',
      'Owes a debt to someone who does not forget debts',
      'Insulted a local champion, who now demands a duel at dawn',
      'Lost a cherished item in a wager and cannot remember to whom',
      'Is now betrothed, by every witness’s account',
      'Was seen doing something the watch would like to discuss',
      'Bought a deed to land nobody in town has heard of',
      'Joined a secret society during a toast and cannot leave',
      'Has a new tattoo whose meaning is unsettling to scholars',
      'Is barred from the best inn in town for a year',
      'Accidentally promised to escort a stranger somewhere dangerous',
      'Spent a little more coin than they had; a creditor waits outside',
    ],
    'Boon': [
      'Learns a rumour that leads to a forgotten tomb',
      'Gains a friend in the local guard who owes them one',
      'Wins a crude map in a game of chance',
      'Is gifted a minor curio by a grateful merchant',
      'Hears the name of someone who buys strange relics, no questions asked',
      'Charms a guild master into a favourable introduction',
      'Gains a hireling who swears loyalty, sober or not',
      'Learns the patrol routes of the city watch',
      'Is offered a job by a stranger in a hooded cloak',
      'Wins back more than they spent, for once',
      'Earns the respect of a rival adventuring party',
      'Is remembered fondly; drinks are free here for a month',
    ],
    'Who You Met': [
      'A bard collecting tales of the party, true or not',
      'A retired adventurer with one eye and many regrets',
      'A tax collector off duty and dangerously generous',
      'A young noble running from an arranged match',
      'A fence who admires good work',
      'A priest of a minor god who needs a favour',
      'A cartographer who swears the dungeon map is wrong',
      'A cutpurse who returns what they took, with a note',
      'A merchant prince in disguise',
      'A witch’s apprentice selling questionable tonics',
      'A rival who smiles too much',
      'An old flame of one of the party',
    ],
  },
};
