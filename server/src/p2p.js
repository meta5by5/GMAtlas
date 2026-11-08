// p2p.js — what a device needs to open a direct connection to another of
// the account's devices (roadmap S3 item 2, design/adr/document-transfer.md).
// The bytes never come here: the campaign room only relays the sealed set-up
// messages, and this hands out the ICE servers.
//
//   GET /api/p2p/ice -> {iceServers, relay}
//
// STUN (finding each device's public address) is Cloudflare's free public
// server. TURN (a relay for when no direct path exists) is used only when
// TURN_KEY_ID and TURN_KEY_API_TOKEN are set: short-lived credentials are
// minted per request from Cloudflare Realtime TURN. TURN traffic stays
// DTLS-encrypted end to end; `relay` tells the app to say a relay may be
// used (and the GM can turn it off: "Direct connections only").

import { json } from './http.js';
import { requireFeature } from './features.js';

const STUN = { urls: ['stun:stun.cloudflare.com:3478'] };
const TURN_TTL_SECONDS = 4 * 3600;

const iso = (ms) => new Date(ms).toISOString();

export async function getIceServers(request, { env, now }, { user }) {
  await requireFeature(env, iso(now()), user.id, 'p2p.transfer');
  if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return json({ iceServers: [STUN], relay: false });
  try {
    const fetcher = env.TURN_FETCH || fetch;
    const res = await fetcher(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(env.TURN_KEY_ID)}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ ttl: TURN_TTL_SECONDS }),
    });
    if (!res.ok) throw new Error(`TURN credentials: ${res.status}`);
    const body = await res.json();
    const list = (Array.isArray(body.iceServers) ? body.iceServers : [body.iceServers]).filter((s) => s && s.urls);
    if (!list.length) throw new Error('TURN credentials: none returned');
    return json({ iceServers: [STUN, ...list], relay: true });
  } catch (err) {
    // A relay that can't be had today still leaves direct connections.
    console.warn('TURN unavailable', err && err.message);
    return json({ iceServers: [STUN], relay: false });
  }
}
