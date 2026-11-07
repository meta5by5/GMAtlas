// roomCore.js — one synced campaign's ordered, encrypted op log
// (design/ACCOUNTS-SYNC-ROADMAP.md 5.4; Phase S2). The Durable Object in
// room.js is a thin shell around this; the tests drive this same code over
// node:sqlite. It never decrypts anything: `env` values are ciphertext.
//
// Wire protocol (JSON text frames):
//   C->S hello    {t:'hello', v:1, cursor}           after connecting
//   S->C welcome  {t:'welcome', head}                then catch-up:
//   S->C ops      {t:'ops', ops:[{seq, env, from}]}  (also live fan-out)
//   S->C caughtUp {t:'caughtUp', head}
//   S->C reset    {t:'reset', snapshotUpto}          cursor is older than the
//                                                    kept log: reload from the snapshot
//   C->S push     {t:'push', batchId, env}
//   S->C ack      {t:'ack', batchId, seq}
//   S->C snapshotReq {t:'snapshotReq', head}        please upload a snapshot
//   S->C error    {t:'error', code, message}
// Snapshots go over HTTP (they can be larger than a socket frame).

export const MAX_FRAME_CHARS = 512 * 1024;
export const MAX_PUSH_CHARS = 900 * 1024;
export const COMPACT_EVERY = 1000;
const SNAPSHOT_CHUNK = 1000000;
const KEEP_OPS_MS = 30 * 24 * 60 * 60 * 1000;

/** `sql(query, ...args)` -> rows array; `transaction(fn)` runs fn atomically. */
export function createRoomCore({ sql, transaction, now = () => Date.now() }) {
  sql(`CREATE TABLE IF NOT EXISTS ops (
    seq INTEGER PRIMARY KEY, device_id TEXT NOT NULL, batch_id TEXT NOT NULL, env TEXT NOT NULL, at INTEGER NOT NULL)`);
  sql('CREATE UNIQUE INDEX IF NOT EXISTS ops_by_batch ON ops (device_id, batch_id)');
  sql('CREATE TABLE IF NOT EXISTS snap (part INTEGER PRIMARY KEY, data TEXT NOT NULL)');
  sql('CREATE TABLE IF NOT EXISTS state (k TEXT PRIMARY KEY, v INTEGER NOT NULL)');

  const getState = (k) => { const r = sql('SELECT v FROM state WHERE k = ?', k)[0]; return r ? Number(r.v) : 0; };
  const setState = (k, v) => sql('INSERT INTO state (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v', k, v);
  const head = () => getState('head');

  /** Frames, each under the size limit, carrying ops after `cursor`. */
  function catchUp(cursor) {
    const frames = [];
    let batch = [];
    let size = 0;
    for (const row of sql('SELECT seq, device_id, env FROM ops WHERE seq > ? ORDER BY seq', cursor)) {
      const op = { seq: Number(row.seq), env: row.env, from: row.device_id };
      const n = row.env.length + 64;
      if (batch.length && size + n > MAX_FRAME_CHARS) { frames.push({ t: 'ops', ops: batch }); batch = []; size = 0; }
      batch.push(op);
      size += n;
    }
    if (batch.length) frames.push({ t: 'ops', ops: batch });
    return frames;
  }

  /** The frames to send a socket that just said hello. */
  function hello(msg) {
    const cursor = Math.max(0, Number(msg && msg.cursor) || 0);
    const h = head();
    if (cursor > h) return [{ t: 'reset', snapshotUpto: getState('snapshotUpto') }];
    if (cursor < getState('trimmedUpto')) return [{ t: 'reset', snapshotUpto: getState('snapshotUpto') }];
    return [{ t: 'welcome', head: h }, ...catchUp(cursor), { t: 'caughtUp', head: head() }];
  }

  /** Stores a pushed batch. Returns `{reply, fanout}`: frames for the
   *  pusher and for every other socket in the room. A batch already stored
   *  (a resend after a lost ack) is acknowledged again, not stored twice. */
  function push(deviceId, msg) {
    const batchId = String((msg && msg.batchId) || '');
    const env = msg && msg.env;
    if (!batchId || batchId.length > 100 || typeof env !== 'string' || !env) {
      return { reply: [{ t: 'error', code: 'bad_push', message: 'A push needs a batchId and an env.' }], fanout: [] };
    }
    if (env.length > MAX_PUSH_CHARS) {
      return { reply: [{ t: 'error', code: 'too_large', message: 'That change is too large to sync in one piece.', batchId }], fanout: [] };
    }
    const dup = sql('SELECT seq FROM ops WHERE device_id = ? AND batch_id = ?', deviceId, batchId)[0];
    if (dup) return { reply: [{ t: 'ack', batchId, seq: Number(dup.seq) }], fanout: [] };
    let seq;
    transaction(() => {
      seq = head() + 1;
      sql('INSERT INTO ops (seq, device_id, batch_id, env, at) VALUES (?, ?, ?, ?, ?)', seq, deviceId, batchId, env, now());
      setState('head', seq);
    });
    const reply = [{ t: 'ack', batchId, seq }];
    const since = seq - getState('snapshotUpto');
    if (since >= COMPACT_EVERY && since % COMPACT_EVERY === 0) reply.push({ t: 'snapshotReq', head: seq });
    return { reply, fanout: [{ t: 'ops', ops: [{ seq, env, from: deviceId }] }] };
  }

  /** Stores a snapshot covering every op up to `upto`, then drops ops it
   *  covers that are older than the keep window (so a device that was
   *  offline a while can still catch up op by op). */
  function putSnapshot(upto, env) {
    const u = Number(upto);
    if (!Number.isInteger(u) || u < 0 || u > head()) throw Object.assign(new Error('Snapshot is ahead of the log.'), { status: 409, code: 'bad_upto' });
    if (u < getState('snapshotUpto')) return { stored: false, snapshotUpto: getState('snapshotUpto') };
    if (typeof env !== 'string' || !env) throw Object.assign(new Error('Empty snapshot.'), { status: 400, code: 'bad_snapshot' });
    transaction(() => {
      sql('DELETE FROM snap');
      for (let i = 0, part = 0; i < env.length; i += SNAPSHOT_CHUNK, part++) sql('INSERT INTO snap (part, data) VALUES (?, ?)', part, env.slice(i, i + SNAPSHOT_CHUNK));
      setState('snapshotUpto', u);
      setState('hasSnapshot', 1);
      const cutoff = now() - KEEP_OPS_MS;
      const old = sql('SELECT MAX(seq) AS s FROM ops WHERE seq <= ? AND at < ?', u, cutoff)[0];
      if (old && old.s) {
        sql('DELETE FROM ops WHERE seq <= ?', Number(old.s));
        setState('trimmedUpto', Math.max(getState('trimmedUpto'), Number(old.s)));
      }
    });
    return { stored: true, snapshotUpto: u };
  }

  function getSnapshot() {
    if (!getState('hasSnapshot')) return null;
    const env = sql('SELECT data FROM snap ORDER BY part').map((r) => r.data).join('');
    return { upto: getState('snapshotUpto'), env };
  }

  function stats() {
    const ops = sql('SELECT COUNT(*) AS n FROM ops')[0];
    return { head: head(), snapshotUpto: getState('snapshotUpto'), trimmedUpto: getState('trimmedUpto'), ops: Number(ops.n) };
  }

  return { hello, push, putSnapshot, getSnapshot, stats, head };
}
