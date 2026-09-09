// diceBox3d.js — the async, browser-only bridge to the vendored
// @3d-dice/dice-box module (assets/vendor/dice-box/, MIT-licensed, version-
// pinned at 1.1.4). Deliberately NOT in src/domain/ — WebGL/canvas/fetch are
// neither pure nor synchronous, the same reason ui/mechanicsScan.js,
// ui/tocScan.js, and ui/hostileLocationsFetch.js live here instead.
//
// file:// is a hard no here too (dice-box's own assets load via fetch,
// blocked outright on a file:// page — same restriction pdfjs's Game
// Mechanics Index already has) — but UNLIKE those features, dice rolling
// already has a perfectly good 2D result today (the existing
// dice-roll-card), so this module fails SILENTLY (resolves null) rather
// than throwing: a GM who never asked for 3D dice, or who just double-
// clicked index.html, should see zero difference, not an error toast.
//
// dice-box has no documented way to be TOLD what a die should land on —
// only read back afterward, once its own physics/RNG settle. So for the
// animated path it is treated as AUTHORITATIVE: roll3d() rolls dice-box
// for real, reads back its actual per-die values, and returns them so the
// caller can feed them into dice.js's own outcome functions via their
// `dice`/`index` overrides — never a second, independent domain-layer
// roll trying to match an animation after the fact.

let loadPromise = null;
let containerEl = null;
// Tracks which theme/color are actually applied on the live box, so
// roll3d() only pays for box.updateConfig()'s own await-a-theme-load cost
// when the GM's Settings choice has genuinely changed since the last roll,
// not on every single roll. Real bug, direct report ("worked until this
// last [theme/color] change, now neither the 3d dice nor the Dice Results
// display"): these used to start at `null`, so the very FIRST roll of
// every session called updateConfig() even for a GM who never touched the
// new Dice settings tab at all (theme genuinely still 'default', already
// loaded by init() itself) — a real, unnecessary new call for the
// untouched-default case that didn't exist before this feature. Starting
// them at the actual DiceBox construction defaults means that common case
// now calls updateConfig() exactly zero times, same as before this
// feature existed; only a GM who genuinely changes theme/color in Settings
// ever triggers it.
let appliedTheme = 'default';
let appliedColor; // undefined, matching dice3dThemeOpts()'s own "no custom color" value exactly

// dice-box's own dist/dice-box.es.min.js is loaded via a real ES module
// dynamic import(), but THIS file is bundled by scripts/build.js into one
// classic <script> (dist/app.bundle.js) — and a classic script's import()
// resolves relative specifiers against ITS OWN script URL, not the page's,
// which would wrongly resolve into dist/assets/... here. Building an
// absolute URL from document.baseURI sidesteps that ambiguity entirely
// rather than trying to count the right number of `../`.
function assetUrl(relPath) {
  return new URL(`assets/vendor/dice-box/${relPath}`, document.baseURI).href;
}

/** Lazily loads and initializes the 3D dice box; resolves the same instance
 *  (or null) on every later call. Never throws — file://, a missing WebGL
 *  context, or any load error all just resolve null, and the caller falls
 *  straight through to the existing 2D dice-roll-card. */
export async function loadDiceBox3d() {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    if (typeof document === 'undefined' || (typeof location !== 'undefined' && location.protocol === 'file:')) return null;
    try {
      const mod = await import(assetUrl('dice-box.es.min.js'));
      const DiceBox = mod.default;
      containerEl = document.createElement('div');
      containerEl.className = 'dice-box-3d-container';
      document.body.appendChild(containerEl);
      // Real bug, direct report ("does not roll the 3d dice animation"),
      // confirmed via the actual browser console: (1) the old two-argument
      // `new DiceBox(selector, config)` form is deprecated in v1.1.x — a
      // single config object is the real API, with `container` as one of
      // its own keys (fantasticdice.games/docs/usage/config). (2)
      // `offscreen` defaults to true, so without an explicit override
      // dice-box tried to fetch world.offscreen.min.js — a file this app
      // deliberately never vendored (world.onscreen.min.js only, for
      // broader browser/webview compatibility) — and 404'd.
      const box = new DiceBox({
        container: '.dice-box-3d-container',
        assetPath: assetUrl('assets/'),
        origin: '',
        scale: 6,
        offscreen: false,
      });
      await box.init();
      return box;
    } catch (err) {
      console.warn('3D dice unavailable — falling back to the 2D dice roll card.', err);
      if (containerEl) { containerEl.remove(); containerEl = null; }
      return null;
    }
  })();
  return loadPromise;
}

/** Shows the 3D overlay, rolls `notations` (dice-box's own "2d6"-style
 *  strings, one per die GROUP — e.g. ['1d6','2d10'] for an action roll),
 *  and resolves the real per-die values dice-box landed on, flattened in
 *  the SAME group/die order as `notations`, e.g. [[4],[3,9]]. `theme`/
 *  `themeColor` (direct follow-up request: "add a settings tab for
 *  selecting dice type and color options") are the GM's current picks
 *  (data/dice3dThemes.js ids) — the CALLER's job to read from campaign
 *  settings, this module stays schema-agnostic. Resolves null on any
 *  failure (3D unavailable, or the roll itself errors) — the caller's own
 *  fallback to instant 2D display is unconditional either way. */
export async function roll3d(notations, { theme = 'default', themeColor } = {}) {
  const box = await loadDiceBox3d();
  if (!box || !containerEl) return null;
  try {
    containerEl.classList.add('active');
    // A theme dice-box hasn't loaded yet can't be rolled — box.roll() reads
    // straight off its own already-loaded theme data with no lazy-load
    // fallback, confirmed against source, so an unloaded theme would throw.
    // box.updateConfig() is the real, documented way to switch (it awaits
    // the theme's own asset fetch before returning) — only called when the
    // GM's current pick actually differs from what's already active, not
    // on every roll.
    if (theme !== appliedTheme || themeColor !== appliedColor) {
      // Real bug, direct report ("neither the 3d dice nor the Dice Results
      // are displayed" — a hang, not a clean fallback, right after this
      // theme/color feature landed): never pass `themeColor: undefined`
      // explicitly — dice-box's own color-parsing expects a real hex
      // string whenever the key is present at all, so an explicit
      // `undefined` (the common case: no custom color picked) very likely
      // threw inside its worker and left the whole box wedged for the rest
      // of the session. Omit the key entirely instead, so an unset color
      // falls through to the theme's own built-in default exactly as it
      // did before this feature existed.
      const configUpdate = { theme };
      if (themeColor) configUpdate.themeColor = themeColor;
      await box.updateConfig(configUpdate);
      appliedTheme = theme;
      appliedColor = themeColor;
    }
    box.clear();
    // Real bug, direct report ("the dice roller does not roll the 3d dice
    // animation") — box.roll()'s own resolved value is NOT the grouped
    // {rolls:[...]} shape the public docs describe (confirmed by reading
    // dice-box's actual bundled source, not just its docs site): it
    // resolves a flat array of individual die-roll objects with no nested
    // `.rolls`, so reading `.rolls` off it silently produced an empty
    // array every time — the animation played, but every result came back
    // empty, so every roll fell through to a second, independent
    // Math.random() re-roll instead. box.getRollResults() (a real
    // documented public method) is what actually returns the grouped shape
    // — call it AFTER awaiting box.roll() (still needed, just to know when
    // the physics have settled), not use roll()'s own resolved value.
    await box.roll(notations);
    const groups = box.getRollResults();
    const values = groups.map((g) => (g.rolls || []).map((r) => r.value));
    // Leave the settled dice visible for a beat before hiding — the whole
    // point of the animation is seeing where they land, not just that they
    // moved.
    await new Promise((resolve) => setTimeout(resolve, 900));
    return values;
  } catch (err) {
    console.warn('3D dice roll failed — falling back to the 2D dice roll card.', err);
    return null;
  } finally {
    containerEl.classList.remove('active');
  }
}
