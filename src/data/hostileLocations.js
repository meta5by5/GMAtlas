// hostileLocations.js — the HOSTILE Settings sourcebook's own gazetteer
// (docs/adr/0026-hostile-canon-locations.md), transcribed directly from
// assets/docs/Hostile setting.pdf's "World Data" (pp.27-49) and per-world
// write-up chapters. Three linked catalogs, imported in this order by
// domain/hostileLocations.js's importHostileLocations() so every
// cross-reference already exists by the time it's needed:
//
//   1. HOSTILE_BASES  — government/mining-authority bases (USSC, JASDF,
//      DRW, MRA), imported as real Location entities tagged #base, so a
//      world's Bases field can reference them the same way Trade Codes
//      references its own dropdown, rather than a static code lookup.
//   2. HOSTILE_STARS  — one entity per star system, tagged #star, whose
//      own `starSystem` field references ITSELF (its own name) — the
//      self-reference the World Profile UI uses to know "this Location
//      IS a star, hide the planet-only fields."
//   3. HOSTILE_LOCATIONS — the worlds themselves, each `starSystem`
//      pointing at the matching HOSTILE_STARS entry's name, and a
//      `locationKind` of 'planet' | 'orbit' | 'deepspace' driving a
//      matching #planet/#orbit/#deepspace tag: 'orbit' for a body
//      described as a moon orbiting a gas giant/brown dwarf rather than
//      a primary itself (Forlorn, Prosperity), 'deepspace' for an
//      unclaimed/independent asteroid not orbiting a habitable world
//      (LQ105, Exile, Rock 17, The Solomons), 'planet' otherwise.
//
// Each world entry's condensed `summary` paraphrases the book's own
// "Planetology"/"Development" prose (not verbatim — see the cited `page`
// to read the original in the Reference Library).
//
// Rollout status (a living checklist — extend zone by zone; the import
// mechanism needs no changes to pick up a new batch):
//   [x] Near Earth Zone (NEZ) — 30 worlds, 30 stars, this pass.
//   [ ] Fomalhaut Settlement Zone (FOM)
//   [ ] Capella Extraction Zone / New Concessions Zone (CAP, EZ6, EZ9, ...)
//
// Six Near Earth Zone worlds (Kibo, Forlorn, Exile, Paydirt, Goldstone,
// Requiem) have no dedicated "Planetology"/"Development" write-up in the
// sourcebook — they appear only in the compact World Data table and the
// Catalogue of Off-World Colonies star listing (pp.27-28, 50-53). Their
// `summary` says so honestly rather than inventing detail; `page` cites
// the table instead of a dedicated page.

export const HOSTILE_BASES = [
  { id: 'base-ussc', name: 'USSC', summary: 'United States Space Command — a US military base.', page: 45 },
  { id: 'base-jasdf', name: 'JASDF', summary: 'Japan Aerospace Defence Force — a Japanese military base.', page: 45 },
  { id: 'base-drw', name: 'DRW', summary: 'Deutsche Raumwaffe — a German (Franco-German) military base.', page: 45 },
  { id: 'base-mra', name: 'MRA', summary: 'Mining Regulatory Agency — a mining-authority presence/base.', page: 45 },
];

export const HOSTILE_STARS = [
  { id: 'star-wise-0855-0714', name: 'Wise 0855-0714', zone: 'Near Earth Zone', hex: '0105', starSystem: 'Wise 0855-0714', summary: 'A dim sub-brown dwarf nicknamed "Meiji" by surveyors; turbulent atmospheric clouds rain molten iron, hot sand and salts.', page: 66 },
  { id: 'star-luhman-16', name: 'Luhman 16', zone: 'Near Earth Zone', hex: '0107', starSystem: 'Luhman 16', summary: 'A close binary of brown dwarfs producing little light; orbital perturbations trigger global volcanism on worlds nearby every four years.', page: 66 },
  { id: 'star-lalande-21185', name: 'Lalande 21185', zone: 'Near Earth Zone', hex: '0108', starSystem: 'Lalande 21185', summary: 'An M2V red dwarf.', page: 68 },
  { id: 'star-alpha-centauri', name: 'Alpha Centauri', zone: 'Near Earth Zone', hex: '0206', starSystem: 'Alpha Centauri', summary: 'A binary of G2V and K1V stars with an M6V red dwarf companion — the first interstellar system humanity reached, in 2150.', page: 64 },
  { id: 'star-36-ophiucus', name: '36 Ophiucus', zone: 'Near Earth Zone', hex: '0301', starSystem: '36 Ophiucus', summary: 'A binary of K2V stars.', page: 28 },
  { id: 'star-gliese-674', name: 'Gliese 674', zone: 'Near Earth Zone', hex: '0302', starSystem: 'Gliese 674', summary: 'An M3V red dwarf orbited by a gas giant, Scamander.', page: 225 },
  { id: 'star-scr-1845-6357', name: 'SCR 1845-6357', zone: 'Near Earth Zone', hex: '0303', starSystem: 'SCR 1845-6357', summary: 'An M8V red dwarf with a brown dwarf companion; the brown dwarf\'s residual heat sustains life on a nearby moon.', page: 69 },
  { id: 'star-ross-154', name: 'Ross 154', zone: 'Near Earth Zone', hex: '0304', starSystem: 'Ross 154', summary: 'An M3V red dwarf.', page: 62 },
  { id: 'star-barnards-star', name: 'Barnard\'s Star', zone: 'Near Earth Zone', hex: '0305', starSystem: 'Barnard\'s Star', summary: 'An M4V red dwarf near the outer limit of its habitable zone.', page: 66 },
  { id: 'star-dx-cancri', name: 'DX Cancri', zone: 'Near Earth Zone', hex: '0310', starSystem: 'DX Cancri', summary: 'An M6V red dwarf.', page: 58 },
  { id: 'star-struve-2398', name: 'Struve 2398', zone: 'Near Earth Zone', hex: '0402', starSystem: 'Struve 2398', summary: 'A binary of two M3V red dwarfs, one a volatile flare star.', page: 61 },
  { id: 'star-the-sun', name: 'The Sun', zone: 'Near Earth Zone', hex: '0406', starSystem: 'The Sun', summary: 'G2V — humanity\'s home star.', page: 59 },
  { id: 'star-sirius', name: 'Sirius', zone: 'Near Earth Zone', hex: '0409', starSystem: 'Sirius', summary: 'An A1V star with a white dwarf companion, Sirius B, whose close-in habitable zone hosts a chthonian world.', page: 67 },
  { id: 'star-procyon', name: 'Procyon', zone: 'Near Earth Zone', hex: '0410', starSystem: 'Procyon', summary: 'An F5V star with a white dwarf companion.', page: 55 },
  { id: 'star-wolf-359', name: 'Wolf 359', zone: 'Near Earth Zone', hex: '0509', starSystem: 'Wolf 359', summary: 'An M6V red dwarf, barely bigger than Jupiter.', page: 57 },
  { id: 'star-luytens-star', name: 'Luyten\'s Star', zone: 'Near Earth Zone', hex: '0510', starSystem: 'Luyten\'s Star', summary: 'An M3V red dwarf.', page: 56 },
  { id: 'star-altair', name: 'Altair', zone: 'Near Earth Zone', hex: '0601', starSystem: 'Altair', summary: 'An A7V star.', page: 28 },
  { id: 'star-61-cygni', name: '61 Cygni', zone: 'Near Earth Zone', hex: '0603', starSystem: '61 Cygni', summary: 'A close binary of K5V and K7V stars.', page: 65 },
  { id: 'star-kapteyns-star', name: 'Kapteyn\'s Star', zone: 'Near Earth Zone', hex: '0609', starSystem: 'Kapteyn\'s Star', summary: 'An M1 red sub-dwarf.', page: 69 },
  { id: 'star-herschel-5173', name: 'Herschel 5173', zone: 'Near Earth Zone', hex: '0701', starSystem: 'Herschel 5173', summary: 'A binary of K3V and M4V stars.', page: 28 },
  { id: 'star-sigma-draconis', name: 'Sigma Draconis', zone: 'Near Earth Zone', hex: '0702', starSystem: 'Sigma Draconis', summary: 'A G9V star.', page: 28 },
  { id: 'star-ez-aquarii', name: 'EZ Aquarii', zone: 'Near Earth Zone', hex: '0704', starSystem: 'EZ Aquarii', summary: 'A trinary of three M5V red dwarfs, two locked close together with a third orbiting further out.', page: 54 },
  { id: 'star-uv-ceti', name: 'UV Ceti', zone: 'Near Earth Zone', hex: '0707', starSystem: 'UV Ceti', summary: 'A binary of M5V and M6V red dwarfs; the primary is the namesake of "UV Ceti-type" flare stars.', page: 56 },
  { id: 'star-teegardens-star', name: 'Teegarden\'s Star', zone: 'Near Earth Zone', hex: '0709', starSystem: 'Teegarden\'s Star', summary: 'An M7V red dwarf.', page: 58 },
  { id: 'star-epsilon-indi', name: 'Epsilon Indi', zone: 'Near Earth Zone', hex: '0804', starSystem: 'Epsilon Indi', summary: 'A trinary of a K5V star and two brown dwarfs.', page: 57 },
  { id: 'star-ross-248', name: 'Ross 248', zone: 'Near Earth Zone', hex: '0805', starSystem: 'Ross 248', summary: 'An M6V red dwarf.', page: 61 },
  { id: 'star-groombridge-34', name: 'Groombridge 34', zone: 'Near Earth Zone', hex: '0806', starSystem: 'Groombridge 34', summary: 'A close binary of M1V and M4V red dwarfs.', page: 63 },
  { id: 'star-tau-ceti-system', name: 'Tau Ceti System', zone: 'Near Earth Zone', hex: '0807', starSystem: 'Tau Ceti System', summary: 'G8V — orbited by three gas giants, several super-Earths, and a small Mars-sized world colonized by humans (named "Tau Ceti" after the star, ownership still contested).', page: 70 },
  { id: 'star-epsilon-eridani', name: 'Epsilon Eridani', zone: 'Near Earth Zone', hex: '0808', starSystem: 'Epsilon Eridani', summary: 'A K2V star with three gas giants and two asteroid belts, "The Belts," 3 and 20 AU out.', page: 69 },
  { id: 'star-keid', name: 'Keid', zone: 'Near Earth Zone', hex: '0810', starSystem: 'Keid', summary: 'A trinary of K1V, M4V and a white dwarf.', page: 28 },
];

export const HOSTILE_LOCATIONS = [
  {
    id: 'lq105', name: 'LQ105', zone: 'Near Earth Zone', starSystem: 'Wise 0855-0714', locationKind: 'deepspace', hex: '0105',
    starport: 'X', worldSize: '0', atmosphere: '0', hydrographics: '0', population: '0', government: '0', lawLevel: '0', techLevel: '0',
    bases: [], tradeCodes: ['asteroid'], gasGiant: true,
    summary: 'An unexplored 200km asteroid orbiting the dim brown dwarf Wise 0855-0714 ("Meiji"), flagged by surveyors as the best future landing site in the system. No colony, no starport — just iron-and-salt storms raining through Meiji\'s cloud layers.',
    page: 66,
  },
  {
    id: 'nevermind', name: 'Nevermind', zone: 'Near Earth Zone', starSystem: 'Luhman 16', locationKind: 'planet', hex: '0107',
    starport: 'D', worldSize: '5', atmosphere: '7', hydrographics: '7', population: '4', government: '8', lawLevel: '7', techLevel: '12',
    bases: [], tradeCodes: ['garden', 'non-industrial'], gasGiant: true,
    summary: 'A tidally-locked garden world orbiting a close binary of brown dwarfs. Global volcanism every four years triggers a six-month "Long Winter" where the seas freeze and temperatures crash to -50 degrees C. Western European Union miners and fishers work the volcanic-rich soils and a deep-sea-vent ecosystem under permanent twilight.',
    page: 66,
  },
  {
    id: 'olympus', name: 'Olympus', zone: 'Near Earth Zone', starSystem: 'Lalande 21185', locationKind: 'planet', hex: '0108',
    starport: 'C', worldSize: '6', atmosphere: 'A', hydrographics: '2', population: '4', government: '6', lawLevel: '9', techLevel: '12',
    bases: ['DRW', 'MRA'], tradeCodes: ['non-industrial'], gasGiant: false,
    summary: 'A volcanic, sulfur-atmosphere world (oxygen tanks and a survival suit required) with glowing red/orange/yellow fern-forests but no animal life. A Franco-German colony of roughly 60,000 lives at the geothermal-powered city of Sonnenstadt, anchored by a large Deutsche Raumwaffe base.',
    page: 68,
  },
  {
    id: 'ixion', name: 'Ixion', zone: 'Near Earth Zone', starSystem: 'Alpha Centauri', locationKind: 'planet', hex: '0206',
    starport: 'D', worldSize: '5', atmosphere: 'C', hydrographics: '5', population: '3', government: '1', lawLevel: '4', techLevel: '12',
    bases: [], tradeCodes: ['fluid-oceans'], gasGiant: true,
    summary: 'A hellish world in the Alpha Centauri system: a 150 degree C surface, choking hydrogen-sulfide clouds, lakes of liquid sulfuric acid, and native silicon-based "living battery" life. Eurodyne holds the scientific/colonial claim; Erebus mines exotic minerals (tantalum, palladium) exposed by the corrosive weathering, while independent settlers harvest the bioluminescent fungus klebrig.',
    page: 64,
  },
  {
    id: 'kibo', name: 'Kibo', zone: 'Near Earth Zone', starSystem: '36 Ophiucus', locationKind: 'planet', hex: '0301',
    starport: 'E', worldSize: '2', atmosphere: '0', hydrographics: '0', population: '3', government: '1', lawLevel: '2', techLevel: '12',
    bases: [], tradeCodes: ['vacuum'], gasGiant: true,
    summary: 'A frontier vacuum world (Starport E, a thousand-plus population) in the 36 Ophiucus binary system. No dedicated write-up survives beyond its World Data table entry — a blank slate for a GM to detail.',
    page: 28,
  },
  {
    id: 'forlorn', name: 'Forlorn', zone: 'Near Earth Zone', starSystem: 'Gliese 674', locationKind: 'orbit', hex: '0302',
    starport: 'D', worldSize: 'A', atmosphere: '2', hydrographics: '5', population: '2', government: '5', lawLevel: '8', techLevel: '12',
    bases: [], tradeCodes: [], gasGiant: false,
    summary: 'A chilly super-Earth that orbits a gas giant (Scamander) as a moon. Only a passing one-line mention survives in the sourcebook beyond its World Data table entry.',
    page: 225,
  },
  {
    id: 'prosperity', name: 'Prosperity', zone: 'Near Earth Zone', starSystem: 'SCR 1845-6357', locationKind: 'orbit', hex: '0303',
    starport: 'C', worldSize: '5', atmosphere: '5', hydrographics: '9', population: '6', government: '1', lawLevel: '4', techLevel: '12',
    bases: [], tradeCodes: ['non-industrial', 'water-world'], gasGiant: true,
    summary: 'An ocean moon orbiting a brown dwarf, wracked by a perpetual super-storm on its near side and murderous six-day tsunami-tides. Haruna Corporation\'s roughly 3 million colonists cling to fertile volcanic islands between the storm and the ice, sharing the water with tough amphibious predators.',
    page: 69,
  },
  {
    id: 'hiroshima', name: 'Hiroshima', zone: 'Near Earth Zone', starSystem: 'Ross 154', locationKind: 'planet', hex: '0304',
    starport: 'B', worldSize: '7', atmosphere: '7', hydrographics: '4', population: '6', government: '3', lawLevel: '3', techLevel: '12',
    bases: ['JASDF'], tradeCodes: ['agricultural', 'garden', 'non-industrial'], gasGiant: true,
    summary: 'A tidally-locked world whose trace atmospheric chlorine turns coastal sea-fog into a deadly phosgene-type gas, yet 8 million Japanese/Asia Pacific Partnership colonists thrive in the cleaner highlands, logging turquoise "marble trees" and drilling lowland oil.',
    page: 62,
  },
  {
    id: 'new-tokyo', name: 'New Tokyo', zone: 'Near Earth Zone', starSystem: 'Barnard\'s Star', locationKind: 'planet', hex: '0305',
    starport: 'C', worldSize: '6', atmosphere: '5', hydrographics: '8', population: '6', government: 'B', lawLevel: '8', techLevel: '12',
    bases: [], tradeCodes: ['agricultural', 'non-industrial'], gasGiant: true,
    summary: 'A tidally-locked river-delta world ruled for thirty years by Stan Yoshimura, a former Haruna executive who seized power after back-to-back disasters and refused to step down — sparking an ongoing guerrilla war against the Japanese-government-backed Kuro Shotai insurgency hiding in the vast swamp-root maze called the Motsureta.',
    page: 66,
  },
  {
    id: 'cyclops', name: 'Cyclops', zone: 'Near Earth Zone', starSystem: 'DX Cancri', locationKind: 'planet', hex: '0310',
    starport: 'D', worldSize: '3', atmosphere: '3', hydrographics: '1', population: '5', government: '1', lawLevel: '2', techLevel: '12',
    bases: [], tradeCodes: ['poor', 'non-industrial'], gasGiant: false,
    summary: 'A tidally-locked, thin-atmosphere world dominated by a single 1,230km meteor-impact crater ("The Eye"), where Matsuyama Mining works heavy-metal deposits. Roughly 250,000 miners face seismic quakes and hidden dust-pools that can swallow excavation machines whole.',
    page: 58,
  },
  {
    id: 'edo', name: 'Edo', zone: 'Near Earth Zone', starSystem: 'Struve 2398', locationKind: 'planet', hex: '0402',
    starport: 'E', worldSize: '4', atmosphere: '4', hydrographics: '5', population: '3', government: '1', lawLevel: '2', techLevel: '12',
    bases: [], tradeCodes: [], gasGiant: false,
    summary: 'A small world orbiting a volatile red-dwarf flare star, spared constant radiation only by a distant binary companion providing a real day/night cycle. Haruna Biolabs harvests its unusually radiation-diverse flora from surface stations, retreating to bunkers during solar storms.',
    page: 61,
  },
  {
    id: 'earth', name: 'Earth', zone: 'Near Earth Zone', starSystem: 'The Sun', locationKind: 'planet', hex: '0406',
    starport: 'A', worldSize: '8', atmosphere: '7', hydrographics: '7', population: '9', government: '7', lawLevel: '6', techLevel: '12',
    bases: ['JASDF', 'DRW', 'MRA', 'USSC'], tradeCodes: ['industrial', 'garden'], gasGiant: true,
    summary: 'Homeworld and Core World: ten billion people, an atmosphere permanently tainted by two centuries of industrialization, and a patchwork of corporate-dominated nation-states since the "Earth Union" world government collapsed in the First Recession of 2166. The Trans-Atmospheric Petroleum Pipeline at Macapa, Brazil hauls orbital cargo down a 30,000km orbital tower to a homeworld now dependent on Off-World imports.',
    page: 59,
  },
  {
    id: 'oppenheimer', name: 'Oppenheimer', zone: 'Near Earth Zone', starSystem: 'Sirius', locationKind: 'planet', hex: '0409',
    starport: 'C', worldSize: '6', atmosphere: 'C', hydrographics: '0', population: '4', government: '5', lawLevel: '4', techLevel: '12',
    bases: [], tradeCodes: ['desert', 'non-industrial'], gasGiant: false,
    summary: 'The exposed iron core of a gas giant, stripped bare during the death throes of its dying primary (the white dwarf Sirius B) — a chthonian world with an explosive hydrogen/ammonia atmosphere and bioluminescent "living dynamo" life exploiting the star\'s ferocious magnetic field. Tharsis Mining works vast surface-exposed heavy-metal and platinum-group ore bodies.',
    page: 67,
  },
  {
    id: 'armstrong', name: 'Armstrong', zone: 'Near Earth Zone', starSystem: 'Procyon', locationKind: 'planet', hex: '0410',
    starport: 'B', worldSize: '4', atmosphere: '8', hydrographics: '6', population: '6', government: '6', lawLevel: '5', techLevel: '12',
    bases: ['USSC'], tradeCodes: ['agricultural', 'rich', 'non-industrial'], gasGiant: true,
    summary: 'A low-gravity, dense-jungle world serving as Leyland-Okuda Corporation\'s Off-World headquarters: cantilevered "bracket cities" cling to cliffs above 2,000-metre pagoda-tree canopies, home to sky-rays and devil hawks, and 2.53 million colonists governed by a joint US/corporate council.',
    page: 55,
  },
  {
    id: 'crown', name: 'Crown', zone: 'Near Earth Zone', starSystem: 'Wolf 359', locationKind: 'planet', hex: '0509',
    starport: 'D', worldSize: '3', atmosphere: '0', hydrographics: '0', population: '3', government: '7', lawLevel: '3', techLevel: '12',
    bases: [], tradeCodes: ['vacuum'], gasGiant: false,
    summary: 'A small, blackened, airless world near Wolf 359, coated in ash from a vanished neighboring planet ("Planet X"). Rival corporations Makita and Haruna race their prospecting teams to secure the eventual colonization contract — commentators suspect there\'s something worth the fight.',
    page: 57,
  },
  {
    id: 'attica', name: 'Attica', zone: 'Near Earth Zone', starSystem: 'Luyten\'s Star', locationKind: 'planet', hex: '0510',
    starport: 'C', worldSize: 'A', atmosphere: '6', hydrographics: '3', population: '3', government: '4', lawLevel: '2', techLevel: '12',
    bases: [], tradeCodes: ['non-industrial'], gasGiant: true,
    summary: 'A tidally-locked, 1.8G super-Earth with salt seas on its sunward side and ice on its darkside. Havermeyer Oil runs a loose, competitive rig economy out of Grimaldi Station (roughly 9,500 people); corrosive salt-dust makes machinery unreliable everywhere.',
    page: 56,
  },
  {
    id: 'exile', name: 'Exile', zone: 'Near Earth Zone', starSystem: 'Altair', locationKind: 'deepspace', hex: '0601',
    starport: 'E', worldSize: '0', atmosphere: '0', hydrographics: '0', population: '2', government: '4', lawLevel: '3', techLevel: '12',
    bases: [], tradeCodes: ['asteroid'], gasGiant: false,
    summary: 'An asteroid outpost near Altair, cataloged with minimal detail beyond its World Data table entry — a blank slate for a GM to define.',
    page: 28,
  },
  {
    id: 'jade-palace', name: 'Jade Palace', zone: 'Near Earth Zone', starSystem: '61 Cygni', locationKind: 'planet', hex: '0603',
    starport: 'B', worldSize: '9', atmosphere: '5', hydrographics: '2', population: '6', government: '5', lawLevel: '1', techLevel: '12',
    bases: [], tradeCodes: ['poor', 'non-industrial'], gasGiant: false,
    summary: 'A world with essentially no surface atmosphere — breathable air pools only at the bottom of vast volcanic rift canyons. The Chinese-founded, now Asia Pacific Partnership colony (roughly 1.06 million) is centered on the canyon capital of Han, linked by monorail across the southern canyon network.',
    page: 65,
  },
  {
    id: 'rock-17', name: 'Rock 17', zone: 'Near Earth Zone', starSystem: 'Kapteyn\'s Star', locationKind: 'deepspace', hex: '0609',
    starport: 'X', worldSize: 'D', atmosphere: '0', hydrographics: '0', population: '0', government: '0', lawLevel: '0', techLevel: '0',
    bases: [], tradeCodes: [], gasGiant: false,
    summary: 'An airless, lifeless super-Earth, catalogued as the best future landing site in its system. Unexplored and unsettled.',
    page: 69,
  },
  {
    id: 'paydirt', name: 'Paydirt', zone: 'Near Earth Zone', starSystem: 'Herschel 5173', locationKind: 'planet', hex: '0701',
    starport: 'D', worldSize: '8', atmosphere: '9', hydrographics: '9', population: '5', government: '4', lawLevel: '3', techLevel: '12',
    bases: [], tradeCodes: ['non-industrial'], gasGiant: true,
    summary: 'A frontier world (Starport D) in the Herschel 5173 binary system with a modest population. No dedicated write-up survives beyond its World Data table entry — its name suggests a mining claim waiting to be detailed.',
    page: 28,
  },
  {
    id: 'goldstone', name: 'Goldstone', zone: 'Near Earth Zone', starSystem: 'Sigma Draconis', locationKind: 'planet', hex: '0702',
    starport: 'D', worldSize: '5', atmosphere: '9', hydrographics: '3', population: '3', government: '3', lawLevel: '3', techLevel: '12',
    bases: [], tradeCodes: [], gasGiant: true,
    summary: 'A frontier world (Starport D) orbiting Sigma Draconis, cataloged with minimal detail beyond its World Data table entry.',
    page: 28,
  },
  {
    id: 'abyss', name: 'Abyss', zone: 'Near Earth Zone', starSystem: 'EZ Aquarii', locationKind: 'planet', hex: '0704',
    starport: 'C', worldSize: '7', atmosphere: '7', hydrographics: '9', population: '6', government: '4', lawLevel: '3', techLevel: '12',
    bases: ['MRA'], tradeCodes: ['non-industrial'], gasGiant: true,
    summary: 'A tidally-locked ocean world in a trinary red-dwarf system: 95% water, with volcanic mid-ocean-ridge islands housing nine million people in single-arcology cities. Family mining clans and large corporations compete for seabed mineral contracts, aided by intelligent tool-using dolphins.',
    page: 54,
  },
  {
    id: 'aurora', name: 'Aurora', zone: 'Near Earth Zone', starSystem: 'UV Ceti', locationKind: 'planet', hex: '0707',
    starport: 'C', worldSize: '5', atmosphere: '5', hydrographics: '2', population: '5', government: '5', lawLevel: '2', techLevel: '12',
    bases: [], tradeCodes: ['non-industrial', 'poor'], gasGiant: false,
    summary: 'An Earth-like world orbiting the flare star UV Ceti, whose radiation storms produce planet-wide auroras and force periodic shelter-taking during 15-year magnetic pole reversals. Parkfield Corporation runs genetics research here, studying mutation from repeated mega-flare exposure.',
    page: 56,
  },
  {
    id: 'defiance', name: 'Defiance', zone: 'Near Earth Zone', starSystem: 'Teegarden\'s Star', locationKind: 'planet', hex: '0709',
    starport: 'B', worldSize: '8', atmosphere: '6', hydrographics: '8', population: '7', government: '4', lawLevel: '4', techLevel: '12',
    bases: [], tradeCodes: ['garden', 'agricultural', 'rich'], gasGiant: false,
    summary: 'A tidally-locked garden world locked to Teegarden\'s Star, perpetually storm-lashed — the darkside in permanent hurricane season, the brightside in super-hurricane season. Named for its incredibly resilient, flexible trees that bend rather than snap.',
    page: 58,
  },
  {
    id: 'columbia', name: 'Columbia', zone: 'Near Earth Zone', starSystem: 'Epsilon Indi', locationKind: 'planet', hex: '0804',
    starport: 'C', worldSize: '5', atmosphere: '5', hydrographics: '4', population: '6', government: '4', lawLevel: '5', techLevel: '12',
    bases: ['MRA'], tradeCodes: ['agricultural', 'garden', 'non-industrial'], gasGiant: true,
    summary: 'A small garden world with a 36-week year and violent seasonal extremes (40 degree C summers, -20 degree C winters). Community of American States colonists settled the shallow-sea shoreline; Waterfall City, on the River Shenandoah, serves as both capital and starport.',
    page: 57,
  },
  {
    id: 'hamilton', name: 'Hamilton', zone: 'Near Earth Zone', starSystem: 'Ross 248', locationKind: 'planet', hex: '0805',
    starport: 'B', worldSize: '5', atmosphere: '5', hydrographics: '4', population: '6', government: '9', lawLevel: '6', techLevel: '12',
    bases: [], tradeCodes: ['non-industrial', 'agricultural', 'garden'], gasGiant: false,
    summary: 'A glaciated, tidally-locked world whose tectonic activity died 800 million years ago, freezing most of its life under advancing ice sheets except for one surviving tundra band. Over a million oil workers (mostly American, Canadian and Venezuelan) drill fossilized ancient forests, launching crude oil to orbit via a mass linear accelerator.',
    page: 61,
  },
  {
    id: 'inferno', name: 'Inferno', zone: 'Near Earth Zone', starSystem: 'Groombridge 34', locationKind: 'planet', hex: '0806',
    starport: 'D', worldSize: 'C', atmosphere: '1', hydrographics: '0', population: '6', government: 'B', lawLevel: '8', techLevel: '12',
    bases: [], tradeCodes: ['non-agricultural'], gasGiant: true,
    summary: 'A crushing 2G super-Earth tidally locked to its red-dwarf primary — one face a perpetual 600 degree C lava hell powering vast solar farms and Tharsis Corporation\'s precious-metal mining empire. 2.8 million colonists live under a strict safety regime; hostile-environment suits fail after 4-5 hours on the bright face.',
    page: 63,
  },
  {
    id: 'tau-ceti', name: 'Tau Ceti', zone: 'Near Earth Zone', starSystem: 'Tau Ceti System', locationKind: 'planet', hex: '0807',
    starport: 'B', worldSize: '4', atmosphere: '4', hydrographics: '4', population: '7', government: '6', lawLevel: '2', techLevel: '12',
    bases: ['USSC'], tradeCodes: ['agricultural'], gasGiant: true,
    summary: 'A flattened, tectonically-dead world of endless jungle, swamp and towering super-volcanoes, contested for decades between the American colony (Lindbergh) and a Chinese separatist splinter-state (Shulin, ruled by the People\'s Republic of Guandong) in a low-level guerrilla war the United Corporate Combine has been trying to broker to a close since 2212.',
    page: 70,
  },
  {
    id: 'the-solomons', name: 'The Solomons', zone: 'Near Earth Zone', starSystem: 'Epsilon Eridani', locationKind: 'deepspace', hex: '0808',
    starport: 'A', worldSize: '0', atmosphere: '0', hydrographics: '0', population: '6', government: '7', lawLevel: '5', techLevel: '12',
    bases: ['USSC'], tradeCodes: ['asteroid', 'non-industrial', 'non-agricultural'], gasGiant: true,
    summary: 'A balkanized asteroid-belt colony in the Epsilon Eridani system — a dense, corporate-carved "free trade" zone of competing corporate-owned rocks (Central, Tasker, Incubu, Suliman, Payback) where espionage and terrorism are a fact of life.',
    page: 69,
  },
  {
    id: 'requiem', name: 'Requiem', zone: 'Near Earth Zone', starSystem: 'Keid', locationKind: 'planet', hex: '0810',
    starport: 'D', worldSize: '8', atmosphere: 'A', hydrographics: '1', population: '2', government: '0', lawLevel: '0', techLevel: '12',
    bases: [], tradeCodes: ['fluid-oceans'], gasGiant: false,
    summary: 'A fluid-oceans world in the trinary Keid system with an exotic atmosphere (oxygen tanks and mask required) and only a scattered population — cataloged with minimal detail beyond its World Data table entry.',
    page: 28,
  },
];

export function findHostileLocation(id) {
  return HOSTILE_LOCATIONS.find((l) => l.id === id) || null;
}

export function findHostileStar(id) {
  return HOSTILE_STARS.find((s) => s.id === id) || null;
}

export function findHostileBase(id) {
  return HOSTILE_BASES.find((b) => b.id === id) || null;
}
