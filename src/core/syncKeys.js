// syncKeys.js — this device's sync keys (design/ACCOUNTS-SYNC-ROADMAP.md
// 3.2, 5.5; Phase S2): its ECDH key pair, the account's vault key once this
// device is approved, and campaign keys. Keys persist through store.js
// (`syncKeys`, never synced); networking goes through the account client.
// The crypto itself is domain/syncCrypto.js.
//
// States, as `status()` reports them:
//   'off'     sync isn't set up on this account yet
//   'locked'  it is, but this device hasn't been approved (or recovered)
//   'ready'   this device holds the vault key

import {
  generateDeviceKeyPair, approvalCode, wrapToDevice, unwrapOnDevice, generateRecoveryKey, parseRecoveryKey,
  wrapWithRecovery, unwrapWithRecovery, importAesKey, sealCampaignKey, openCampaignKey, randomBytes,
} from '../domain/syncCrypto.js';

const VAULT_CONTEXT = 'vault';

export function createSyncKeys({ store, account }) {
  const campaignKeys = new Map();
  let vaultKeyPromise = null;
  let cachedStatus = null;

  /** This device's key pair, made and registered with the server the
   *  first time sync is touched here. */
  async function deviceKey() {
    const saved = await store.getSyncKeys();
    const deviceId = account.getState().device && account.getState().device.id;
    if (saved.device && saved.device.deviceId === deviceId) {
      if (!saved.device.registered) {
        await account.request('PUT', '/api/devices/key', { ecdhPub: saved.device.publicJwk });
        await store.setSyncKeys({ device: { ...saved.device, registered: true } });
      }
      return saved.device;
    }
    // New, or this browser now belongs to a different device record (signed
    // in again after being signed out remotely): a fresh pair.
    const pair = await generateDeviceKeyPair();
    const device = { deviceId, publicJwk: pair.publicJwk, privateKey: pair.privateKey, registered: false };
    await store.setSyncKeys({ device, vaultRaw: null });
    campaignKeys.clear();
    vaultKeyPromise = null;
    await account.request('PUT', '/api/devices/key', { ecdhPub: device.publicJwk });
    await store.setSyncKeys({ device: { ...device, registered: true } });
    return device;
  }

  async function storeVault(raw) {
    await store.setSyncKeys({ vaultRaw: raw });
    vaultKeyPromise = importAesKey(raw);
  }

  /** Where this device stands, refreshed from the server. Unlocks
   *  automatically once another device has approved this one. */
  async function status() {
    const device = await deviceKey();
    const vault = await account.request('GET', '/api/vault');
    const saved = await store.getSyncKeys();
    let state = !vault.exists ? 'off' : (saved.vaultRaw ? 'ready' : 'locked');
    if (state === 'locked' && vault.mine) {
      await storeVault(await unwrapOnDevice(vault.mine, device.privateKey, device.publicJwk, VAULT_CONTEXT));
      state = 'ready';
    }
    if (vault.exists && !vault.mine && saved.vaultRaw) state = 'locked'; // this device's approval was withdrawn
    if (state === 'locked') { await store.setSyncKeys({ vaultRaw: null }); vaultKeyPromise = null; }
    cachedStatus = {
      state,
      code: await approvalCode(device.publicJwk),
      devices: await Promise.all(vault.devices.map(async (d) => ({ ...d, code: d.ecdhPub ? await approvalCode(d.ecdhPub) : null }))),
    };
    return cachedStatus;
  }

  /** First device: makes the vault key and the recovery key. Resolves to
   *  the recovery key text, to show once. */
  async function setUp() {
    const device = await deviceKey();
    const raw = randomBytes(32);
    const recovery = generateRecoveryKey();
    await account.request('POST', '/api/vault', {
      mine: await wrapToDevice(raw, device.publicJwk, VAULT_CONTEXT),
      recovery: await wrapWithRecovery(raw, parseRecoveryKey(recovery)),
    });
    await storeVault(raw);
    return recovery;
  }

  /** Unlocks this device with the recovery key, then saves its own copy
   *  so it stays unlocked. */
  async function unlockWithRecovery(text) {
    const bytes = parseRecoveryKey(text);
    if (!bytes) throw new Error('That isn’t a recovery key. It’s 32 letters and numbers in groups of four.');
    const device = await deviceKey();
    const { wrapped } = await account.request('GET', '/api/vault/recovery');
    let raw;
    try { raw = await unwrapWithRecovery(wrapped, bytes); } catch { throw new Error('That recovery key doesn’t match this account.'); }
    await account.request('PUT', '/api/vault/mine', { wrapped: await wrapToDevice(raw, device.publicJwk, VAULT_CONTEXT) });
    await storeVault(raw);
  }

  async function vaultRaw() {
    const saved = await store.getSyncKeys();
    if (!saved.vaultRaw) throw new Error('This device isn’t approved for sync yet.');
    return saved.vaultRaw;
  }

  async function vaultKey() {
    if (!vaultKeyPromise) vaultKeyPromise = vaultRaw().then((raw) => importAesKey(raw));
    return vaultKeyPromise;
  }

  /** Gives another of this account's devices the vault key. */
  async function approve(device) {
    if (!device.ecdhPub) throw new Error('That device hasn’t asked to sync yet.');
    const wrapped = await wrapToDevice(await vaultRaw(), device.ecdhPub, VAULT_CONTEXT);
    await account.request('PUT', `/api/vault/devices/${encodeURIComponent(device.id)}`, { wrapped });
  }

  /** A new random key for a campaign about to sync: `{key, sealed}`. */
  async function newCampaignKey(campaignId) {
    const raw = randomBytes(32);
    const sealed = await sealCampaignKey(raw, await vaultKey(), campaignId);
    const key = await importAesKey(raw);
    campaignKeys.set(campaignId, key);
    return { key, sealed };
  }

  /** A synced campaign's key, from its sealed form (server list). */
  async function campaignKey(campaignId, sealed) {
    if (campaignKeys.has(campaignId)) return campaignKeys.get(campaignId);
    const key = await importAesKey(await openCampaignKey(sealed, await vaultKey(), campaignId));
    campaignKeys.set(campaignId, key);
    return key;
  }

  /** On sign-out: drop what unlocks content; keep the device key pair. */
  async function forget() {
    campaignKeys.clear();
    vaultKeyPromise = null;
    cachedStatus = null;
    await store.setSyncKeys({ vaultRaw: null });
  }

  return { status, setUp, unlockWithRecovery, approve, newCampaignKey, campaignKey, forget, lastStatus: () => cachedStatus };
}
