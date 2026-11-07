// admin/main.js — the admin page (admin.html; design/ACCOUNTS-SYNC-ROADMAP.md
// section 9, Phase S1 item 4). Its own bundle (dist/admin.bundle.js), so
// none of this ships to ordinary users. Same origin as the app and the
// service: it uses the app's signed-in session (the HttpOnly refresh
// cookie) through the same account client and the same cross-tab refresh
// lock, so it never trips refresh-token reuse detection. Signing in itself
// happens in the app.
//
// The server decides everything (src/admin.js checks the role on every
// call); this page only hides what the role can't use. One delegated
// listener per event type on the page root, routed by data-action.

import { createAccountClient } from '../core/account.js';
import { LICENSES } from '../data/licenses.js';
import { FEATURES } from '../data/features.js';
import { GATEABLE_MODULES } from '../core/schema.js';

// The account client keeps its state in the app's store; this page only
// needs it in memory.
const memStore = {
  cfg: { account: {} },
  getAppConfig() { return this.cfg; },
  updateAppConfig(fn) { this.cfg = fn(this.cfg) || this.cfg; return this.cfg; },
  setCertificate() {},
};
const client = createAccountClient({ store: memStore });
const api = (method, path, body) => client.request(method, path, body);

const esc = (v) => String(v === undefined || v === null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const day = (isoText) => (isoText ? isoText.slice(0, 10) : '—');
const when = (isoText) => (isoText ? isoText.replace('T', ' ').slice(0, 16) : '—');
const endOfDay = (dateText) => (dateText ? `${dateText}T23:59:59Z` : null);
const LABELS = {
  license: new Map(LICENSES.map((l) => [l.id, l.family && !l.label.startsWith(l.family) ? `${l.family} · ${l.label}` : l.label])),
  feature: new Map(FEATURES.map((f) => [f.id, f.label])),
  module: new Map(GATEABLE_MODULES.map((m) => [m, m])),
};
const GRANT_OPTIONS = [
  ['license', 'Licenses (books)', LICENSES.filter((l) => !l.open).map((l) => [l.id, l.family && !l.label.startsWith(l.family) ? `${l.family} · ${l.label}` : l.label])],
  ['feature', 'Features', FEATURES.map((f) => [f.id, f.label])],
  ['module', 'Campaign modules', GATEABLE_MODULES.map((m) => [m, m])],
];

let root = null;
const state = {
  phase: 'loading', // loading | signed-out | no-role | ready | error
  me: null,
  tab: 'users',
  q: '',
  users: null,
  user: null,
  flags: null,
  audit: null,
  auditFilters: { actor: '', target: '', action: '' },
  bulk: null,
  message: null, // {kind: 'ok'|'error', text}
  busy: false,
};
const can = (p) => !!(state.me && state.me.permissions.includes(p));

function say(kind, text) { state.message = { kind, text }; }

/** Shows the message without re-rendering, so what's typed in the forms
 *  (a note, a picked grant) survives a mistake. */
function paintMessage() {
  if (!root) return;
  let el = root.querySelector('.admin-msg[data-top]');
  if (!state.message) { if (el) el.remove(); return; }
  if (!el) {
    el = root.ownerDocument.createElement('div');
    el.setAttribute('data-top', '');
    const top = root.querySelector('.admin-top');
    if (top) top.after(el); else root.prepend(el);
  }
  el.className = `admin-msg admin-msg-${state.message.kind}`;
  el.setAttribute('role', state.message.kind === 'error' ? 'alert' : 'status');
  el.textContent = state.message.text;
}

/** Runs an admin action: re-renders after success (fresh data); after a
 *  failure only the message changes, keeping the forms as they were. */
async function run(fn, okText) {
  if (state.busy) return;
  state.busy = true;
  state.message = null;
  if (root) root.setAttribute('aria-busy', 'true');
  let ok = false;
  try {
    await fn();
    ok = true;
    if (okText) say('ok', okText);
  } catch (err) {
    if (err.status === 401) { state.phase = 'signed-out'; ok = true; }
    say('error', err.message || 'That didn’t work.');
  } finally {
    state.busy = false;
    if (ok) render(); else { root.setAttribute('aria-busy', 'false'); paintMessage(); }
  }
}

// --- loading ---------------------------------------------------------------------

async function boot() {
  try {
    state.me = await api('GET', '/api/admin/me');
    state.phase = 'ready';
    state.tab = can('users.read') ? 'users' : can('flags.read') ? 'flags' : 'audit';
    await loadTab();
  } catch (err) {
    if (err.status === 401 || err.code === 'signed_out') state.phase = 'signed-out';
    else if (err.code === 'not_admin') state.phase = 'no-role';
    else { state.phase = 'error'; say('error', err.message); }
  }
  render();
}

async function loadTab() {
  if (state.tab === 'users' && !state.users) state.users = (await api('GET', '/api/admin/users')).users;
  if (state.tab === 'flags') state.flags = await api('GET', '/api/admin/flags');
  if (state.tab === 'audit') await loadAudit();
}

async function loadUser(id) { state.user = await api('GET', `/api/admin/users/${encodeURIComponent(id)}`); }

async function loadAudit(before) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(state.auditFilters)) if (v) p.set(k, v);
  if (before) p.set('before', before);
  const page = await api('GET', `/api/admin/audit?${p}`);
  state.audit = before ? { entries: [...state.audit.entries, ...page.entries], more: page.more } : page;
}

// --- views -------------------------------------------------------------------------

function render() {
  if (!root) return;
  const msg = state.message ? `<div data-top class="admin-msg admin-msg-${state.message.kind}" role="${state.message.kind === 'error' ? 'alert' : 'status'}">${esc(state.message.text)}</div>` : '';
  let body;
  if (state.phase === 'loading') body = '<p class="admin-dim">Loading…</p>';
  else if (state.phase === 'signed-out') body = '<div class="admin-card"><h2>Sign in first</h2><p>Sign in to GMAtlas in the app, then come back to this page.</p><p><a class="admin-btn" href="./#/account/sign-in">Sign in</a></p></div>';
  else if (state.phase === 'no-role') body = '<div class="admin-card"><h2>No admin access</h2><p>Your account doesn’t have an admin role. An owner can give you one.</p><p><a href="./">Back to GMAtlas</a></p></div>';
  else if (state.phase === 'error') body = '<div class="admin-card"><h2>Can’t reach the service</h2><p><button type="button" class="admin-btn" data-action="retry">Try again</button></p></div>';
  else body = `${tabsHtml()}<main class="admin-main">${state.tab === 'users' ? usersHtml() : state.tab === 'flags' ? flagsHtml() : auditHtml()}</main>`;
  const who = state.me ? `<span class="admin-who">${esc(state.me.user.email)} · ${esc(state.me.roles.join(', '))}</span>` : '';
  const env = state.me ? `<span class="admin-env admin-env-${esc(state.me.env)}">${esc(state.me.env)}</span>` : '';
  root.innerHTML = `
    <header class="admin-top"><h1>GMAtlas Admin</h1>${env}<span class="admin-spacer"></span>${who}<a href="./">Back to the app</a></header>
    ${msg}${body}`;
  root.setAttribute('aria-busy', String(state.busy));
}

function tabsHtml() {
  const tabs = [['users', 'Users', 'users.read'], ['flags', 'Feature flags', 'flags.read'], ['audit', 'Audit log', 'audit.read']].filter((t) => can(t[2]));
  return `<nav class="admin-tabs" role="tablist">${tabs.map(([id, label]) => `<button type="button" role="tab" aria-selected="${state.tab === id}" data-action="tab" data-tab="${id}">${label}</button>`).join('')}</nav>`;
}

const noteField = (label = 'Note (why)') => `<label class="admin-note">${label} <input name="note" maxlength="500" autocomplete="off" placeholder="Required"></label>`;

function usersHtml() {
  const rows = (state.users || []).map((u) => `
    <tr data-action="open-user" data-id="${esc(u.id)}" class="${state.user && state.user.user.id === u.id ? 'admin-selected' : ''}">
      <td>${esc(u.email)}</td><td>${esc(u.displayName || '')}</td><td>${esc(u.status)}</td><td>${esc(u.roles.join(', '))}</td><td>${u.devices}</td><td>${day(u.lastSeenAt)}</td>
    </tr>`).join('');
  return `
    <section class="admin-card">
      <form data-form="search" class="admin-row"><input name="q" value="${esc(state.q)}" placeholder="Email, name or account id" aria-label="Search users"><button class="admin-btn">Search</button></form>
      <table class="admin-table"><thead><tr><th>Email</th><th>Name</th><th>Status</th><th>Roles</th><th>Devices</th><th>Last seen</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" class="admin-dim">No accounts found.</td></tr>'}</tbody></table>
    </section>
    ${state.user ? userHtml(state.user) : ''}
    ${can('grants.write') ? bulkHtml() : ''}`;
}

function userHtml(d) {
  const u = d.user;
  const now = new Date().toISOString();
  const entState = (e) => (e.revokedAt ? 'revoked' : e.endsAt && e.endsAt <= now ? 'expired' : e.startsAt > now ? 'scheduled' : 'active');
  const ents = d.entitlements.map((e) => {
    const st = entState(e);
    const live = st === 'active' || st === 'scheduled';
    const actions = can('grants.write') && live ? `
      <button type="button" class="admin-btn admin-btn-sm" data-action="ent-revoke" data-id="${esc(e.id)}">Revoke</button>
      <input type="date" aria-label="New end date" data-extend-for="${esc(e.id)}"><button type="button" class="admin-btn admin-btn-sm" data-action="ent-extend" data-id="${esc(e.id)}">Set end</button>
      ${e.source === 'attested' ? `<button type="button" class="admin-btn admin-btn-sm" data-action="ent-convert" data-id="${esc(e.id)}">Make a grant</button>` : ''}` : '';
    return `<tr class="admin-ent-${st}"><td>${esc(e.kind)}</td><td>${esc((LABELS[e.kind] && LABELS[e.kind].get(e.ref)) || e.ref)}</td><td>${esc(e.source)}</td><td>${day(e.startsAt)}</td><td>${e.endsAt ? day(e.endsAt) : 'never'}</td><td>${st}</td><td>${esc(e.note || '')}</td><td class="admin-actions">${actions}</td></tr>`;
  }).join('');
  const devices = d.devices.map((v) => `<tr class="${v.revokedAt ? 'admin-ent-revoked' : ''}"><td>${esc(v.name)}</td><td>${esc(v.platform || '')}</td><td>${esc(v.policy.mode)}${v.policy.mode === 'focused' ? `: ${esc(v.policy.only.join(', '))}` : v.policy.excluded.length ? ` minus ${esc(v.policy.excluded.join(', '))}` : ''}</td><td>${v.syncApproved ? 'yes' : 'no'}</td><td>${day(v.lastSeenAt)}</td><td>${v.revokedAt ? `signed out ${day(v.revokedAt)}` : ''}</td></tr>`).join('');
  const deviceName = (id) => (d.devices.find((v) => v.id === id) || {}).name || id;
  const sessions = d.sessions.map((s) => `<tr><td>${esc(deviceName(s.deviceId))}</td><td>${when(s.createdAt)}</td><td>${day(s.expiresAt)}</td><td>${can('users.write') ? `<button type="button" class="admin-btn admin-btn-sm" data-action="session-revoke" data-id="${esc(s.id)}">Revoke</button>` : ''}</td></tr>`).join('');
  const opts = GRANT_OPTIONS.map(([kind, label, list]) => `<optgroup label="${esc(label)}">${list.map(([id, name]) => `<option value="${kind}:${esc(id)}">${esc(name)}</option>`).join('')}</optgroup>`).join('');
  return `
    <section class="admin-card" data-user="${esc(u.id)}">
      <h2>${esc(u.email)} <span class="admin-badge admin-status-${esc(u.status)}">${esc(u.status)}</span></h2>
      <p class="admin-dim">${esc(u.displayName || 'No name')} · ${esc(u.id)} · joined ${day(u.createdAt)} · signs in with ${esc(d.identities.map((i) => i.provider).join(', ') || '—')} · features on: ${esc(d.enabledFeatures.join(', ') || 'none')}</p>

      ${can('users.write') ? `<div class="admin-block" data-note-scope>
        <h3>Account</h3>
        <div class="admin-row">${noteField()}
          ${u.status === 'active'
            ? '<button type="button" class="admin-btn admin-btn-danger" data-action="user-status" data-status="disabled">Disable account</button>'
            : '<button type="button" class="admin-btn" data-action="user-status" data-status="active">Re-enable account</button>'}
        </div>
        <p class="admin-dim">Disabling signs the account out on every device at once.</p>
      </div>` : ''}

      ${can('roles.write') ? `<div class="admin-block" data-note-scope>
        <h3>Admin roles</h3>
        <div class="admin-row">${['owner', 'admin', 'support', 'content'].map((r) => `<label><input type="checkbox" name="role" value="${r}" ${u.roles.includes(r) ? 'checked' : ''}> ${r}</label>`).join('')}
          ${noteField()}<button type="button" class="admin-btn" data-action="user-roles">Save roles</button></div>
      </div>` : ''}

      <div class="admin-block" data-note-scope>
        <h3>Entitlements</h3>
        ${can('grants.write') ? `<div class="admin-row">${noteField('Note for the change')}</div>` : ''}
        <table class="admin-table"><thead><tr><th>Kind</th><th>What</th><th>Source</th><th>From</th><th>Until</th><th>State</th><th>Note</th><th></th></tr></thead>
        <tbody>${ents || '<tr><td colspan="8" class="admin-dim">None.</td></tr>'}</tbody></table>
      </div>

      ${can('grants.write') ? `<div class="admin-block" data-note-scope>
        <h3>Grant</h3>
        <div class="admin-row">
          <select name="grant" aria-label="What to grant">${opts}</select>
          <select name="source" aria-label="Grant or trial"><option value="grant">Grant</option><option value="trial">Trial</option></select>
          <label>Until <input type="date" name="endsAt"></label>
          ${noteField()}<button type="button" class="admin-btn" data-action="grant">Grant</button>
        </div>
        <p class="admin-dim">A trial needs an end date. No end date means it never expires.</p>
      </div>` : ''}

      <div class="admin-block" data-note-scope>
        <h3>Devices</h3>
        <table class="admin-table"><thead><tr><th>Name</th><th>Platform</th><th>Install policy</th><th>Sync approved</th><th>Last seen</th><th></th></tr></thead><tbody>${devices}</tbody></table>
        <h3>Sessions</h3>
        ${can('users.write') ? `<div class="admin-row">${noteField()}<button type="button" class="admin-btn admin-btn-danger" data-action="session-revoke-all">Sign out everywhere</button></div>` : ''}
        <table class="admin-table"><thead><tr><th>Device</th><th>Signed in</th><th>Expires</th><th></th></tr></thead><tbody>${sessions || '<tr><td colspan="4" class="admin-dim">No active sessions.</td></tr>'}</tbody></table>
      </div>

      <div class="admin-block">
        <h3>Sync (metadata only: contents are end-to-end encrypted)</h3>
        <p>Set up: ${d.sync.vault ? 'yes' : 'no'} · recovery key: ${d.sync.recoveryKey ? 'yes' : 'no'} · settings: ${d.sync.settings ? `version ${d.sync.settings.version}, ${day(d.sync.settings.updatedAt)}` : 'none'}</p>
        <table class="admin-table"><thead><tr><th>Synced campaign</th><th>Created</th><th>Last change</th></tr></thead>
        <tbody>${d.sync.campaigns.map((c) => `<tr><td><code>${esc(c.id)}</code></td><td>${day(c.createdAt)}</td><td>${when(c.updatedAt)}</td></tr>`).join('') || '<tr><td colspan="3" class="admin-dim">None.</td></tr>'}</tbody></table>
      </div>
      <p><button type="button" class="admin-btn admin-btn-sm" data-action="audit-for" data-id="${esc(u.id)}">Audit log for this account</button></p>
    </section>`;
}

function bulkHtml() {
  const b = state.bulk;
  const result = b ? (b.errors && b.errors.length
    ? `<div class="admin-msg admin-msg-error">${b.errors.map((e) => `Line ${e.line}: ${esc(e.error)} <code>${esc(e.text)}</code>`).join('<br>')}</div>`
    : `<div class="admin-msg admin-msg-ok">${b.dryRun ? `All ${b.valid} lines check out. Nothing granted yet.` : `Granted ${b.granted}.`}</div>`) : '';
  return `
    <details class="admin-card" ${b ? 'open' : ''}>
      <summary>Bulk grant (CSV)</summary>
      <div data-note-scope>
        <p class="admin-dim">One per line: <code>email,kind,ref[,endsAt]</code>. Kind is license, feature or module. An end date makes it a trial. Every line is checked first; any bad line and nothing is granted.</p>
        <textarea name="csv" rows="6" aria-label="CSV">${esc((b && b.csv) || '')}</textarea>
        <div class="admin-row">${noteField()}<button type="button" class="admin-btn" data-action="bulk-check">Check</button><button type="button" class="admin-btn" data-action="bulk-grant">Grant all</button></div>
        ${result}
      </div>
    </details>`;
}

function flagsHtml() {
  if (!state.flags) return '<p class="admin-dim">Loading…</p>';
  const { features, flags, emails } = state.flags;
  const write = can('flags.write');
  return features.map((f) => {
    const flag = flags[f.id] || { defaultValue: null, rollout: null, kill: false, overrides: {} };
    const overrides = Object.entries(flag.overrides).map(([id, on]) => `${emails[id] || id}=${on ? 'on' : 'off'}`).join('\n');
    const dis = write ? '' : 'disabled';
    return `
      <section class="admin-card" data-note-scope data-flag="${esc(f.id)}">
        <h2>${esc(f.label)} <code>${esc(f.id)}</code> ${flag.kill ? '<span class="admin-badge admin-status-disabled">killed</span>' : ''}</h2>
        <p class="admin-dim">${esc(f.description)} Built in ${esc(f.phase)}; on by default: ${f.default ? 'yes' : 'no'}.${flag.updatedAt ? ` Last changed ${when(flag.updatedAt)}.` : ''}</p>
        <div class="admin-row">
          <label>Default <select name="defaultValue" ${dis}>
            <option value="" ${flag.defaultValue === null ? 'selected' : ''}>Catalog (${f.default ? 'on' : 'off'})</option>
            <option value="on" ${flag.defaultValue === true ? 'selected' : ''}>On</option>
            <option value="off" ${flag.defaultValue === false ? 'selected' : ''}>Off</option></select></label>
          <label>Rollout % <input type="number" name="rollout" min="0" max="100" value="${flag.rollout === null ? '' : flag.rollout}" ${dis}></label>
          <label><input type="checkbox" name="kill" ${flag.kill ? 'checked' : ''} ${dis}> Kill switch (off for everyone)</label>
        </div>
        <label class="admin-block">Per-account overrides, one per line: <code>email=on</code> or <code>email=off</code>
          <textarea name="overrides" rows="3" ${dis}>${esc(overrides)}</textarea></label>
        ${write ? `<div class="admin-row">${noteField()}<button type="button" class="admin-btn" data-action="flag-save" data-key="${esc(f.id)}">Save</button></div>` : ''}
      </section>`;
  }).join('') + '<p class="admin-dim">Signed-in apps pick up changes within about 10 minutes (or on their next start).</p>';
}

function auditHtml() {
  const a = state.audit;
  const f = state.auditFilters;
  const brief = (v) => (v === null || v === undefined ? '' : esc(JSON.stringify(v)).slice(0, 160));
  const rows = a ? a.entries.map((e) => `<tr><td>${when(e.at)}</td><td>${esc(e.actorEmail || e.actorId || '—')}</td><td><code>${esc(e.action)}</code></td><td>${esc(e.targetKind || '')} <code>${esc(e.targetId || '')}</code></td><td class="admin-json">${brief(e.before)}</td><td class="admin-json">${brief(e.after)}</td><td>${esc(e.note || '')}</td></tr>`).join('') : '';
  return `
    <section class="admin-card">
      <form data-form="audit" class="admin-row">
        <input name="actor" value="${esc(f.actor)}" placeholder="Actor account id" aria-label="Actor">
        <input name="target" value="${esc(f.target)}" placeholder="Target id" aria-label="Target">
        <input name="action" value="${esc(f.action)}" placeholder="Action starts with, e.g. admin." aria-label="Action">
        <button class="admin-btn">Filter</button>
      </form>
      <table class="admin-table"><thead><tr><th>When (UTC)</th><th>Who</th><th>Action</th><th>Target</th><th>Before</th><th>After</th><th>Note</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="7" class="admin-dim">Nothing yet.</td></tr>'}</tbody></table>
      ${a && a.more ? '<p><button type="button" class="admin-btn" data-action="audit-more">Older</button></p>' : ''}
    </section>`;
}

// --- actions -------------------------------------------------------------------------

function noteFrom(el) {
  const scope = el.closest('[data-note-scope]');
  const input = scope && scope.querySelector('[name="note"]');
  const text = input ? input.value.trim() : '';
  if (!text) { say('error', 'Add a note saying why: every admin change needs one.'); paintMessage(); if (input) input.focus(); return null; }
  return text;
}

const refreshUser = async () => { await loadUser(state.user.user.id); state.users = (await api('GET', `/api/admin/users?q=${encodeURIComponent(state.q)}`)).users; };

function onClick(ev) {
  const el = ev.target.closest('[data-action]');
  if (!el || state.busy) return;
  const action = el.getAttribute('data-action');
  const id = el.getAttribute('data-id');
  const uid = state.user && state.user.user.id;
  switch (action) {
    case 'retry': state.phase = 'loading'; render(); boot(); return;
    case 'tab': state.tab = el.getAttribute('data-tab'); state.message = null; run(loadTab); return;
    case 'open-user': run(() => loadUser(id)); return;
    case 'audit-for': state.tab = 'audit'; state.auditFilters = { actor: '', target: id, action: '' }; run(() => loadAudit()); return;
    case 'audit-more': run(() => loadAudit(state.audit.entries.at(-1).at)); return;
  }
  const note = noteFrom(el);
  if (!note) return;
  switch (action) {
    case 'user-status': {
      const status = el.getAttribute('data-status');
      if (status === 'disabled' && !globalThis.confirm(`Disable ${state.user.user.email}? They're signed out everywhere at once.`)) return;
      run(async () => { await api('POST', `/api/admin/users/${uid}/status`, { status, note }); await refreshUser(); }, status === 'disabled' ? 'Account disabled.' : 'Account re-enabled.');
      return;
    }
    case 'user-roles': {
      const roles = [...el.closest('[data-note-scope]').querySelectorAll('[name="role"]:checked')].map((x) => x.value);
      run(async () => { await api('PUT', `/api/admin/users/${uid}/roles`, { roles, note }); await refreshUser(); }, 'Roles saved.');
      return;
    }
    case 'session-revoke':
    case 'session-revoke-all':
      run(async () => { await api('POST', `/api/admin/users/${uid}/sessions/revoke`, { sessionId: action === 'session-revoke' ? id : undefined, note }); await loadUser(uid); }, 'Signed out.');
      return;
    case 'grant': {
      const scope = el.closest('[data-note-scope]');
      const [kind, ...rest] = scope.querySelector('[name="grant"]').value.split(':');
      const body = { kind, ref: rest.join(':'), source: scope.querySelector('[name="source"]').value, endsAt: endOfDay(scope.querySelector('[name="endsAt"]').value) || undefined, note };
      run(async () => { await api('POST', `/api/admin/users/${uid}/entitlements`, body); await loadUser(uid); }, 'Granted.');
      return;
    }
    case 'ent-revoke':
      run(async () => { await api('POST', `/api/admin/entitlements/${id}/revoke`, { note }); await loadUser(uid); }, 'Revoked.');
      return;
    case 'ent-extend': {
      const date = root.querySelector(`[data-extend-for="${CSS.escape(id)}"]`).value;
      if (!date) { say('error', 'Pick the new end date first.'); paintMessage(); return; }
      run(async () => { await api('POST', `/api/admin/entitlements/${id}/extend`, { endsAt: endOfDay(date), note }); await loadUser(uid); }, 'End date set.');
      return;
    }
    case 'ent-convert':
      run(async () => { await api('POST', `/api/admin/entitlements/${id}/convert`, { note }); await loadUser(uid); }, 'Now a grant.');
      return;
    case 'bulk-check':
    case 'bulk-grant': {
      const csv = el.closest('[data-note-scope]').querySelector('[name="csv"]').value;
      // A bad line is a result to show (ok: false, errors), not a failure.
      run(async () => {
        state.bulk = { csv, ...(await api('POST', '/api/admin/entitlements/bulk', { csv, note, dryRun: action === 'bulk-check' })) };
        if (state.user) await loadUser(uid);
      });
      return;
    }
    case 'flag-save': {
      const scope = el.closest('[data-flag]');
      const dv = scope.querySelector('[name="defaultValue"]').value;
      const rollout = scope.querySelector('[name="rollout"]').value;
      const overrides = {};
      for (const line of scope.querySelector('[name="overrides"]').value.split('\n').map((l) => l.trim()).filter(Boolean)) {
        const [who, val] = line.split('=').map((s) => s.trim());
        if (!who || !['on', 'off'].includes(val)) { say('error', `Override lines are email=on or email=off: ${line}`); paintMessage(); return; }
        overrides[who] = val === 'on';
      }
      const body = { defaultValue: dv === '' ? null : dv === 'on', rollout: rollout === '' ? null : Number(rollout), kill: scope.querySelector('[name="kill"]').checked, overrides, note };
      run(async () => { await api('PUT', `/api/admin/flags/${encodeURIComponent(el.getAttribute('data-key'))}`, body); state.flags = await api('GET', '/api/admin/flags'); }, 'Flag saved.');
      return;
    }
    default:
  }
}

function onSubmit(ev) {
  const form = ev.target.closest('[data-form]');
  if (!form) return;
  ev.preventDefault();
  if (form.getAttribute('data-form') === 'search') {
    state.q = form.elements.q.value.trim();
    run(async () => { state.users = (await api('GET', `/api/admin/users?q=${encodeURIComponent(state.q)}`)).users; });
  } else if (form.getAttribute('data-form') === 'audit') {
    state.auditFilters = { actor: form.elements.actor.value.trim(), target: form.elements.target.value.trim(), action: form.elements.action.value.trim() };
    run(() => loadAudit());
  }
}

/** Mounts the admin page on `el`. */
export function mountAdmin(el) {
  root = el;
  root.addEventListener('click', onClick);
  root.addEventListener('submit', onSubmit);
  render();
  return boot();
}

if (globalThis.document && globalThis.document.getElementById('admin')) mountAdmin(globalThis.document.getElementById('admin'));
