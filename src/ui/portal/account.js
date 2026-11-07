// portal/account.js — the sign-in and Account screens of the portal surface
// (design/ACCOUNTS-SYNC-ROADMAP.md 8.3, Phase S1): render functions plus the
// branches portal/index.js's delegated listeners route to. No listeners of
// its own (rule 4); all networking goes through core/account.js.
//
//   #/account/sign-in   email -> 6-digit code -> (new account) name ->
//                       (if any) "bring this device's licenses?"
//   #/account           Profile        #/account/devices   Devices
//   #/account/licenses  Licenses: owned, this device's install, add, deactivate

import { account, ACCOUNT_SERVICE_URL } from '../../core/account.js';
import { sync } from '../../core/sync.js';
import { store } from '../../core/store.js';
import { LICENSES } from '../../data/licenses.js';
import { certStatus } from '../../domain/licensing.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const licenseById = new Map(LICENSES.map((l) => [l.id, l]));
const OWNABLE = LICENSES.filter((l) => !l.open);

// Screen state. Lives here, not in the campaign document: it's about this
// visit to the portal, and resets on reload.
const ui = {
  step: 'email', // sign-in: email | code | name | lift
  email: '',
  busy: false,
  error: '',
  notice: '',
  devices: null,
  devicesLoading: false,
  renaming: null,
  // Sync (Phase S2)
  syncStatus: null,     // core/syncKeys.js status(): {state, code, devices}
  syncLoading: false,
  synced: null,         // sync.listSynced()
  recoveryKey: null,    // shown once, right after turning sync on
  recoverySaved: false,
  collision: null,      // campaign id whose "Sync this campaign" hit an existing synced copy
};

let rerender = () => {};
/** portal/index.js hands over its render so async results can repaint. */
export function bindAccountScreens(render) {
  rerender = render;
  account.subscribe(() => rerender());
  sync.subscribe(() => rerender());
}

function resetMessages() { ui.error = ''; ui.notice = ''; }

/** Runs an account call with the busy flag and error display handled. */
async function run(fn) {
  ui.busy = true;
  resetMessages();
  rerender();
  try {
    await fn();
  } catch (err) {
    ui.error = (err && err.message) || 'Something went wrong.';
  } finally {
    ui.busy = false;
    rerender();
  }
}

const alertBox = () => (ui.error ? `<p class="portal-alert" role="alert">${esc(ui.error)}</p>` : '')
  + (ui.notice ? `<p class="portal-notice" role="status">${esc(ui.notice)}</p>` : '');

const disabled = () => (ui.busy ? 'disabled' : '');

function unavailableCard() {
  const fileMode = location.protocol === 'file:';
  return `
    <div class="portal-auth">
      <div class="portal-auth-card">
        <h1>Sign in on the online version</h1>
        <p class="portal-dim">${fileMode
    ? 'This copy of GMAtlas is opened as a file, so it can’t sign in. Everything here keeps working without an account.'
    : 'This copy of GMAtlas doesn’t include the account service. Everything here keeps working without an account.'}</p>
        <p>To use your account, open GMAtlas online and sign in there. To move a campaign across, export it here and import it there.</p>
        <a class="portal-btn primary block" href="${esc(ACCOUNT_SERVICE_URL)}#/account/sign-in">Open GMAtlas online</a>
        <p class="portal-auth-foot"><a href="#/help/move-to-another-device">Moving a campaign to another device</a></p>
      </div>
    </div>`;
}

// --- sign-in -----------------------------------------------------------------

/** What `#/account/sign-in` should do before rendering: a signed-in visit
 *  that isn't mid-flow goes to the Account page instead. */
export function signInRedirect() {
  const s = account.getState();
  return s.status === 'signed-in' && (ui.step === 'email' || ui.step === 'code') ? '#/account' : null;
}

export function signInView() {
  const s = account.getState();
  if (s.status === 'unavailable') return unavailableCard();
  return `<div class="portal-auth"><div class="portal-auth-card">${signInStep()}</div></div>`;
}

function signInStep() {
  if (ui.step === 'code') {
    return `
      <h1>Check your email</h1>
      <p class="portal-dim">We sent a 6-digit code to <strong>${esc(ui.email)}</strong>. It expires in 10 minutes.</p>
      <form data-account-form="code" novalidate>
        <label class="portal-field"><span>Sign-in code</span>
          <input class="portal-input portal-code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="123456" required autofocus>
        </label>
        ${alertBox()}
        <button class="portal-btn primary block" type="submit" ${disabled()}>${ui.busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p class="portal-auth-foot">
        <button type="button" class="portal-link" data-account-action="resend" ${disabled()}>Send a new code</button> ·
        <button type="button" class="portal-link" data-account-action="other-email" ${disabled()}>Use a different email</button>
      </p>`;
  }
  if (ui.step === 'name') {
    return `
      <h1>Welcome to GMAtlas</h1>
      <p class="portal-dim">Your account is ready. What should we call you?</p>
      <form data-account-form="name" novalidate>
        <label class="portal-field"><span>Your name</span>
          <input class="portal-input" name="displayName" autocomplete="name" maxlength="60" placeholder="e.g. Sam" autofocus>
        </label>
        ${alertBox()}
        <button class="portal-btn primary block" type="submit" ${disabled()}>Continue</button>
      </form>
      <p class="portal-auth-foot"><button type="button" class="portal-link" data-account-action="skip-name">Skip for now</button></p>`;
  }
  if (ui.step === 'lift') {
    const ids = account.liftInCandidates();
    return `
      <h1>Bring this device’s licenses?</h1>
      <p class="portal-dim">This device has books ticked as owned that your account doesn’t have yet. Add them, and they’ll be available on every device you sign in on.</p>
      <ul class="portal-check-list">${ids.map((id) => `<li>${esc(licenseLabel(id))}</li>`).join('')}</ul>
      ${alertBox()}
      <button type="button" class="portal-btn primary block" data-account-action="lift-in" ${disabled()}>${ui.busy ? 'Adding…' : 'Add to my account'}</button>
      <p class="portal-auth-foot"><button type="button" class="portal-link" data-account-action="lift-skip">Not now</button> (you can do this later under Account › Licenses)</p>`;
  }
  return `
    <h1>Sign in to GMAtlas</h1>
    <p class="portal-dim">New here? The same steps create your account.</p>
    <form data-account-form="email" novalidate>
      <label class="portal-field"><span>Email</span>
        <input class="portal-input" type="email" name="email" autocomplete="email" value="${esc(ui.email)}" placeholder="you@example.com" required autofocus>
      </label>
      ${alertBox()}
      <button class="portal-btn primary block" type="submit" ${disabled()}>${ui.busy ? 'Sending…' : 'Email me a code'}</button>
    </form>
    <p class="portal-auth-foot">No password needed: we’ll email you a 6-digit code.<br>Everything in GMAtlas also works without an account. <a href="#/">Back to campaign</a></p>`;
}

function licenseLabel(id) {
  const l = licenseById.get(id);
  return l ? `${l.family} — ${l.label}` : id;
}

function finishSignIn() {
  ui.step = 'email';
  location.hash = '#/account';
}

function afterName() {
  if (account.liftInCandidates().length) { ui.step = 'lift'; rerender(); } else finishSignIn();
}

// --- account pages -------------------------------------------------------------

const SECTIONS = [['profile', 'Profile', '#/account'], ['sync', 'Sync', '#/account/sync'], ['devices', 'Devices', '#/account/devices'], ['licenses', 'Licenses', '#/account/licenses']];

export function accountView(section) {
  const s = account.getState();
  if (s.status === 'unavailable') return unavailableCard();
  if (s.status !== 'signed-in') {
    return `
      <div class="portal-auth"><div class="portal-auth-card">
        <h1>You’re not signed in</h1>
        <p class="portal-dim">Sign in to keep your licenses with you on every device.</p>
        <a class="portal-btn primary block" href="#/account/sign-in">Sign in</a>
      </div></div>`;
  }
  const body = section === 'devices' ? devicesSection() : section === 'licenses' ? licensesSection() : section === 'sync' ? syncSection() : profileSection();
  return `
    <div class="portal-account">
      <nav class="portal-account-nav" aria-label="Account">
        ${SECTIONS.map(([id, label, href]) => `<a href="${href}" ${id === section ? 'aria-current="page"' : ''}>${label}</a>`).join('')}
      </nav>
      <section class="portal-account-body">
        ${s.offline ? '<p class="portal-notice" role="status">Can’t reach the GMAtlas service right now. You’re working from this device’s saved licenses; account changes need a connection.</p>' : ''}
        ${body}
      </section>
    </div>`;
}

/** Called by the router on entering a section, to load what it shows. */
export function enterAccountSection(section) {
  resetMessages();
  ui.renaming = null;
  if (account.getState().status !== 'signed-in') return;
  if (section === 'devices') { loadDevices(); loadSync(false); }
  if (section === 'sync') loadSync(true);
}

// --- sync ----------------------------------------------------------------------

async function loadSync(withList) {
  const keys = sync.keys();
  if (!keys) return;
  ui.syncLoading = true;
  rerender();
  try {
    ui.syncStatus = await keys.status();
    if (withList && ui.syncStatus.state === 'ready') ui.synced = await sync.listSynced();
    if (ui.syncStatus.state === 'ready') sync.retryNow();
  } catch (err) {
    ui.error = err.message;
  } finally {
    ui.syncLoading = false;
    rerender();
  }
}

const groupedCode = (code) => (code ? `${code.slice(0, 3)} ${code.slice(3)}` : '');

const SYNC_STATUS_TEXT = {
  live: 'Up to date',
  connecting: 'Connecting…',
  offline: 'Offline. Changes are saved on this device and sync when you’re back online.',
  locked: 'This device needs approving first.',
  off: 'Not synced',
};

function syncSection() {
  const st = ui.syncStatus;
  const intro = `
    <h1>Sync</h1>
    <p class="portal-dim">Keep campaigns the same on every device you sign in on. Everything is encrypted on this device before it’s sent, so GMAtlas’s servers can’t read your campaigns. Uploaded documents and images stay on the device they were added on.</p>
    ${alertBox()}`;
  if (!st) return `${intro}<p class="portal-dim">${ui.syncLoading ? 'Checking sync…' : ''}</p>`;
  if (ui.recoveryKey) {
    return `${intro}
      <div class="portal-panel portal-panel-accent">
        <h2>Save your recovery key</h2>
        <p>If you ever lose every device you’ve signed in on, this key is the only way to get your synced campaigns back. GMAtlas can’t recover it for you. Write it down, or keep it in a password manager.</p>
        <p class="portal-recovery" data-recovery-key>${esc(ui.recoveryKey)}</p>
        <p><button type="button" class="portal-btn" data-account-action="sync-copy">Copy</button></p>
        <label class="portal-toggle"><input type="checkbox" data-sync-saved ${ui.recoverySaved ? 'checked' : ''}> I’ve saved my recovery key</label>
        <p><button type="button" class="portal-btn primary" data-account-action="sync-recovery-done" ${ui.recoverySaved ? '' : 'disabled'}>Done</button></p>
      </div>`;
  }
  if (st.state === 'off') {
    return `${intro}
      <div class="portal-panel">
        <h2>Turn on sync</h2>
        <p class="portal-dim">You’ll get a recovery key to keep safe. Then pick which campaigns to sync.</p>
        <button type="button" class="portal-btn primary" data-account-action="sync-setup" ${disabled()}>${ui.busy ? 'Setting up…' : 'Turn on sync'}</button>
      </div>`;
  }
  if (st.state === 'locked') {
    const me = account.getState().device;
    return `${intro}
      <div class="portal-panel portal-panel-accent">
        <h2>Approve this device</h2>
        <p>Sync is on for your account, but this device needs approving before it can read your campaigns.</p>
        <p>On a device that already syncs, open <strong>Account › Devices</strong> and approve <strong>${esc(me ? me.name : 'this device')}</strong>. Check it shows this code:</p>
        <p class="portal-code-display">${esc(groupedCode(st.code))}</p>
        <button type="button" class="portal-btn" data-account-action="sync-check" ${disabled()}>${ui.syncLoading ? 'Checking…' : 'I’ve approved it'}</button>
      </div>
      <div class="portal-panel">
        <h2>Or use your recovery key</h2>
        <form data-account-form="recovery" novalidate>
          <label class="portal-field"><span>Recovery key</span>
            <input class="portal-input" name="recovery" autocomplete="off" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX">
          </label>
          <button class="portal-btn primary" type="submit" ${disabled()}>Unlock</button>
        </form>
      </div>`;
  }
  const live = sync.getState();
  const activeId = store.getAppConfig().activeCampaignId;
  const local = store.listCampaigns();
  const elsewhere = (ui.synced || []).filter((c) => !c.onThisDevice);
  const statusLine = live.status === 'error' ? `Problem: ${esc(live.error || 'sync stopped')}` : esc(SYNC_STATUS_TEXT[live.status] || '');
  return `${intro}
    ${live.notice ? `<p class="portal-notice" role="status">${esc(live.notice)}</p>` : ''}
    <div class="portal-panel">
      <h2>Campaigns on this device</h2>
      <ul class="portal-rows">${local.map((c) => `
        <li class="portal-row">
          <div class="portal-row-main">
            <strong>${esc(c.title)}</strong>${c.sync ? ' <span class="portal-badge">Synced</span>' : ''}
            ${c.id === activeId && c.sync ? `<span class="portal-dim">Open now · ${statusLine}</span>` : ''}
          </div>
          <div class="portal-row-actions">
            ${c.sync
    ? `<button type="button" class="portal-btn" data-account-action="sync-stop" data-campaign-id="${esc(c.id)}" ${disabled()}>Stop syncing</button>`
    : `<button type="button" class="portal-btn primary" data-account-action="sync-campaign" data-campaign-id="${esc(c.id)}" ${disabled()}>Sync this campaign</button>`}
          </div>
        </li>
        ${ui.collision === c.id ? `
        <li class="portal-row portal-row-note">
          <div class="portal-row-main">
            <strong>This campaign is already synced from another device.</strong>
            <span class="portal-dim">The two copies have separate histories, so they can’t be merged. Replacing keeps this copy in the backup slot first.</span>
          </div>
          <div class="portal-row-actions">
            <button type="button" class="portal-btn primary" data-account-action="sync-replace" data-campaign-id="${esc(c.id)}" ${disabled()}>Use the synced copy</button>
            <button type="button" class="portal-btn" data-account-action="sync-keep-both" data-campaign-id="${esc(c.id)}" ${disabled()}>Keep both</button>
            <button type="button" class="portal-link" data-account-action="sync-collision-cancel">Cancel</button>
          </div>
        </li>` : ''}`).join('')}</ul>
    </div>
    ${elsewhere.length ? `
      <div class="portal-panel">
        <h2>Synced from your other devices</h2>
        <ul class="portal-rows">${elsewhere.map((c) => `
          <li class="portal-row">
            <div class="portal-row-main"><strong>${esc(c.title)}</strong><span class="portal-dim">Last changed ${esc(when(c.updatedAt))}</span></div>
            <div class="portal-row-actions"><button type="button" class="portal-btn primary" data-account-action="sync-open" data-campaign-id="${esc(c.id)}" ${disabled()}>${ui.busy ? 'Downloading…' : 'Open on this device'}</button></div>
          </li>`).join('')}</ul>
      </div>` : ''}
    <div class="portal-panel">
      <h2>Reset sync</h2>
      <p class="portal-dim">Only if your recovery key is lost and no device can approve another. Deletes every synced copy from the server and turns sync off. Campaigns on your devices are kept.</p>
      <button type="button" class="portal-btn" data-account-action="sync-reset" ${disabled()}>Reset sync…</button>
    </div>`;
}

async function afterSyncChange(notice) {
  ui.syncStatus = await sync.keys().status();
  ui.synced = ui.syncStatus.state === 'ready' ? await sync.listSynced() : null;
  if (notice) ui.notice = notice;
}

function profileSection() {
  const { user } = account.getState();
  return `
    <h1>Profile</h1>
    <form class="portal-panel" data-account-form="profile" novalidate>
      <label class="portal-field"><span>Name</span>
        <input class="portal-input" name="displayName" maxlength="60" value="${esc(user.displayName || '')}" autocomplete="name">
      </label>
      <div class="portal-field"><span>Email</span><p class="portal-static">${esc(user.email)}</p></div>
      ${alertBox()}
      <button class="portal-btn primary" type="submit" ${disabled()}>Save</button>
    </form>
    <div class="portal-panel">
      <h2>Sign out</h2>
      <p class="portal-dim">Signs this browser out. Your campaigns stay on this device; licenses go back to what’s ticked on this device.</p>
      <button type="button" class="portal-btn" data-account-action="sign-out" ${disabled()}>Sign out</button>
    </div>`;
}

function when(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

async function loadDevices() {
  ui.devicesLoading = true;
  rerender();
  try {
    ui.devices = await account.listDevices();
  } catch (err) {
    ui.error = err.message;
  } finally {
    ui.devicesLoading = false;
    rerender();
  }
}

/** A device's sync standing, from the vault status: approved, waiting
 *  (asked to sync; this device can approve it), or nothing. */
function deviceSyncCell(d) {
  const st = ui.syncStatus;
  const row = st && st.devices.find((x) => x.id === d.id);
  if (!row || !row.ecdhPub) return '';
  if (row.approved) return ' <span class="portal-badge">Syncs</span>';
  if (d.current || st.state !== 'ready') return ' <span class="portal-badge portal-badge-warn">Waiting for approval</span>';
  return ` <span class="portal-badge portal-badge-warn">Wants to sync · code ${esc(groupedCode(row.code))}</span>`;
}

function deviceApproveButton(d) {
  const st = ui.syncStatus;
  const row = st && st.devices.find((x) => x.id === d.id);
  if (!row || !row.ecdhPub || row.approved || d.current || st.state !== 'ready') return '';
  return `<button type="button" class="portal-btn primary" data-account-action="sync-approve" data-device-id="${esc(d.id)}" ${disabled()}>Approve for sync</button>`;
}

function devicesSection() {
  const list = ui.devices;
  const rows = !list
    ? `<p class="portal-dim">${ui.devicesLoading ? 'Loading your devices…' : ''}</p>`
    : `<ul class="portal-rows">${list.map((d) => `
        <li class="portal-row">
          ${ui.renaming === d.id ? `
            <form class="portal-row-form" data-account-form="rename" data-device-id="${esc(d.id)}" novalidate>
              <input class="portal-input" name="name" maxlength="60" value="${esc(d.name)}" aria-label="Device name" autofocus>
              <button class="portal-btn primary" type="submit" ${disabled()}>Save</button>
              <button type="button" class="portal-btn" data-account-action="rename-cancel">Cancel</button>
            </form>` : `
            <div class="portal-row-main">
              <strong>${esc(d.name)}</strong>${d.current ? ' <span class="portal-badge">This device</span>' : ''}${deviceSyncCell(d)}
              <span class="portal-dim">${esc([d.platform, d.lastSeenAt ? `last seen ${when(d.lastSeenAt)}` : '', `added ${when(d.createdAt)}`].filter(Boolean).join(' · '))}</span>
            </div>
            <div class="portal-row-actions">
              ${deviceApproveButton(d)}
              <button type="button" class="portal-btn" data-account-action="rename" data-device-id="${esc(d.id)}" ${disabled()}>Rename</button>
              <button type="button" class="portal-btn" data-account-action="revoke" data-device-id="${esc(d.id)}" data-current="${d.current ? '1' : ''}" ${disabled()}>Sign out</button>
            </div>`}
        </li>`).join('')}</ul>`;
  return `
    <h1>Devices</h1>
    <p class="portal-dim">Every browser signed in to your account. Signing a device out takes effect straight away.</p>
    ${alertBox()}
    ${rows}`;
}

function licensesSection() {
  const { cert, device } = account.getState();
  const owned = (cert && cert.licenses) || [];
  const policy = (device && device.policy) || (cert && cert.policy) || { mode: 'follow', excluded: [], only: [] };
  const focused = policy.mode === 'focused';
  const onDevice = (id) => (focused ? (policy.only || []).includes(id) : !(policy.excluded || []).includes(id));
  const lift = account.liftInCandidates();
  const unowned = OWNABLE.filter((l) => !owned.includes(l.id));
  const status = certStatus(cert, Date.now());

  const ownedRows = owned.length
    ? `<ul class="portal-rows">${owned.map((id) => `
        <li class="portal-row">
          <div class="portal-row-main"><strong>${esc(licenseLabel(id))}</strong></div>
          <div class="portal-row-actions">
            <label class="portal-toggle"><input type="checkbox" data-account-device-license="${esc(id)}" ${onDevice(id) ? 'checked' : ''} ${disabled()}> On this device</label>
            <button type="button" class="portal-btn" data-account-action="deactivate" data-license-id="${esc(id)}" ${disabled()}>Deactivate</button>
          </div>
        </li>`).join('')}</ul>`
    : '<p class="portal-dim">Your account doesn’t own any licenses yet. Add the books you own below.</p>';

  return `
    <h1>Licenses</h1>
    <p class="portal-dim">Books you own follow your account to every device you sign in on. Open-licensed games (Ironsworn, Starforged) are always available and aren’t listed.</p>
    ${status === 'grace' || status === 'expired' ? '<p class="portal-notice" role="status">Your license certificate couldn’t be renewed recently. Connect to the internet to renew it; your campaigns aren’t affected.</p>' : ''}
    ${alertBox()}
    ${lift.length ? `
      <div class="portal-panel portal-panel-accent">
        <h2>Bring this device’s licenses into your account</h2>
        <p class="portal-dim">Ticked as owned on this device: ${lift.map((id) => esc(licenseLabel(id))).join(', ')}.</p>
        <button type="button" class="portal-btn primary" data-account-action="lift-in" ${disabled()}>Add to my account</button>
      </div>` : ''}
    <div class="portal-panel">
      <h2>Owned by your account</h2>
      <label class="portal-field"><span>This device shows</span>
        <select class="portal-input" data-account-policy-mode ${disabled()}>
          <option value="follow" ${focused ? '' : 'selected'}>All my licenses (new ones appear automatically)</option>
          <option value="focused" ${focused ? 'selected' : ''}>Only the ones I tick here</option>
        </select>
      </label>
      ${ownedRows}
    </div>
    ${unowned.length ? `
      <div class="portal-panel">
        <h2>Add a book you own</h2>
        <p class="portal-dim">GMAtlas doesn’t sell these. Adding one records that you own your copy.</p>
        <ul class="portal-rows">${unowned.map((l) => `
          <li class="portal-row">
            <div class="portal-row-main"><strong>${esc(`${l.family} — ${l.label}`)}</strong><span class="portal-dim">${esc(l.text)}</span></div>
            <div class="portal-row-actions"><button type="button" class="portal-btn" data-account-action="attest" data-license-id="${esc(l.id)}" ${disabled()}>I own this</button></div>
          </li>`).join('')}</ul>
      </div>` : ''}`;
}

function nextPolicy(changeId, checked, mode) {
  const { cert, device } = account.getState();
  const owned = (cert && cert.licenses) || [];
  const current = (device && device.policy) || { mode: 'follow', excluded: [], only: [] };
  if (mode && mode !== current.mode) {
    // Switching modes keeps what's showing right now.
    const showing = owned.filter((id) => (current.mode === 'focused' ? (current.only || []).includes(id) : !(current.excluded || []).includes(id)));
    return mode === 'focused' ? { mode, only: showing, excluded: [] } : { mode, excluded: owned.filter((id) => !showing.includes(id)), only: [] };
  }
  const listKey = current.mode === 'focused' ? 'only' : 'excluded';
  const include = current.mode === 'focused' ? checked : !checked;
  const set = new Set(current[listKey] || []);
  if (include) set.add(changeId); else set.delete(changeId);
  return { mode: current.mode, excluded: [], only: [], [listKey]: [...set] };
}

// --- handlers (called from portal/index.js's delegated listeners) -----------

/** A `submit` on the portal root. Returns true when handled. */
export function onAccountSubmit(e) {
  const form = e.target.closest('[data-account-form]');
  if (!form) return false;
  e.preventDefault();
  if (ui.busy) return true;
  const value = (name) => String((form.elements[name] && form.elements[name].value) || '').trim();
  switch (form.dataset.accountForm) {
    case 'email': {
      const email = value('email');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { ui.error = 'Enter a valid email address.'; ui.email = email; rerender(); return true; }
      ui.email = email;
      run(async () => { await account.requestCode(email); ui.step = 'code'; });
      return true;
    }
    case 'code': {
      const code = value('code').replace(/\s+/g, '');
      if (!/^\d{6}$/.test(code)) { ui.error = 'Enter the 6-digit code from the email.'; rerender(); return true; }
      run(async () => {
        const { newAccount } = await account.verifyCode(ui.email, code);
        if (newAccount) ui.step = 'name';
        else if (account.liftInCandidates().length) ui.step = 'lift';
        else finishSignIn();
      });
      return true;
    }
    case 'name': {
      const displayName = value('displayName');
      if (!displayName) { afterName(); return true; }
      run(async () => { await account.updateProfile({ displayName }); afterName(); });
      return true;
    }
    case 'profile':
      run(async () => { await account.updateProfile({ displayName: value('displayName') }); ui.notice = 'Saved.'; });
      return true;
    case 'recovery': {
      const text = value('recovery');
      run(async () => {
        await sync.keys().unlockWithRecovery(text);
        await afterSyncChange('This device is unlocked and can sync.');
        sync.retryNow();
      });
      return true;
    }
    case 'rename': {
      const id = form.dataset.deviceId;
      const name = value('name');
      run(async () => {
        const device = await account.renameDevice(id, name);
        ui.devices = (ui.devices || []).map((d) => (d.id === id ? device : d));
        ui.renaming = null;
      });
      return true;
    }
    default:
      return false;
  }
}

/** A `click` on the portal root. Returns true when handled. */
export function onAccountClick(e) {
  const btn = e.target.closest('[data-account-action]');
  if (!btn) return false;
  if (ui.busy) return true;
  const { deviceId, licenseId } = btn.dataset;
  switch (btn.dataset.accountAction) {
    case 'resend':
      run(async () => { await account.requestCode(ui.email); ui.notice = 'A new code is on its way.'; });
      break;
    case 'other-email':
      ui.step = 'email'; resetMessages(); rerender();
      break;
    case 'skip-name':
      afterName();
      break;
    case 'lift-in':
      run(async () => {
        await account.attest(account.liftInCandidates());
        if (ui.step === 'lift') finishSignIn(); else ui.notice = 'Added to your account.';
      });
      break;
    case 'lift-skip':
      finishSignIn();
      break;
    case 'sign-out':
      run(async () => { await account.signOut(); ui.devices = null; location.hash = '#/account/sign-in'; });
      break;
    case 'rename':
      ui.renaming = deviceId; resetMessages(); rerender();
      break;
    case 'rename-cancel':
      ui.renaming = null; rerender();
      break;
    case 'revoke': {
      const self = !!btn.dataset.current;
      if (!window.confirm(self ? 'Sign out of this device?' : 'Sign that device out? It will need to sign in again.')) break;
      run(async () => {
        await account.revokeDevice(deviceId);
        if (self) { ui.devices = null; location.hash = '#/account/sign-in'; return; }
        ui.devices = (ui.devices || []).filter((d) => d.id !== deviceId);
      });
      break;
    }
    case 'sync-setup':
      run(async () => {
        ui.recoveryKey = await sync.keys().setUp();
        ui.recoverySaved = false;
        await afterSyncChange();
      });
      break;
    case 'sync-copy': {
      const text = ui.recoveryKey;
      if (text && navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => { ui.notice = 'Recovery key copied.'; rerender(); }, () => { ui.error = 'Couldn’t copy. Select the key and copy it by hand.'; rerender(); });
      }
      break;
    }
    case 'sync-recovery-done':
      if (!ui.recoverySaved) break;
      ui.recoveryKey = null;
      resetMessages();
      rerender();
      break;
    case 'sync-check':
      loadSync(true);
      break;
    case 'sync-approve': {
      const row = ui.syncStatus && ui.syncStatus.devices.find((x) => x.id === deviceId);
      if (!row) break;
      if (!window.confirm(`Approve ${row.name} for sync?\n\nOnly if its screen shows the code ${groupedCode(row.code)}. If the codes differ, don’t approve it.`)) break;
      run(async () => { await sync.keys().approve(row); await afterSyncChange(`${row.name} can now sync.`); });
      break;
    }
    case 'sync-campaign': {
      const cid = btn.dataset.campaignId;
      run(async () => {
        try {
          await sync.syncCampaign(cid);
          await afterSyncChange('Syncing. Open this campaign on your other devices from Account › Sync.');
        } catch (err) {
          if (err.code === 'campaign_exists') { ui.collision = cid; return; }
          throw err;
        }
      });
      break;
    }
    case 'sync-collision-cancel':
      ui.collision = null; rerender();
      break;
    case 'sync-replace': {
      const cid = btn.dataset.campaignId;
      run(async () => { await sync.openHere(cid); ui.collision = null; await afterSyncChange('Replaced with the synced copy. The previous copy is in this campaign’s backup slot.'); });
      break;
    }
    case 'sync-keep-both': {
      const cid = btn.dataset.campaignId;
      run(async () => { await sync.keepBoth(cid); ui.collision = null; await afterSyncChange('Both kept: this device’s copy is renamed “(this device)”.'); });
      break;
    }
    case 'sync-stop': {
      const cid = btn.dataset.campaignId;
      if (!window.confirm('Stop syncing this campaign?\n\nThe synced copy is deleted from the server. Every device keeps the copy it has now, but they stop updating each other.')) break;
      run(async () => { await sync.stopSyncing(cid); await afterSyncChange('Sync stopped. This device keeps its copy.'); });
      break;
    }
    case 'sync-open': {
      const cid = btn.dataset.campaignId;
      run(async () => {
        await sync.openHere(cid);
        await store.switchCampaign(cid);
        location.hash = '#/';
      });
      break;
    }
    case 'sync-reset':
      if (!window.confirm('Reset sync?\n\nThis deletes every synced copy from the server and turns sync off for your account. Campaigns on your devices are kept. You’ll get a new recovery key if you turn sync on again.')) break;
      run(async () => {
        await account.request('DELETE', '/api/vault');
        for (const c of store.listCampaigns()) if (c.sync) await store.disableSync(c.id);
        await sync.keys().forget();
        sync.reconcile();
        await afterSyncChange('Sync is reset.');
      });
      break;
    case 'attest':
      run(async () => { await account.attest([licenseId]); ui.notice = `${licenseLabel(licenseId)} added to your account.`; });
      break;
    case 'deactivate':
      if (!window.confirm(`Deactivate ${licenseLabel(licenseId)}? It turns off on every device signed in to your account.`)) break;
      run(async () => { await account.deactivate(licenseId); ui.notice = `${licenseLabel(licenseId)} deactivated.`; });
      break;
    default:
      return false;
  }
  return true;
}

/** A `change` on the portal root. Returns true when handled. */
export function onAccountChange(e) {
  const saved = e.target.closest('[data-sync-saved]');
  if (saved) { ui.recoverySaved = saved.checked; rerender(); return true; }
  const mode = e.target.closest('[data-account-policy-mode]');
  const box = e.target.closest('[data-account-device-license]');
  if (!mode && !box) return false;
  const policy = mode ? nextPolicy(null, false, mode.value) : nextPolicy(box.dataset.accountDeviceLicense, box.checked, null);
  run(async () => { await account.setDevicePolicy(policy); });
  return true;
}
