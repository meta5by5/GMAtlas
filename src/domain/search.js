// search.js — Universal Search (Phase 8, pack 23): one query across every
// source a GM currently has to search one drawer at a time — entities,
// journal, oracle tables (names and individual entries), documents (both
// the uploaded/text library and the auto-scanned Reference Library), Party
// trackers, and Colony fields/crew. Pure and DOM-free like every other
// domain module: it returns declarative `target` descriptors (which drawer,
// which entity/filter/tab) rather than functions, so ui/shell.js decides
// how to act on a result without this module knowing anything about the DOM.

import { listEntities } from './entities.js';
import { tablesWithOverrides, flattenKeys } from './oracles.js';
import { listDocuments, listReferenceDocuments } from './documents.js';
import { listPartyTrackers } from './party.js';
import { COLONY_FIELDS, getColonyFields, listCrewRows } from './colony.js';

function stripHtml(s) { return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
function snippet(s, n = 90) { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function matches(haystack, q) { return String(haystack || '').toLowerCase().includes(q); }

/**
 * One flat, ranked list of cross-campaign matches for a free-text query.
 * Ordered by category (Cast > Journal > Oracle > Documents > Party >
 * Colony — continuity/workflow-adjacent sources first, same spirit as pack
 * 66's own priority order) and by insertion order within a category. Each
 * result carries a `target` — { drawer, entityId?, oracleFilterText?,
 * docTabKey? } — describing where clicking it should navigate; this module
 * never touches the DOM itself.
 */
export function universalSearch(campaign, query, { limit = 40 } = {}) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const out = [];

  for (const e of listEntities(campaign)) {
    const haystack = [e.name, ...(e.tags || []), e.overview, e.revealed].join(' ');
    if (matches(haystack, q)) {
      out.push({
        category: 'Cast', id: e.id, label: e.name || 'Unnamed',
        sublabel: (e.tags || []).join(', ') || e.type,
        target: { drawer: 'entity-detail', entityId: e.id },
      });
    }
  }

  for (const j of (campaign.journal || [])) {
    const text = stripHtml(j.text);
    if (matches(text, q)) {
      out.push({
        category: 'Journal', id: j.id, label: snippet(text) || '(empty entry)',
        sublabel: j.source || 'Journal',
        target: { drawer: 'journal' },
      });
    }
  }

  const tables = tablesWithOverrides(campaign.oracles && campaign.oracles.overrides, campaign.settings && campaign.settings.genrePack);
  for (const leaf of flattenKeys(tables)) {
    const pathLabel = leaf.path.join(' > ');
    const nameHit = matches(pathLabel, q);
    const entryHit = !nameHit && leaf.values.find((v) => matches(v, q));
    if (nameHit || entryHit) {
      out.push({
        category: 'Oracle', id: leaf.path.join('>'), label: pathLabel,
        sublabel: entryHit ? snippet(entryHit) : `${leaf.values.length} entries`,
        target: { drawer: 'oracle', oracleFilterText: leaf.key },
      });
    }
  }

  for (const d of listDocuments(campaign)) {
    const haystack = [d.title, ...(d.tags || [])].join(' ');
    if (matches(haystack, q)) {
      out.push({
        category: 'Documents', id: d.id, label: d.title || 'Untitled document',
        sublabel: d.kind === 'file' ? 'uploaded file' : 'note',
        target: { drawer: 'documents', docTabKey: d.kind === 'file' ? 'lib:' + d.id : null },
      });
    }
  }
  const refDocs = listReferenceDocuments(campaign);
  refDocs.forEach((r) => {
    const haystack = [r.title, ...(r.tags || [])].join(' ');
    if (matches(haystack, q)) {
      out.push({
        category: 'Documents', id: r.key, label: r.title, sublabel: 'reference library',
        target: { drawer: 'documents', docTabKey: 'ref:' + r.key },
      });
    }
  });

  for (const t of listPartyTrackers(campaign)) {
    if (matches(t.name, q)) {
      out.push({ category: 'Party', id: t.id, label: t.name, sublabel: `${t.kind} tracker`, target: { drawer: 'party' } });
    }
  }

  const fields = getColonyFields(campaign);
  for (const f of COLONY_FIELDS) {
    const val = fields[f.key];
    if (val != null && val !== '' && matches(String(val), q)) {
      out.push({ category: 'Colony', id: f.key, label: f.label, sublabel: snippet(String(val)), target: { drawer: 'colony' } });
    }
  }
  for (const row of listCrewRows(campaign)) {
    if (matches(row.role, q)) {
      out.push({ category: 'Colony', id: row.id, label: row.role || 'Crew role', sublabel: 'crew', target: { drawer: 'colony' } });
    }
  }

  return out.slice(0, limit);
}
