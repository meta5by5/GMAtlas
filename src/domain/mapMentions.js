// mapMentions.js — registers Battlemap/Hexcrawl/Dungeon Crawl maps as a
// THIRD resolvable @[...] mention target, alongside entities (entities.js's
// findByName) and documents (documents.js's findDocumentTabByTitle).
// Direct follow-up request (Navigator workflow manager): "When a Campaign
// step involving a location is added to the journal, include the map link
// with the narrative content" — confirmed via AskUserQuestion the map
// link should be a real @[Map Name] mention, not a bespoke chip, so a
// Journal entry's own map reference looks and clicks exactly like every
// other mention already does. Mirrors documents.js's findDocumentTabByTitle/
// resolvedDocumentMentionNames shape exactly (same file-split precedent as
// domain/toc.js/domain/rulesetGuide.js — a small orchestration module next
// to the mention-shaped function it extends, not a change to entities.js/
// documents.js's own map-free logic).

function matchOne(maps, kind, key) {
  const l = key.toLowerCase();
  const m = (maps || []).find((x) => String(x.name || '').trim().toLowerCase() === l);
  return m ? { tabKey: `map:${kind}:${m.id}`, title: m.name, mapType: kind, mapId: m.id } : null;
}

/** Resolve a mentioned title to a real map — checked in this fixed order
 *  (battlemap, then hexcrawl, then dungeoncrawl) only when NO entity and
 *  NO document already matched that same name (see ui/mentionEditor.js's
 *  renderMentionNode, which checks this last/lowest-priority — an entity
 *  or document with the same name always wins, unchanged). */
export function findMapByName(campaign, name) {
  const key = String(name || '').trim();
  if (!key) return null;
  return matchOne(campaign.battlemaps && campaign.battlemaps.maps, 'battlemap', key)
    || matchOne(campaign.hexcrawls && campaign.hexcrawls.maps, 'hexcrawl', key)
    || matchOne(campaign.dungeonCrawls && campaign.dungeonCrawls.maps, 'dungeoncrawl', key);
}

/** Every distinct @[...] name in `text` that already resolves to a real
 *  map — lowercased, for entities.js's linkMentions `skip` option
 *  (session.js's addNote/editNote already pass resolvedDocumentMentionNames
 *  the same way; this is the map-shaped sibling). Without this, a map
 *  mention would spawn a same-named phantom NPC the exact way an
 *  unresolved document mention used to before resolvedDocumentMentionNames
 *  existed. */
export function resolvedMapMentionNames(campaign, text) {
  const out = new Set();
  // Deliberately a plain @[Name]/@Name scan, not documents.js's own
  // parseDocumentMentions — that function is only exported from
  // documents.js, and importing it here would create a documents.js ->
  // mapMentions.js -> documents.js style coupling for no real benefit,
  // since the two mention syntaxes (bracketed or bare, trailing #page/
  // |label stripped) are identical; this mirrors parseMentions' own
  // regex (entities.js) directly instead.
  const re = /@\[([^\]]+)\]|@([A-Za-z0-9_''-]+)/g;
  let m;
  while ((m = re.exec(String(text || '')))) {
    const raw = (m[1] || m[2]).trim();
    const name = raw.split('|').pop().split('#')[0].trim();
    if (findMapByName(campaign, name)) out.add(name.toLowerCase());
  }
  return out;
}
