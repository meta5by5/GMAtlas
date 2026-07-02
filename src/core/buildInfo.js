// buildInfo.js — the phase/version label and changelog shown in the Settings
// drawer's "Build" panel. Hand-maintained: bump PHASE/VERSION and prepend a
// note each time a phase ships, so a returning GM can see at a glance what
// changed without digging through git history.

export const BUILD = {
  phase: '3D',
  version: '0.3.5',
  label: 'Crew-Link-Style Statblock Tracks',
  notes: [
    'Phase 3D — statblock fields can be numeric tracks: a Crew-Link-style row of click-to-set boxes, with double-click on the value badge to roll (d6 + value vs 2 challenge dice, filed to the Journal). Health/Hull default to tracks; any field converts with the # / Aa toggle; "+ Track" adds a new one.',
    'Phase 3C — NPC/vehicle statblocks, drag-and-drop entity linking + drop-to-mention in Journal and context fields, this Build panel.',
    'Phase 3B — force-directed relationship graph over entity links, click-through to inspector, live edge-tab badges.',
    'Phase 3A — Entity Inspector + @mention auto-linking; WHO/WHERE cards populate from real entities.',
    'New — Threads (progress clocks) with Co-Pilot awareness.',
    'Phase 2 — interactive cockpit: Continue Story, Shift Story reducers, Oracle + Journal drawers, live Co-Pilot, timeline.',
    'Phase 1 — oracle roll engine, scene generation, context model ported as pure, tested modules.',
    'Phase 0 — single versioned campaign document, lossless migration from v0.53, three-tier cockpit shell.',
  ],
};
