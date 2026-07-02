// documents.js — pure document-library helpers for the GMAtlas docs drawer.

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

function ensure(doc) {
  if (!doc.documents || typeof doc.documents !== 'object') doc.documents = { library: [], openTabs: [] };
  if (!Array.isArray(doc.documents.library)) doc.documents.library = [];
  if (!Array.isArray(doc.documents.openTabs)) doc.documents.openTabs = [];
  return doc.documents;
}

export function addDocument(campaign, patch = {}) {
  const next = clone(campaign);
  const docs = ensure(next);
  const entry = {
    id: 'doc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: String(patch.title || 'Untitled document').trim(),
    content: String(patch.content || ''),
    kind: patch.kind === 'file' ? 'file' : 'note',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  // Uploaded-file documents carry the file as a data URL instead of text
  // content — kept on the entry so the store's single localStorage module
  // still owns persistence (no second storage mechanism for uploads).
  if (entry.kind === 'file') {
    entry.fileName = String(patch.fileName || entry.title);
    entry.mimeType = String(patch.mimeType || 'application/octet-stream');
    entry.dataUrl = String(patch.dataUrl || '');
  }
  docs.library.push(entry);
  return next;
}

export function updateDocument(campaign, id, patch) {
  const next = clone(campaign);
  const docs = ensure(next);
  const entry = docs.library.find((d) => d.id === id);
  if (!entry) return next;
  Object.assign(entry, patch, { updatedAt: new Date().toISOString() });
  return next;
}

export function removeDocument(campaign, id) {
  const next = clone(campaign);
  const docs = ensure(next);
  docs.library = docs.library.filter((d) => d.id !== id);
  docs.openTabs = docs.openTabs.filter((tab) => tab !== id);
  return next;
}

export function listDocuments(campaign) {
  return ((campaign.documents && campaign.documents.library) || []).slice().sort((a, b) => (a.title || '').localeCompare(b.title || ''));
}

export function findDocumentByTitle(campaign, title) {
  if (!title) return null;
  const key = String(title || '').trim().toLowerCase();
  return ((campaign.documents && campaign.documents.library) || []).find((entry) => String(entry.title || '').trim().toLowerCase() === key) || null;
}

export function getDocument(campaign, id) {
  return ((campaign.documents && campaign.documents.library) || []).find((entry) => entry && entry.id === id) || null;
}

export function parseDocumentMentions(text) {
  const out = [];
  const source = String(text || '');
  const stopWords = new Set(['and', 'or', 'the', 'a', 'an', 'to', 'for', 'with', 'from', 'in', 'on']);
  let i = 0;

  while (i < source.length) {
    const at = source.indexOf('@', i);
    if (at < 0) break;
    if (at + 1 >= source.length) break;

    if (source[at + 1] === '[') {
      const match = source.slice(at).match(/^@\[([^\]]+)\]/);
      if (match) {
        const name = match[1].trim();
        if (name) out.push(name);
        i = at + match[0].length;
        continue;
      }
    }

    const words = [];
    let j = at + 1;
    while (j < source.length) {
      if (source[j] === '@') break;
      if (/[.,;:!?]/.test(source[j])) break;
      if (/\s/.test(source[j])) {
        j++;
        continue;
      }
      const tokenMatch = source.slice(j).match(/^([A-Za-z0-9_''-]+)/);
      if (!tokenMatch) break;
      const token = tokenMatch[1];
      if (stopWords.has(token.toLowerCase())) break;
      words.push(token);
      j += token.length;
    }

    const name = words.join(' ').trim();
    if (name) out.push(name);
    i = at + 1;
  }

  return Array.from(new Set(out.filter(Boolean)));
}

export function linkDocumentMentions(campaign, text) {
  const names = parseDocumentMentions(text);
  if (!names.length) return campaign;
  const next = clone(campaign);
  const docs = ensure(next);
  const library = docs.library || [];
  const byTitle = new Map(library.map((entry) => [String(entry.title || '').trim().toLowerCase(), entry]));
  for (const name of names) {
    const key = name.trim().toLowerCase();
    if (!byTitle.has(key)) {
      const created = {
        id: 'doc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        title: name.trim(),
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      library.push(created);
      byTitle.set(key, created);
    }
  }
  return next;
}

export function listDocumentMentions(campaign) {
  return (campaign.documents && campaign.documents.library || [])
    .filter((entry) => entry && entry.title)
    .map((entry) => ({ documentId: entry.id, name: entry.title }));
}
