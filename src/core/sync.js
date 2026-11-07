// sync.js — the sync transport (design/ACCOUNTS-SYNC-ROADMAP.md 5.3-5.6;
// Phase S2). One WebSocket, to the room of the campaign that's open, while
// signed in on an approved device. Networking and encryption only: merging
// and persistence are store.js (applyRemote, pendingBatches, ackBatch, ...),
// keys are core/syncKeys.js, REST goes through the account client.
//
// Every frame's payload is encrypted with the campaign's key before it
// leaves (domain/syncCrypto.js sealJson), so the server relays ciphertext.
//
// Incoming frames are handled strictly in order. While the GM is typing in
// a field (`canApply()` is false), they wait, so a remote change never
// re-renders the field being typed in; they apply as soon as it's left.
//
// Status (`getState().status`): 'off' (nothing to sync), 'locked' (this
// device isn't approved yet), 'connecting', 'live', 'offline' (will
// retry), 'error' (with `error`).

import { sealJson, openJson } from '../domain/syncCrypto.js';
import { createSyncKeys } from './syncKeys.js';

const BACKOFF_MS = [1000, 2000, 5000, 10000, 30000];
const HOLD_RETRY_MS = 750;
const MAX_PUSH_CHARS = 900 * 1024;

export function createSyncClient(options = {}) {
  const deps = {
    store: options.store || null,
    account: options.account || null,
    WebSocket: options.WebSocket || globalThis.WebSocket,
    location: options.location || globalThis.location,
    canApply: options.canApply || (() => true),
    setTimeout: options.setTimeout || ((fn, ms) => setTimeout(fn, ms)),
  };
  let keys = options.keys || null;
  let state = { status: 'off', campaignId: null, error: null };
  const listeners = new Set();
  let conn = null;          // {cid, ws, key, inflight:Set, queue:[], draining, closed}
  let retry = 0;
  let retryTimer = null;
  let remote = null;        // cached GET /api/campaigns rows, by id
  const titles = new Map(); // campaign id -> last title sent to the server

  function set(patch) {
    state = { ...state, ...patch };
    for (const fn of listeners) { try { fn(state); } catch (e) { console.error('sync listener failed', e); } }
  }

  const signedIn = () => deps.account.getState().status === 'signed-in';
  const deviceId = () => deps.account.getState().device && deps.account.getState().device.id;
  const activeId = () => deps.store.getAppConfig().activeCampaignId;

  async function remoteCampaigns(refresh = false) {
    if (!remote || refresh) {
      const { campaigns } = await deps.account.request('GET', '/api/campaigns');
      remote = new Map(campaigns.map((c) => [c.id, c]));
    }
    return remote;
  }

  async function campaignKey(cid) {
    let row = (await remoteCampaigns()).get(cid);
    if (!row) row = (await remoteCampaigns(true)).get(cid);
    if (!row) throw Object.assign(new Error('This campaign isn’t synced any more.'), { code: 'not_synced' });
    return keys.campaignKey(cid, row.sealedKey);
  }

  // --- connection ---------------------------------------------------------

  function close() {
    clearTimeout(retryTimer);
    retryTimer = null;
    if (conn) {
      conn.closed = true;
      try { conn.ws.close(1000, 'done'); } catch { /* already closed */ }
    }
    conn = null;
  }

  /** Brings the connection in line with the world: the open campaign, if
   *  it syncs, while signed in and unlocked; otherwise nothing. */
  async function reconcile() {
    if (!deps.store || !deps.account) return;
    if (!signedIn()) { close(); set({ status: 'off', campaignId: null, error: null }); return; }
    const cid = activeId();
    const synced = cid && deps.store.syncStatus(cid);
    if (!synced) { close(); set({ status: 'off', campaignId: null, error: null }); return; }
    if (conn && conn.cid === cid) return;
    close();
    connect(cid);
  }

  async function connect(cid) {
    const mine = { cid, ws: null, key: null, inflight: new Set(), queue: [], draining: false, closed: false };
    conn = mine;
    set({ status: 'connecting', campaignId: cid, error: null });
    try {
      const st = await keys.status();
      if (conn !== mine) return;
      if (st.state !== 'ready') { set({ status: 'locked' }); conn = null; return; }
      mine.key = await campaignKey(cid);
      const { ticket } = await deps.account.request('POST', '/api/sync/ticket', { campaignId: cid });
      if (conn !== mine) return;
      const loc = deps.location;
      const url = `${loc.protocol === 'https:' ? 'wss:' : 'ws:'}//${loc.host}/api/sync/socket?ticket=${encodeURIComponent(ticket)}`;
      const ws = new deps.WebSocket(url);
      mine.ws = ws;
      ws.onopen = async () => {
        if (conn !== mine) return;
        retry = 0;
        const status = deps.store.syncStatus(cid);
        ws.send(JSON.stringify({ t: 'hello', v: 1, cursor: status ? status.cursor : 0 }));
        pushAll(mine);
      };
      ws.onmessage = (ev) => {
        if (conn !== mine) return;
        let frame;
        try { frame = JSON.parse(typeof ev.data === 'string' ? ev.data : ''); } catch { return; }
        mine.queue.push(frame);
        drain(mine);
      };
      ws.onclose = () => { if (conn === mine && !mine.closed) lost(mine); };
      ws.onerror = () => { /* onclose follows */ };
    } catch (err) {
      if (conn !== mine) return;
      if (err.code === 'not_synced' || err.code === 'not_found') { await stoppedElsewhere(cid); return; }
      if (err.status === 401 || err.code === 'signed_out') { conn = null; set({ status: 'off' }); return; }
      lost(mine, err);
    }
  }

  function lost(mine, err) {
    if (conn !== mine) return;
    conn = null;
    const offline = !err || err.code === 'offline' || err.code === 'no_service';
    set({ status: offline ? 'offline' : 'error', error: err && !offline ? err.message : null });
    const wait = BACKOFF_MS[Math.min(retry, BACKOFF_MS.length - 1)];
    retry += 1;
    clearTimeout(retryTimer);
    retryTimer = deps.setTimeout(() => { retryTimer = null; reconcile(); }, wait);
  }

  /** Sync was stopped (or the campaign removed) from another device: this
   *  copy stays, as an ordinary local campaign. */
  async function stoppedElsewhere(cid) {
    if (conn && conn.cid === cid) { conn.closed = true; conn = null; }
    await deps.store.disableSync(cid);
    setOptOut(cid, true);
    remote = null;
    set({ status: 'off', campaignId: null, error: null, notice: 'Sync was turned off for this campaign on another device. This copy is kept here.' });
  }

  async function pushAll(mine) {
    if (conn !== mine || !mine.ws || mine.ws.readyState !== 1) return;
    const batches = await deps.store.pendingBatches(mine.cid);
    for (const b of batches) {
      if (conn !== mine || mine.inflight.has(b.batchId)) continue;
      const env = await sealJson(mine.key, b.ops, mine.cid, 'ops');
      const frame = JSON.stringify({ t: 'push', batchId: b.batchId, env: JSON.stringify(env) });
      if (frame.length > MAX_PUSH_CHARS) {
        set({ status: 'error', error: 'One change is too large to sync (over about 600 KB of text). It’s saved on this device.' });
        continue;
      }
      mine.inflight.add(b.batchId);
      try { mine.ws.send(frame); } catch { mine.inflight.delete(b.batchId); }
    }
  }

  async function drain(mine) {
    if (mine.draining) return;
    mine.draining = true;
    try {
      while (conn === mine && mine.queue.length) {
        if (!deps.canApply()) {
          // Typing: try again shortly. Order is kept, so acks wait too.
          mine.draining = false;
          deps.setTimeout(() => drain(mine), HOLD_RETRY_MS);
          return;
        }
        const frame = mine.queue.shift();
        await handle(mine, frame);
      }
    } catch (err) {
      console.warn('sync frame failed', err);
      if (conn === mine) {
        set({ status: 'error', error: err.message || 'Sync stopped after an error.' });
        mine.closed = true;
        try { mine.ws.close(1011, 'client error'); } catch { /* closed */ }
        lost(mine, err);
      }
    } finally {
      if (conn === mine) mine.draining = false;
    }
  }

  async function handle(mine, frame) {
    const { cid } = mine;
    switch (frame.t) {
      case 'welcome':
        break;
      case 'ops': {
        const all = [];
        let seq = 0;
        for (const op of frame.ops || []) {
          all.push(...await openJson(mine.key, JSON.parse(op.env), cid, 'ops'));
          seq = Math.max(seq, op.seq);
        }
        await deps.store.applyRemote(cid, all, seq);
        break;
      }
      case 'caughtUp':
        set({ status: 'live', error: null });
        pushAll(mine);
        break;
      case 'ack':
        mine.inflight.delete(frame.batchId);
        await deps.store.ackBatch(cid, frame.batchId, frame.seq);
        break;
      case 'snapshotReq':
        uploadSnapshot(cid, mine.key).catch((err) => console.warn('snapshot upload failed', err));
        break;
      case 'reset':
        await resetFromSnapshot(mine);
        break;
      case 'revoked':
        await stoppedElsewhere(cid);
        break;
      case 'error':
        if (frame.batchId) mine.inflight.delete(frame.batchId);
        set({ status: 'error', error: frame.message || 'The sync service refused a change.' });
        break;
      default:
        break;
    }
  }

  /** The log this device needed was compacted away: send what's waiting,
   *  then take the synced copy (this device's unsent edits were just sent,
   *  and come back in the tail). */
  async function resetFromSnapshot(mine) {
    await pushAll(mine);
    const { replica, upto, title } = await downloadSnapshot(mine.cid, mine.key);
    await deps.store.adoptSyncedCampaign({ id: mine.cid, title, replica, cursor: upto, deviceId: deviceId() });
    close();
    reconcile();
  }

  async function uploadSnapshot(cid, key) {
    const snap = await deps.store.syncSnapshot(cid);
    const env = await sealJson(key, snap.replica, cid, 'snapshot');
    await deps.account.request('PUT', `/api/campaigns/${encodeURIComponent(cid)}/snapshot?upto=${snap.cursor}`, env);
  }

  async function downloadSnapshot(cid, key) {
    const k = key || await campaignKey(cid);
    const snap = await deps.account.request('GET', `/api/campaigns/${encodeURIComponent(cid)}/snapshot`);
    const replica = await openJson(k, JSON.parse(snap.env), cid, 'snapshot');
    const row = (await remoteCampaigns()).get(cid);
    const meta = row ? await openJson(k, row.metaEnv, cid, 'meta').catch(() => ({})) : {};
    return { replica, upto: snap.upto, title: meta.title || (replica.doc.meta && replica.doc.meta.title) || 'Synced campaign' };
  }

  // --- what the Account → Sync page does ------------------------------------

  /** Starts syncing a local campaign. Rejects with code 'campaign_exists'
   *  if the account already syncs one with the same id (5.6). */
  async function syncCampaign(cid, { auto = false } = {}) {
    const entry = deps.store.listCampaigns().find((c) => c.id === cid);
    if (!entry) throw new Error('Unknown campaign');
    if (!auto && entry.syncOptOut) setOptOut(cid, false);
    if ((await remoteCampaigns(true)).has(cid)) throw Object.assign(new Error('This campaign is already synced from another device.'), { code: 'campaign_exists' });
    const { key, sealed } = await keys.newCampaignKey(cid);
    await deps.account.request('POST', '/api/campaigns', { id: cid, sealedKey: sealed, metaEnv: await sealJson(key, { title: entry.title }, cid, 'meta') });
    try {
      await deps.store.enableSync(cid, { deviceId: deviceId() });
      await uploadSnapshot(cid, key);
    } catch (err) {
      await deps.store.disableSync(cid).catch(() => {});
      await deps.account.request('DELETE', `/api/campaigns/${encodeURIComponent(cid)}`).catch(() => {});
      throw err;
    }
    titles.set(cid, entry.title);
    remote = null;
    reconcile();
  }

  /** Marks a campaign as one this device shouldn't sync by default (it was
   *  stopped on purpose), or clears that. */
  function setOptOut(cid, on) {
    deps.store.updateAppConfig((cfg) => ({ ...cfg, campaigns: cfg.campaigns.map((c) => (c.id === cid ? { ...c, syncOptOut: on || undefined } : c)) }));
  }

  /** Stops syncing everywhere: the server copy is deleted; every device
   *  keeps its own local copy, and none starts syncing it again by itself. */
  async function stopSyncing(cid) {
    await deps.account.request('DELETE', `/api/campaigns/${encodeURIComponent(cid)}`);
    remote = null;
    if (conn && conn.cid === cid) close();
    await deps.store.disableSync(cid);
    setOptOut(cid, true);
    reconcile();
  }

  // --- sync by default ----------------------------------------------------------
  // While signed in, every device keeps everything in step without being
  // asked: sync is set up on the first device (recovery key emailed), each
  // campaign that has been worked on starts syncing, and campaigns from the
  // account's other devices are brought here. Exceptions:
  //   - an untouched campaign (never edited: a fresh install's blank one)
  //     stays local until it's edited, so blanks don't multiply;
  //   - a campaign stopped on purpose (`syncOptOut`) stays local;
  //   - a synced campaign deleted on this device (`syncDeclined`) isn't
  //     downloaded again;
  //   - a local campaign whose id is already synced from elsewhere waits
  //     for the GM's choice on Account › Sync (replace or keep both).

  let autoRunning = null;
  let autoAgain = false;
  let lastSetup = null;

  // A campaign that has never been edited (store.campaignEdited). For one
  // from before that flag existed, fall back to "never saved after it was
  // created".
  const untouched = (doc) => {
    if (!doc || !doc.meta) return true;
    const edited = deps.store.campaignEdited(doc.meta.id);
    if (edited !== undefined) return !edited;
    return !doc.meta.updatedAt || doc.meta.updatedAt === doc.meta.createdAt;
  };

  function autoSync() {
    if (!deps.store || !deps.account || !keys || !signedIn()) return Promise.resolve();
    if (autoRunning) { autoAgain = true; return autoRunning; }
    autoRunning = (async () => {
      do { autoAgain = false; await autoSyncOnce(); } while (autoAgain);
    })().catch((err) => {
      console.warn('automatic sync failed', err);
      if (err.code !== 'offline' && err.code !== 'no_service') set({ error: err.message });
    }).finally(() => { autoRunning = null; });
    return autoRunning;
  }

  async function autoSyncOnce() {
    let st = await keys.status();
    if (st.state === 'off') {
      try {
        lastSetup = await keys.setUp();
      } catch (err) {
        if (err.code !== 'vault_exists') throw err; // another device just did it
      }
      st = await keys.status();
    }
    if (st.state !== 'ready') {
      if (!conn) set({ status: 'locked', campaignId: activeId() });
      return;
    }
    const known = await remoteCampaigns(true);
    for (const c of deps.store.listCampaigns()) {
      if (c.sync || c.syncOptOut || known.has(c.id)) continue;
      if (untouched(await deps.store.loadCampaign(c.id))) continue;
      try {
        await syncCampaign(c.id, { auto: true });
      } catch (err) {
        if (err.code !== 'campaign_exists') throw err;
      }
    }
    const declined = new Set(deps.store.getAppConfig().syncDeclined || []);
    const here = new Set(deps.store.listCampaigns().map((c) => c.id));
    const arrived = [];
    for (const row of (await remoteCampaigns(true)).values()) {
      if (here.has(row.id) || declined.has(row.id)) continue;
      await openHere(row.id);
      arrived.push(row);
    }
    // A fresh device: show the most recently changed synced campaign rather
    // than the blank one it started with.
    if (arrived.length) {
      const active = activeId();
      const entry = deps.store.listCampaigns().find((c) => c.id === active);
      if (entry && !entry.sync && untouched(await deps.store.loadCampaign(active))) {
        const newest = [...arrived].sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
        await deps.store.switchCampaign(newest.id);
      }
    }
    reconcile();
  }

  /** Synced campaigns on the account, titles decrypted, marked with
   *  whether this device has them. */
  async function listSynced() {
    const rows = [...(await remoteCampaigns(true)).values()];
    const local = new Map(deps.store.listCampaigns().map((c) => [c.id, c]));
    return Promise.all(rows.map(async (row) => {
      let title = 'Synced campaign';
      try { title = (await openJson(await keys.campaignKey(row.id, row.sealedKey), row.metaEnv, row.id, 'meta')).title || title; } catch { /* key not available */ }
      const here = local.get(row.id);
      return { id: row.id, title, updatedAt: row.updatedAt, onThisDevice: !!here, syncingHere: !!(here && here.sync) };
    }));
  }

  /** Brings a synced campaign here: new, or replacing the local copy with
   *  the same id. Resolves to its id. */
  async function openHere(cid) {
    const declined = deps.store.getAppConfig().syncDeclined || [];
    if (declined.includes(cid)) deps.store.updateAppConfig((cfg) => ({ ...cfg, syncDeclined: (cfg.syncDeclined || []).filter((id) => id !== cid) }));
    const { replica, upto, title } = await downloadSnapshot(cid);
    await deps.store.adoptSyncedCampaign({ id: cid, title, replica, cursor: upto, deviceId: deviceId() });
    titles.set(cid, title);
    reconcile();
    return cid;
  }

  /** "Keep both": the local copy gets a new id, then the synced one comes in. */
  async function keepBoth(cid) {
    await deps.store.forkCampaign(cid);
    return openHere(cid);
  }

  /** Re-encrypts a synced campaign's title on the server when it changes
   *  here (the server lists titles it can't read). */
  async function pushTitles() {
    for (const c of deps.store.listCampaigns()) {
      if (!c.sync || !signedIn()) continue;
      if (!titles.has(c.id)) { titles.set(c.id, c.title); continue; }
      if (titles.get(c.id) === c.title) continue;
      titles.set(c.id, c.title);
      try {
        const key = await campaignKey(c.id);
        await deps.account.request('PATCH', `/api/campaigns/${encodeURIComponent(c.id)}`, { metaEnv: await sealJson(key, { title: c.title }, c.id, 'meta') });
      } catch (err) { console.warn('title sync failed', err); titles.delete(c.id); }
    }
  }

  /** Wires the client to the app. Safe to call once. */
  function start({ store, account, canApply }) {
    deps.store = store || deps.store;
    deps.account = account || deps.account;
    if (canApply) deps.canApply = canApply;
    if (!keys) keys = createSyncKeys({ store: deps.store, account: deps.account });
    deps.store.onLocalOps((cid) => { if (conn && conn.cid === cid) pushAll(conn); });
    // Reconnect only when the open campaign, or whether it syncs, changes;
    // not on every edit.
    const wanted = () => { const a = activeId(); return `${a}|${!!(a && deps.store.syncStatus(a))}`; };
    // Sync by default re-runs when the set of campaigns changes, or the
    // open one is edited for the first time.
    const campaignsShape = () => {
      const doc = deps.store.get();
      return deps.store.listCampaigns().map((c) => `${c.id}:${c.sync ? 1 : 0}${c.syncOptOut ? 1 : 0}`).join(',') + (untouched(doc) ? '' : `|${activeId()}`);
    };
    let lastWanted = wanted();
    let lastShape = campaignsShape();
    deps.store.subscribe(() => {
      const now = wanted();
      if (now !== lastWanted) { lastWanted = now; reconcile(); }
      const shape = campaignsShape();
      if (shape !== lastShape) { lastShape = shape; autoSync(); }
      pushTitles();
    });
    let lastSignedIn = signedIn();
    deps.account.subscribe(() => {
      const now = signedIn();
      if (now === lastSignedIn) return;
      lastSignedIn = now;
      remote = null;
      if (!now) { lastSetup = null; keys.forget().catch(() => {}); }
      reconcile();
      if (now) autoSync();
    });
    // Coming back to the tab, or back online: catch up on what the other
    // devices did meanwhile.
    if (globalThis.addEventListener) {
      globalThis.addEventListener('online', () => retryNow());
    }
    if (globalThis.document && globalThis.document.addEventListener) {
      globalThis.document.addEventListener('visibilitychange', () => { if (globalThis.document.visibilityState === 'visible') autoSync(); });
    }
    reconcile();
    autoSync();
  }

  /** Retry now (after approving this device, or coming back online). */
  function retryNow() {
    clearTimeout(retryTimer);
    retryTimer = null;
    retry = 0;
    autoSync();
    if (conn && !conn.ws) return;
    if (!conn) reconcile();
  }

  return {
    start, reconcile, retryNow, autoSync, syncCampaign,
    /** The recovery key from sync's automatic set-up this session (shown
     *  once on Account › Sync), and where it was emailed. */
    lastSetup: () => lastSetup,
    clearLastSetup: () => { lastSetup = null; }, stopSyncing, listSynced, openHere, keepBoth,
    keys: () => keys,
    getState: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}

/** The app's sync client. main.js calls sync.start({store, account}). */
export const sync = createSyncClient();
