// p2p.js — device-to-device document transfer (design/ACCOUNTS-SYNC-
// ROADMAP.md 6.3, Phase S3 item 2; design/adr/document-transfer.md). The
// browser-only, impure edge: WebRTC and the signalling through sync.js. The
// decisions (what to ask for, what to hand out, chunking, which device) are
// domain/blobTransfer.js.
//
// How a missing file arrives:
//   1. While a synced campaign is open with other devices, this device asks
//      them all which of its missing files they hold ('want' -> 'have').
//   2. "Get it from <device>" opens a WebRTC data channel to that device:
//      the offer, answer and ICE candidates go through the campaign room,
//      sealed with the campaign key. The bytes go directly between the two
//      devices, DTLS-encrypted, and never through the server.
//   3. Each file comes in 64 KiB chunks and is checked against its own
//      content key before it's stored.
//
// A device only ever hands out files the open campaign points at
// (blobTransfer.servableKeys), and only to the same account's devices (the
// room only admits the owner's).

import {
  servableKeys, wantedKeys, answerWant, chooseSource, chunkRanges, createAssembler,
  parseControl, parseSignal, iceConfig, relayPossible, isRelayCandidate, stripRelayCandidates,
} from '../domain/blobTransfer.js';
import { FEATURES } from '../data/features.js';
import { certHasFeature } from '../domain/features.js';

const ASK_DEBOUNCE_MS = 400;
const CONNECT_TIMEOUT_MS = 20000;
const FILE_TIMEOUT_MS = 60000;
const ICE_CACHE_MS = 60 * 60 * 1000;
const BUFFER_HIGH = 1024 * 1024;
const BUFFER_LOW = 256 * 1024;

export function createP2P(options = {}) {
  const deps = {
    store: options.store || null,
    sync: options.sync || null,
    account: options.account || null,
    RTCPeerConnection: options.RTCPeerConnection || globalThis.RTCPeerConnection,
    Blob: options.Blob || globalThis.Blob,
    setTimeout: options.setTimeout || ((fn, ms) => setTimeout(fn, ms)),
    clearTimeout: options.clearTimeout || ((t) => clearTimeout(t)),
  };
  // haves: device id -> Set of keys it said it holds, for the open campaign.
  // transfers: key -> {status: 'waiting'|'receiving'|'done'|'failed', received, size, from, error}
  let state = { cid: null, haves: new Map(), transfers: {}, busy: false, error: null, relay: false };
  const listeners = new Set();
  let present = new Set();
  let askTimer = null;
  let lastAsk = '';
  let ice = null; // {iceServers, relay, at}
  const sessions = new Map(); // sid -> {pc, dc, peer, role}

  function set(patch) {
    state = { ...state, ...patch };
    for (const fn of listeners) { try { fn(state); } catch (e) { console.error('p2p listener failed', e); } }
  }

  const syncState = () => deps.sync.getState();
  const directOnly = () => !!((deps.store.getAppConfig().p2p || {}).directOnly);

  /** Whether transfer can run here: signed in with the feature on, the open
   *  campaign connected, and a browser with WebRTC. */
  function available() {
    if (!deps.RTCPeerConnection || !deps.account || !deps.sync) return false;
    const acct = deps.account.getState();
    if (acct.status !== 'signed-in' || !certHasFeature(acct.cert, 'p2p.transfer', FEATURES)) return false;
    return syncState().status === 'live';
  }

  function otherDevices() {
    const me = deps.sync.deviceId();
    return (syncState().presence || []).filter((id) => id !== me);
  }

  async function refreshPresent() {
    try { present = new Set(await deps.store.listDocBlobKeys()); } catch { /* keep what we had */ }
  }

  function campaign() { return deps.store.get(); }

  // --- asking who has what ---------------------------------------------------

  function askSoon() {
    deps.clearTimeout(askTimer);
    askTimer = deps.setTimeout(() => { askTimer = null; ask(); }, ASK_DEBOUNCE_MS);
  }

  async function ask(force = false) {
    if (!available()) { if (state.haves.size) set({ haves: new Map() }); return; }
    const cid = syncState().campaignId;
    if (cid !== state.cid) set({ cid, haves: new Map(), transfers: {} });
    const others = otherDevices();
    // Forget devices that left.
    const haves = new Map([...state.haves].filter(([id]) => others.includes(id)));
    if (haves.size !== state.haves.size) set({ haves });
    if (!others.length) return;
    await refreshPresent();
    const wanted = wantedKeys(campaign(), present);
    const shape = `${cid}|${others.join(',')}|${wanted.join(',')}`;
    if (!wanted.length || (!force && shape === lastAsk)) return;
    lastAsk = shape;
    await deps.sync.sendSignal('*', { k: 'want', keys: wanted });
  }

  /** Devices online now that said they hold `key`. */
  function sourcesFor(key) {
    const others = otherDevices();
    return [...state.haves].filter(([id, keys]) => others.includes(id) && keys.has(key)).map(([id]) => id);
  }

  // --- signalling ------------------------------------------------------------

  async function onSignal(event) {
    if (event.gone) {
      for (const [sid, s] of sessions) if (s.peer === event.gone) endSession(sid, 'That device went offline.');
      return;
    }
    const { from } = event;
    const msg = parseSignal(event.body);
    if (!msg || !from || event.cid !== syncState().campaignId) return;
    if (msg.k === 'want') {
      await refreshPresent();
      const keys = answerWant(msg.keys, servableKeys(campaign()), present);
      if (keys.length) await deps.sync.sendSignal(from, { k: 'have', keys });
    } else if (msg.k === 'have') {
      const haves = new Map(state.haves);
      haves.set(from, new Set(msg.keys));
      set({ haves });
    } else if (msg.k === 'offer') {
      await answerOffer(from, msg);
    } else if (msg.k === 'answer') {
      const s = sessions.get(msg.sid);
      if (s && s.peer === from && s.role === 'fetch') await s.pc.setRemoteDescription({ type: 'answer', sdp: s.direct ? stripRelayCandidates(msg.sdp) : msg.sdp });
    } else if (msg.k === 'ice') {
      const s = sessions.get(msg.sid);
      if (s && s.peer === from && msg.c && !(s.direct && isRelayCandidate(msg.c))) { try { await s.pc.addIceCandidate(msg.c); } catch { /* a late or stale candidate */ } }
    } else if (msg.k === 'bye') {
      const s = sessions.get(msg.sid);
      if (s && s.peer === from) endSession(msg.sid);
    }
  }

  /** The connection settings for one session. `direct`: no relay at either
   *  end (this device's "Direct connections only", or the other device's,
   *  carried in its offer). */
  async function iceServers(direct) {
    if (!ice || Date.now() - ice.at > ICE_CACHE_MS) {
      const res = await deps.account.request('GET', '/api/p2p/ice');
      ice = { iceServers: res.iceServers || [], relay: !!res.relay, at: Date.now() };
    }
    set({ relay: relayPossible(ice.iceServers, { directOnly: directOnly() }) });
    return iceConfig(ice.iceServers, { directOnly: direct });
  }

  function newPeer(sid, peer, role, config, direct) {
    const pc = new deps.RTCPeerConnection(config);
    const s = { pc, dc: null, peer, role, direct };
    sessions.set(sid, s);
    pc.onicecandidate = (ev) => {
      if (!ev || !ev.candidate || (direct && isRelayCandidate(ev.candidate))) return;
      deps.sync.sendSignal(peer, { k: 'ice', sid, c: typeof ev.candidate.toJSON === 'function' ? ev.candidate.toJSON() : ev.candidate }, sid);
    };
    return s;
  }

  function endSession(sid, error = null) {
    const s = sessions.get(sid);
    if (!s) return;
    sessions.delete(sid);
    if (s.fail) s.fail(error || 'The connection closed.');
    try { if (s.dc) s.dc.close(); } catch { /* closed */ }
    try { s.pc.close(); } catch { /* closed */ }
  }

  // --- handing files out (the device that has them) -------------------------

  async function answerOffer(from, msg) {
    if (!available()) return;
    const direct = msg.direct || directOnly();
    const s = newPeer(msg.sid, from, 'serve', await iceServers(direct), direct);
    s.pc.ondatachannel = (ev) => { s.dc = ev.channel; serve(msg.sid, ev.channel); };
    await s.pc.setRemoteDescription({ type: 'offer', sdp: direct ? stripRelayCandidates(msg.sdp) : msg.sdp });
    const answer = await s.pc.createAnswer();
    await s.pc.setLocalDescription(answer);
    await deps.sync.sendSignal(from, { k: 'answer', sid: msg.sid, sdp: answer.sdp || (s.pc.localDescription && s.pc.localDescription.sdp) }, msg.sid);
  }

  function drained(dc) {
    if (dc.bufferedAmount <= BUFFER_HIGH) return Promise.resolve();
    return new Promise((resolve) => {
      dc.bufferedAmountLowThreshold = BUFFER_LOW;
      const prev = dc.onbufferedamountlow;
      dc.onbufferedamountlow = () => { dc.onbufferedamountlow = prev || null; resolve(); };
    });
  }

  function serve(sid, dc) {
    dc.binaryType = 'arraybuffer';
    let queue = Promise.resolve();
    dc.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      const m = parseControl(ev.data);
      if (!m) return;
      if (m.t === 'done') { endSession(sid); return; }
      if (m.t !== 'get') return;
      queue = queue.then(() => sendFile(dc, m.key)).catch((err) => { console.warn('p2p send failed', err); try { dc.send(JSON.stringify({ t: 'nope', key: m.key })); } catch { /* closed */ } });
    };
  }

  async function sendFile(dc, key) {
    await refreshPresent();
    if (!servableKeys(campaign()).has(key) || !present.has(key)) { dc.send(JSON.stringify({ t: 'nope', key })); return; }
    const blob = await deps.store.getDocBlob(key);
    if (!blob) { dc.send(JSON.stringify({ t: 'nope', key })); return; }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    dc.send(JSON.stringify({ t: 'meta', key, size: bytes.length, mime: blob.type || '' }));
    for (const [start, end] of chunkRanges(bytes.length)) {
      await drained(dc);
      dc.send(bytes.slice(start, end).buffer);
    }
    dc.send(JSON.stringify({ t: 'end', key }));
  }

  // --- fetching files (the device that's missing them) ----------------------

  function setTransfer(key, patch) {
    set({ transfers: { ...state.transfers, [key]: { ...(state.transfers[key] || {}), ...patch } } });
  }

  /** Gets `keys` (default: every missing file another device holds) from
   *  `from` (default: whichever online device holds the most of them).
   *  Resolves to {got, failed}; never rejects. */
  async function fetchMissing({ keys = null, from = null } = {}) {
    if (state.busy) return { got: 0, failed: 0, error: 'Already getting files.' };
    if (!available()) return { got: 0, failed: 0, error: 'Not connected.' };
    await refreshPresent();
    const wanted = (keys || wantedKeys(campaign(), present)).filter((k) => !present.has(k));
    const source = from || chooseSource(new Map([...state.haves].filter(([id]) => otherDevices().includes(id))), wanted);
    const theirs = source && state.haves.get(source);
    const list = theirs ? wanted.filter((k) => theirs.has(k)) : [];
    if (!list.length) return { got: 0, failed: 0, error: 'No online device has those files.' };
    set({ busy: true, error: null });
    for (const k of list) setTransfer(k, { status: 'waiting', received: 0, size: 0, from: source, error: null });
    const sid = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    let got = 0;
    let failed = 0;
    let error = null;
    try {
      const direct = directOnly();
      const s = newPeer(sid, source, 'fetch', await iceServers(direct), direct);
      const dc = s.pc.createDataChannel('gmatlas-files', { ordered: true });
      s.dc = dc;
      dc.binaryType = 'arraybuffer';
      const opened = new Promise((resolve, reject) => {
        const t = deps.setTimeout(() => reject(new Error(directOnly()
          ? 'Couldn’t connect directly to that device. “Direct connections only” is on, so no relay was tried.'
          : 'Couldn’t connect to that device.')), CONNECT_TIMEOUT_MS);
        dc.onopen = () => { deps.clearTimeout(t); resolve(); };
        s.fail = (msg) => { deps.clearTimeout(t); reject(new Error(msg)); };
      });
      const offer = await s.pc.createOffer();
      await s.pc.setLocalDescription(offer);
      await deps.sync.sendSignal(source, { k: 'offer', sid, sdp: offer.sdp || (s.pc.localDescription && s.pc.localDescription.sdp), direct }, sid);
      await opened;
      for (const key of list) {
        try {
          await receiveFile(s, dc, key);
          got += 1;
        } catch (err) {
          failed += 1;
          setTransfer(key, { status: 'failed', error: err.message });
          if (!sessions.has(sid)) throw err;
        }
      }
      try { dc.send(JSON.stringify({ t: 'done' })); } catch { /* closed */ }
      deps.sync.sendSignal(source, { k: 'bye', sid });
    } catch (err) {
      error = err.message || 'The transfer stopped.';
      for (const k of list) if (state.transfers[k] && state.transfers[k].status !== 'done' && state.transfers[k].status !== 'failed') { setTransfer(k, { status: 'failed', error }); failed += 1; }
    } finally {
      endSession(sid);
      set({ busy: false, error });
      await refreshPresent();
      lastAsk = '';
      askSoon();
    }
    return { got, failed, error };
  }

  function receiveFile(s, dc, key) {
    return new Promise((resolve, reject) => {
      let asm = null;
      let mime = '';
      const timer = deps.setTimeout(() => finish(new Error('That device stopped sending.')), FILE_TIMEOUT_MS);
      const finish = (err) => {
        deps.clearTimeout(timer);
        dc.onmessage = null;
        s.fail = null;
        if (err) reject(err); else resolve();
      };
      s.fail = (msg) => finish(new Error(msg));
      dc.onmessage = async (ev) => {
        if (typeof ev.data !== 'string') {
          if (!asm || !asm.add(new Uint8Array(ev.data))) { finish(new Error('The file arrived damaged.')); return; }
          setTransfer(key, { received: asm.received() });
          return;
        }
        const m = parseControl(ev.data);
        if (!m || m.key !== key) return;
        if (m.t === 'nope') { finish(new Error('That device doesn’t have it any more.')); return; }
        if (m.t === 'meta') { asm = createAssembler({ size: m.size }); mime = m.mime; setTransfer(key, { status: 'receiving', size: m.size, received: 0 }); return; }
        if (m.t === 'end') {
          if (!asm || !asm.complete()) { finish(new Error('The file arrived incomplete.')); return; }
          try {
            const blob = new deps.Blob([asm.bytes()], { type: mime });
            // The key names the bytes: anything else is refused, not stored.
            if ((await deps.store.contentKeyFor(blob)) !== key) { finish(new Error('The file arrived damaged.')); return; }
            await deps.store.putDocBlob(key, blob);
            setTransfer(key, { status: 'done', received: asm.received() });
            finish();
          } catch (err) { finish(err); }
        }
      };
      dc.send(JSON.stringify({ t: 'get', key }));
    });
  }

  /** "Direct connections only" (decision D7): this device never uses a
   *  relay. Per device. */
  function setDirectOnly(on) {
    deps.store.updateAppConfig((c) => ({ ...c, p2p: { ...(c.p2p || {}), directOnly: !!on } }));
    if (ice) set({ relay: relayPossible(ice.iceServers, { directOnly: !!on }) });
  }

  function start({ store, sync, account } = {}) {
    if (store) deps.store = store;
    if (sync) deps.sync = sync;
    if (account) deps.account = account;
    deps.sync.onSignal((e) => { onSignal(e).catch((err) => console.warn('p2p signal failed', err)); });
    let lastShape = '';
    deps.sync.subscribe((s) => {
      const shape = `${s.status}|${s.campaignId}|${(s.presence || []).join(',')}`;
      if (shape !== lastShape) { lastShape = shape; askSoon(); }
    });
    deps.store.subscribe(() => askSoon());
    deps.account.subscribe(() => askSoon());
  }

  return {
    start, ask, fetchMissing, sourcesFor, available, setDirectOnly,
    directOnly: () => !!deps.store && directOnly(),
    getState: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}

/** The app's transfer client. main.js calls p2p.start({store, sync, account}). */
export const p2p = createP2P();
