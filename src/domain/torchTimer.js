// torchTimer.js — Shadowdark's light source as a real-time timer (direct
// request, 2026-11-08: "a mechanic for torch duration"). In Shadowdark a
// torch burns for one hour of real time at the table, whatever happens in
// the fiction, so the timer runs on the wall clock: it keeps burning across
// a reload, and while paused (the GM's call, e.g. a break) it doesn't.
// Pure and DOM-free; every function takes the time explicitly.
//
// State, in campaign.party.light:
//   { label, durationMs, remainingMs, startedAt }   startedAt: ms when lit, or null when paused/out
// Remaining time is remainingMs minus whatever has burned since startedAt.

export const TORCH_MS = 60 * 60 * 1000;

function clone(c) { try { return structuredClone(c); } catch { return JSON.parse(JSON.stringify(c)); } }

/** The light's state, with defaults for a campaign that never lit one. */
export function lightState(campaign) {
  const l = (campaign && campaign.party && campaign.party.light) || {};
  const durationMs = Number(l.durationMs) > 0 ? Number(l.durationMs) : TORCH_MS;
  return {
    label: l.label || 'Torch',
    durationMs,
    remainingMs: Number.isFinite(Number(l.remainingMs)) ? Math.max(0, Number(l.remainingMs)) : durationMs,
    startedAt: Number.isFinite(Number(l.startedAt)) && l.startedAt !== null ? Number(l.startedAt) : null,
  };
}

/** Milliseconds of light left at `now`. */
export function lightRemaining(campaign, now) {
  const l = lightState(campaign);
  const burned = l.startedAt === null ? 0 : Math.max(0, now - l.startedAt);
  return Math.max(0, l.remainingMs - burned);
}

export const isLit = (campaign, now) => lightState(campaign).startedAt !== null && lightRemaining(campaign, now) > 0;
export const isOut = (campaign, now) => lightRemaining(campaign, now) <= 0;

function withLight(campaign, patch) {
  const next = clone(campaign);
  if (!next.party || typeof next.party !== 'object') next.party = {};
  next.party.light = { ...lightState(campaign), ...patch };
  return next;
}

/** Lights it (or carries on burning). A spent light is relit fresh. */
export function lightStart(campaign, now) {
  const left = lightRemaining(campaign, now);
  if (isLit(campaign, now)) return campaign;
  return withLight(campaign, { remainingMs: left > 0 ? left : lightState(campaign).durationMs, startedAt: now });
}

/** Pauses it, keeping the time left. */
export function lightPause(campaign, now) {
  if (lightState(campaign).startedAt === null) return campaign;
  return withLight(campaign, { remainingMs: lightRemaining(campaign, now), startedAt: null });
}

/** A fresh, unlit light source (a new torch, by default). */
export function lightReset(campaign, { label, durationMs } = {}) {
  const d = Number(durationMs) > 0 ? Number(durationMs) : lightState(campaign).durationMs;
  return withLight(campaign, { label: label || lightState(campaign).label, durationMs: d, remainingMs: d, startedAt: null });
}

/** Marks a light that has burned down as out (not lit, nothing left). */
export function lightBurnOut(campaign) {
  return withLight(campaign, { remainingMs: 0, startedAt: null });
}

/** "mm:ss" (or "h:mm:ss" past an hour) for a time left. */
export function formatLight(ms) {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
