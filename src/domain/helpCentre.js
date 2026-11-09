// helpCentre.js — the Help centre's pure logic: render an article's
// Markdown subset to HTML, list its headings for "On this page", and search
// articles. Pure/DOM-free (rule 3), so it's covered by node --test. The
// articles themselves are data (data/helpArticles.js).
//
// The subset: `## `/`### ` headings, paragraphs, `- ` and `1. ` lists,
// **bold**, `code`, and [text](href) links. Every piece of text is escaped
// first, and a link's href must be an in-app hash route (`#/...`) or https,
// so an article can never inject markup or a script URL.

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function slugifyHeading(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
}

function inline(text) {
  let out = esc(text);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label, href) => {
    const raw = href.replace(/&amp;/g, '&');
    if (raw.startsWith('#/')) return `<a href="${href}">${label}</a>`;
    if (/^https:\/\//.test(raw)) return `<a href="${href}" target="_blank" rel="noreferrer">${label} ↗</a>`;
    return label;
  });
  return out;
}

/** `{html, headings: [{id, text, level}]}` for an article body. */
export function renderHelpMarkdown(md) {
  const html = [];
  const headings = [];
  let list = null;
  let para = [];
  const flushPara = () => { if (para.length) { html.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const flushList = () => { if (list) { html.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`); list = null; } };
  for (const rawLine of String(md || '').split('\n')) {
    const line = rawLine.trimEnd();
    const heading = /^(#{2,3}) (.+)$/.exec(line);
    const bullet = /^- (.+)$/.exec(line);
    const numbered = /^\d+\. (.+)$/.exec(line);
    if (heading) {
      flushPara(); flushList();
      const level = heading[1].length;
      let id = slugifyHeading(heading[2]);
      while (headings.some((h) => h.id === id)) id += '-x';
      headings.push({ id, text: heading[2], level });
      html.push(`<h${level} id="${id}">${inline(heading[2])}</h${level}>`);
    } else if (bullet || numbered) {
      flushPara();
      const tag = bullet ? 'ul' : 'ol';
      if (list && list.tag !== tag) flushList();
      if (!list) list = { tag, items: [] };
      list.items.push((bullet || numbered)[1]);
    } else if (!line.trim()) {
      flushPara(); flushList();
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara(); flushList();
  return { html: html.join('\n'), headings };
}

const occurrences = (text, word) => text.split(word).length - 1;

/** Articles matching every word of `query` (title, summary, body), ranked
 *  by where the words appear: title, then summary, then how often in the
 *  body. Ties keep the articles' own order. An empty query returns them
 *  all. */
export function searchHelp(articles, query) {
  const words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [...articles];
  const scored = [];
  articles.forEach((a, index) => {
    const title = a.title.toLowerCase();
    const summary = String(a.summary || '').toLowerCase();
    const body = String(a.body || '').toLowerCase();
    if (!words.every((w) => `${title} ${summary} ${body}`.includes(w))) return;
    const score = words.reduce((sum, w) => sum + (title.includes(w) ? 100 : 0) + (summary.includes(w) ? 20 : 0) + Math.min(occurrences(body, w), 10), 0);
    scored.push({ a, score, index });
  });
  return scored.sort((x, y) => y.score - x.score || x.index - y.index).map((x) => x.a);
}

/** The portal route a location hash names, or null for the campaign. */
export function parsePortalRoute(hash) {
  const text = String(hash || '');
  const signIn = /^#\/account\/sign-in(?:\/error\/([a-z_-]+))?\/?$/.exec(text);
  if (signIn) return signIn[1] ? { view: 'sign-in', error: signIn[1] } : { view: 'sign-in' };
  // Back from "Continue with Google/Discord" (server/src/oauth.js).
  const oauth = /^#\/account\/oauth\/(new|back)\/?$/.exec(text);
  if (oauth) return { view: 'oauth', outcome: oauth[1] };
  const security = /^#\/account\/security(?:\/(linked|error\/[a-z_-]+))?\/?$/.exec(text);
  if (security) return security[1] ? { view: 'account', section: 'security', outcome: security[1] } : { view: 'account', section: 'security' };
  const account = /^#\/account(?:\/(devices|licenses|sync))?\/?$/.exec(text);
  if (account) return { view: 'account', section: account[1] || 'profile' };
  // The campaign wiki's portal pages (design/WIKI-ROADMAP.md): the index,
  // and one page per entity id.
  const wiki = /^#\/wiki(?:\/([A-Za-z0-9_-]+))?\/?$/.exec(text);
  if (wiki) return wiki[1] ? { view: 'wiki-page', id: wiki[1] } : { view: 'wiki' };
  const m = /^#\/help(?:\/([a-z0-9-]+))?\/?$/.exec(text);
  if (!m) return null;
  return m[1] ? { view: 'article', slug: m[1] } : { view: 'help' };
}
