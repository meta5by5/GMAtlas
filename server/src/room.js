// room.js â€” the CampaignRoom Durable Object: one per synced campaign, the
// single-threaded authority that orders its ops (roadmap 2.1, 5.4). A thin
// shell around roomCore.js. Uses WebSocket hibernation, so an open but idle
// campaign costs next to nothing. Only the Worker calls it, after checking
// the caller owns the campaign (sync.js), and passes who it is in headers.
//
// A plain class (not `extends DurableObject`), so Node tests can load it
// without the `cloudflare:workers` module; fetch + hibernation handlers
// work the same either way.

import { createRoomCore } from './roomCore.js';

// An SDP offer with its candidates is a few KB; sealed and base64'd, well
// under this.
const MAX_SIGNAL_CHARS = 64 * 1024;

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export class CampaignRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    this.core = null;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const deviceId = request.headers.get('x-device-id') || '';
    try {
      if (url.pathname === '/socket') {
        if (request.headers.get('upgrade') !== 'websocket') return json({ error: 'upgrade_required' }, 426);
        const pair = new WebSocketPair();
        this.accept(pair[1], deviceId, { p2p: request.headers.get('x-p2p') === '1' });
        return new Response(null, { status: 101, webSocket: pair[0] });
      }
      if (url.pathname === '/snapshot' && request.method === 'GET') {
        const snap = this.ensureCore().getSnapshot();
        return snap ? json(snap) : json({ error: 'not_found', message: 'No snapshot yet.' }, 404);
      }
      if (url.pathname === '/snapshot' && request.method === 'PUT') {
        return json(this.ensureCore().putSnapshot(url.searchParams.get('upto'), await request.text()));
      }
      if (url.pathname === '/stats') return json(this.ensureCore().stats());
      if (url.pathname === '/destroy' && request.method === 'POST') {
        for (const ws of this.ctx.getWebSockets()) {
          try { ws.send(JSON.stringify({ t: 'revoked', reason: 'stopped' })); ws.close(4000, 'Sync stopped'); } catch { /* already gone */ }
        }
        await this.ctx.storage.deleteAll();
        this.core = null;
        return json({ ok: true });
      }
      return json({ error: 'not_found' }, 404);
    } catch (err) {
      return json({ error: err.code || 'room_error', message: err.message }, err.status || 500);
    }
  }

  /** Takes a server-side socket into the room (hibernatable). `p2p`: the
   *  account has device-to-device transfer on (checked by the Worker). */
  accept(ws, deviceId, { p2p = false } = {}) {
    this.ctx.acceptWebSocket(ws);
    ws.serializeAttachment({ deviceId, p2p });
  }

  ensureCore() {
    if (!this.core) {
      const storage = this.ctx.storage;
      this.core = createRoomCore({
        sql: (query, ...args) => storage.sql.exec(query, ...args).toArray(),
        transaction: (fn) => storage.transactionSync(fn),
        now: () => (this.env && this.env.now ? this.env.now() : Date.now()),
      });
    }
    return this.core;
  }

  async webSocketMessage(ws, message) {
    const send = (socket, frame) => { try { socket.send(JSON.stringify(frame)); } catch { /* closed */ } };
    let msg;
    try { msg = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message)); } catch {
      send(ws, { t: 'error', code: 'bad_json', message: 'Frames must be JSON.' });
      return;
    }
    const att = ws.deserializeAttachment() || {};
    const { deviceId } = att;
    const core = this.ensureCore();
    if (msg.t === 'hello') {
      const frames = core.hello(msg);
      for (const frame of frames) send(ws, frame);
      // A socket told to reset reloads first; it counts once it's caught up.
      const live = !frames.length || frames[0].t !== 'reset';
      const was = !!att.live;
      ws.serializeAttachment({ ...att, live });
      if (live || was) this.presence();
    } else if (msg.t === 'signal') {
      this.signal(ws, att, msg, send);
    } else if (msg.t === 'push') {
      const { reply, fanout } = core.push(deviceId, msg);
      for (const frame of reply) send(ws, frame);
      if (fanout.length) {
        for (const other of this.ctx.getWebSockets()) if (other !== ws) for (const frame of fanout) send(other, frame);
      }
    } else if (msg.t === 'ping') {
      send(ws, { t: 'pong' });
    } else {
      send(ws, { t: 'error', code: 'unknown_frame', message: `Unknown frame: ${msg.t}` });
    }
  }

  /** Device-to-device transfer set-up (roadmap S3 item 2): relays an opaque
   *  message between this campaign's open devices, all the owner's own. The
   *  payload is sealed with the campaign key on the device, so the room sees
   *  only who it's for: `to` a device id, or '*' for every other device.
   *  `ref` is echoed back in `signal-gone` when nobody is there to get it. */
  signal(ws, att, msg, send) {
    if (!att.p2p) { send(ws, { t: 'error', code: 'feature_off', message: 'Device-to-device transfer is turned off for this account.' }); return; }
    if (typeof msg.data !== 'string' || msg.data.length > MAX_SIGNAL_CHARS || typeof msg.to !== 'string') {
      send(ws, { t: 'error', code: 'bad_signal', message: 'Transfer set-up message refused.' });
      return;
    }
    const targets = this.ctx.getWebSockets().filter((s) => {
      if (s === ws) return false;
      const a = s.deserializeAttachment() || {};
      return a.live && a.p2p && a.deviceId && (msg.to === '*' ? a.deviceId !== att.deviceId : a.deviceId === msg.to);
    });
    if (!targets.length) { if (msg.to !== '*') send(ws, { t: 'signal-gone', to: msg.to, ref: msg.ref || null }); return; }
    const frame = { t: 'signal', from: att.deviceId, data: msg.data };
    for (const s of targets) send(s, frame);
  }

  /** Presence-lite (roadmap S2 item 4): tells every socket which devices
   *  have this campaign open, `{t:'presence', devices:[id...]}`. Sent after
   *  each hello and whenever a socket leaves. Device ids only; the client
   *  knows its own devices' names. */
  presence(leaving = null) {
    const open = this.ctx.getWebSockets().filter((s) => s !== leaving);
    const devices = [...new Set(open.map((s) => (s.deserializeAttachment() || {})).filter((a) => a.live && a.deviceId).map((a) => a.deviceId))].sort();
    const frame = JSON.stringify({ t: 'presence', devices });
    for (const s of open) {
      if (!(s.deserializeAttachment() || {}).live) continue;
      try { s.send(frame); } catch { /* closed */ }
    }
  }

  async webSocketClose(ws, code) {
    try { ws.close(code === 1005 ? 1000 : code, 'closing'); } catch { /* already closed */ }
    this.presence(ws);
  }

  async webSocketError(ws) {
    try { ws.close(1011, 'error'); } catch { /* already closed */ }
    this.presence(ws);
  }
}
