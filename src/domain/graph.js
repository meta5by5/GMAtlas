// graph.js — the relationship graph over entity links, as pure functions.
// buildGraph() turns the entity records into a deduplicated node/edge set;
// computeLayout() runs a small deterministic force simulation so the same
// campaign always draws the same picture (no jitter on re-render). No DOM.

import { makeRng } from './oracles.js';

const TYPE_COLOR = { npc: '#7dd3fc', location: '#4ade80', faction: '#fbbf24', asset: '#a78bfa', lore: '#f472b6', conflict: '#f87171' };
export function nodeColor(type) { return TYPE_COLOR[type] || '#94a3b8'; }

/** Build {nodes, edges} from a campaign. Edges are undirected + deduplicated
 *  (relationships are stored on both ends). */
export function buildGraph(campaign) {
  const items = (campaign.entities && campaign.entities.items) || [];
  const byId = new Map(items.map((e) => [e.id, e]));
  const nodes = items.map((e) => ({
    id: e.id,
    name: e.name || 'Unnamed',
    type: e.type || 'npc',
    degree: Array.isArray(e.relationships) ? e.relationships.length : 0,
  }));
  const seen = new Set();
  const edges = [];
  for (const e of items) {
    for (const r of e.relationships || []) {
      if (!byId.has(r.to)) continue;               // skip dangling
      const key = [e.id, r.to].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ a: e.id, b: r.to, label: r.label || '' });
    }
  }
  return { nodes, edges };
}

// Stable integer seed from the node id set so layout is deterministic AND
// unchanged as long as the cast is unchanged.
function seedFrom(nodes) {
  let h = 2166136261;
  for (const n of nodes) for (let i = 0; i < n.id.length; i++) { h ^= n.id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * Deterministic force-directed layout inside a [0,width]×[0,height] box.
 * Returns Map(id -> {x, y}). Small graphs → cheap; runs a fixed iteration count.
 */
export function computeLayout(graph, { width = 600, height = 520, iterations = 300, pad = 44 } = {}) {
  const { nodes, edges } = graph;
  const pos = new Map();
  if (!nodes.length) return pos;
  const rng = makeRng(seedFrom(nodes) || 1);
  const cx = width / 2, cy = height / 2;
  if (nodes.length === 1) { pos.set(nodes[0].id, { x: cx, y: cy }); return pos; }

  // Seed on a deterministic circle with slight jitter.
  nodes.forEach((n, i) => {
    const a = (i / nodes.length) * Math.PI * 2;
    pos.set(n.id, { x: cx + Math.cos(a) * width * 0.32 + (rng() - 0.5) * 16, y: cy + Math.sin(a) * height * 0.32 + (rng() - 0.5) * 16 });
  });

  // Classic Fruchterman-Reingold: fresh displacement each pass, temperature cools.
  // The 1.6 multiplier (was 0.8) is deliberately generous — a bigger ideal
  // edge length pushes nodes further apart at equilibrium, which is what
  // actually makes a busy relationship graph's lines/labels legible; nodes
  // still can't leave the box (finalize() clamps to pad), so this just
  // spends more of the available canvas instead of clustering at the center.
  const k = Math.sqrt((width * height) / nodes.length) * 1.6; // ideal edge length
  const adj = edges.map((e) => [e.a, e.b]);
  let temp = width / 6;
  const cool = temp / (iterations + 1);

  for (let iter = 0; iter < iterations; iter++) {
    const disp = new Map(nodes.map((n) => [n.id, { x: 0, y: 0 }]));

    // Repulsion between every pair.
    for (let i = 0; i < nodes.length; i++) {
      const pi = pos.get(nodes[i].id), di = disp.get(nodes[i].id);
      for (let j = i + 1; j < nodes.length; j++) {
        const pj = pos.get(nodes[j].id), dj = disp.get(nodes[j].id);
        let dx = pi.x - pj.x, dy = pi.y - pj.y;
        let dist = Math.hypot(dx, dy);
        if (dist < 0.01) { dx = (rng() - 0.5); dy = (rng() - 0.5); dist = Math.hypot(dx, dy) + 0.01; }
        const f = (k * k) / dist;
        const ux = dx / dist, uy = dy / dist;
        di.x += ux * f; di.y += uy * f;
        dj.x -= ux * f; dj.y -= uy * f;
      }
    }
    // Attraction along edges.
    for (const [a, b] of adj) {
      const pa = pos.get(a), pb = pos.get(b), da = disp.get(a), db = disp.get(b);
      let dx = pa.x - pb.x, dy = pa.y - pb.y;
      const dist = Math.hypot(dx, dy) || 0.01;
      const f = (dist * dist) / k;
      const ux = dx / dist, uy = dy / dist;
      da.x -= ux * f; da.y -= uy * f;
      db.x += ux * f; db.y += uy * f;
    }
    // Move each node by its displacement, capped at the current temperature,
    // plus a whisper of gravity so disconnected pieces don't hug the walls.
    // Clamping to the box HERE (every iteration), not just once at the very
    // end, matters more than it looks: without it, a busy graph's outer
    // nodes can overshoot the box by wildly different amounts each pass,
    // and a single end-of-run clamp then collapses several of them onto the
    // exact same boundary corner — nodes silently stacking exactly on top
    // of each other, which is the opposite of "spread out so connections
    // can be read." Clamping every iteration keeps nodes bouncing off the
    // wall instead of flying past it, so they settle at distinct positions.
    for (const n of nodes) {
      const p = pos.get(n.id), d = disp.get(n.id);
      // 10 (was 0.012) — at the bigger ideal-edge-length above, a whisper of
      // gravity was nowhere near enough to counter repulsion: nodes drifted
      // to the pad boundary and stayed there regardless of graph size ("not
      // evenly spaced... pushed to the border"). This value was tuned
      // empirically (a standalone script sweeping graphs from 2 to 50
      // nodes) to keep the overwhelming majority of nodes off the border
      // while still using most of the box, rather than picking a value
      // that "should" work by the classic FR formula.
      d.x += (cx - p.x) * 10; d.y += (cy - p.y) * 10;
      const len = Math.hypot(d.x, d.y) || 0.01;
      const step = Math.min(len, temp);
      p.x = Math.max(pad, Math.min(width - pad, p.x + (d.x / len) * step));
      p.y = Math.max(pad, Math.min(height - pad, p.y + (d.y / len) * step));
    }
    temp = Math.max(cool, temp - cool);
  }
  return finalize(pos, width, height, pad);
}

function finalize(pos, width, height, pad) {
  for (const p of pos.values()) {
    p.x = Math.max(pad, Math.min(width - pad, p.x));
    p.y = Math.max(pad, Math.min(height - pad, p.y));
    delete p.vx; delete p.vy;
  }
  return pos;
}
