// shell.js — renders the cockpit from the store and wires ALL interaction
// through two delegated handlers (click + change). No per-element listeners, no
// global function reassignment, no timing hacks. Every mutation goes through a
// pure domain function via store.update().

import { store } from '../core/store.js';
import { BUILD } from '../core/buildInfo.js';
import { CONTEXT_QUESTIONS } from '../core/schema.js';
import { contextSummary } from '../domain/context.js';
import { continueStory, applyStoryShift, rollOracle, addNote, editNote, patchContext, editContextText, logRoll, generateNpc, deepenNpc, drawSuggestionLenses, suggestNextWithLens, updateSceneField } from '../domain/session.js';
import { addOracleEntry, updateOracleEntry, removeOracleEntry, resetOracleTable, addOracleTag, removeOracleTag } from '../domain/oracles.js';
import { oracleLinkTagsFor } from '../data/entityFieldOracleLinks.js';
import { addThread, advanceThread, removeThread, setThreadStatus, setThreadPriority } from '../domain/threads.js';
import { createExpedition, setExpeditionDial } from '../domain/expeditions.js';
import {
  rollAction, formatRollText, formatRollCopyText, rollFlat, formatFlatRollText, formatFlatRollCopyText,
  rollTraveller, formatTravellerRollText, formatTravellerRollCopyText,
} from '../domain/dice.js';
import {
  createEntity, updateEntity, addEntityTag, removeEntityTag, removeEntity, filterEntities, setActiveEntity, addRelationship, removeRelationship,
  getEntity, addEntityStatblockGroup, removeEntityStatblockGroup, setEntityStatblockField, addEntityStatblockField, removeEntityStatblockField,
  setEntityStatblockTrackValue, setEntityStatblockAttributeValue, updateRelationshipLabel, updateRelationshipType, updateRelationshipStrength,
  listEntities, ENTITY_TYPES, TYPE_LABEL, setFactionStat, addFactionAsset, removeFactionAsset, createItemFromCatalog,
  addLocationTradeCode, removeLocationTradeCode, addLocationBase, removeLocationBase,
} from '../domain/entities.js';
import { findCatalogItem } from '../data/gearCatalog.js';
import { installEnhancement, removeEnhancement } from '../domain/enhancements.js';
import { getMechanicsIndex } from '../domain/mechanicsIndex.js';
import { scanMechanicsIndex } from './mechanicsScan.js';
import { scanAndGenerateToc } from './tocScan.js';
import { loadAndMaybeResize } from './imageResize.js';
import { addGalleryImages, removeGalleryImage, addGalleryTag, removeGalleryTag } from '../domain/gallery.js';
import {
  listBattlemaps, getBattlemap, getActiveBattlemap, createBattlemap, renameBattlemap, removeBattlemap,
  setActiveBattlemap, setBattlemapBackground, setBattlemapGrid, addBattlemapIcon, moveBattlemapIcon,
  updateBattlemapIcon, removeBattlemapIcon,
} from '../domain/battlemaps.js';
import { generateCreatureConcept, formatCreatureConcept, generateSiteConcept, formatSiteConcept, generateAdventureSeed, formatAdventureSeed } from '../domain/worldbuilding.js';
import {
  addDocument, updateDocument, removeDocument, getDocument, addDocumentTag, removeDocumentTag, renameDocument,
  openDocumentTab, closeDocumentTab, setActiveDocumentTab, resolveDocumentTab,
  listReferenceDocuments, renameRefDocument, addRefDocumentTag, removeRefDocumentTag, hideRefDocument, listDocuments,
  sanitizeExternalLinkUrl,
} from '../domain/documents.js';
import { addPartyTracker, updatePartyTracker, stepPartyTracker, removePartyTracker, setPartyTrackerValue } from '../domain/party.js';
import { setColonyField, getColonyFields, addCrewRow, updateCrewRow, removeCrewRow } from '../domain/colony.js';
import { setMarketDial, buyCommodity, sellCommodity, createContract, generateContract } from '../domain/trade.js';
import { createPressureTrack, advanceFactionTurns, formatFactionTurnRumors, resolveFactionTurn, formatFactionTurnResult, rollFactionAsset } from '../domain/factions.js';
import { importHostileLocations } from '../domain/hostileLocations.js';
import { generateMission, formatMission } from '../domain/missions.js';
import {
  getActiveGuideDoc, setGuideDocText, setActiveGuideId, createGuideDoc, renameGuideDoc,
  countGuideDescendants, removeGuideDoc, moveGuideDoc,
} from '../domain/guide.js';
import { titleFromFilename } from '../domain/titleCase.js';
import { buildSessionRecap, formatSessionRecap } from '../domain/recap.js';
import { addTemplateSystem, addTemplateField, updateTemplateField, removeTemplateField, moveTemplateField } from '../domain/statblockTemplates.js';
import { universalSearch } from '../domain/search.js';
import { renderWorkspace } from './workspace/index.js';
import { renderCopilot } from './copilotPanel.js';
import { renderDrawer, formatBytes, helpToggle } from './drawers/index.js';
import { renderSearchPanel } from './searchPanel.js';
import { serializeMentionEditor, insertMentionNode } from './mentionEditor.js';

const QUESTION_LABELS = { who: 'WHO', where: 'WHERE', what: 'WHAT', why: 'WHY', how: 'HOW' };
// localStorage's shared per-origin quota is commonly 5-10MB for the WHOLE
// campaign document, not just one file — 5MB of raw file (~6.7MB once
// base64-encoded) is a conservative line under that, leaving room for the
// rest of the campaign and any other embedded uploads. Large, static
// rulebooks (the ones already in assets/docs/, several 20-60MB) belong in
// the Reference Library instead, which has no such limit.
const MAX_DOC_UPLOAD_BYTES = 5 * 1024 * 1024;
// 'cast' IS a real drawer (2026-07-06 restructure) — it's a full member of
// DRAWERS/openDrawers/anchoredDrawer like any other, so "move it back into
// the tab group" (unanchor) and "close it" both just work via the same
// generic machinery every other drawer already has. The one thing that
// stays special-cased is how it's OPENED: toggleCastDrawer() (not the
// generic toggleDrawer()) opens it into the anchor slot by default rather
// than the tab stack, since it's most useful sitting beside whichever
// drawer IS active (to drag an entity into Journal/Guide) rather than
// replacing it — see toggleCastDrawer below.
// 'entity-detail' (an entity's actual name/tags/overview/statblocks/
// relationships form) is NOT here — it has no edge nav button at all, and
// only ever opens via openDrawerTab('entity-detail') from an entity click
// anywhere (mention link, Cast row, relationship chip, graph node, ...),
// never picked from the tab list directly. See DRAWER_META for how the tab
// strip still labels it despite that.
const DRAWERS = [
  { id: 'guide', glyph: '📘', label: 'Guide' },
  { id: 'journal', glyph: '📖', label: 'Journal' },
  { id: 'oracle', glyph: '🎲', label: 'Oracle' },
  { id: 'party', glyph: '👥', label: 'Party' },
  { id: 'cast', glyph: '☷', label: 'Cast' },
  { id: 'colony', glyph: '🏛', label: 'Colony' },
  { id: 'trade', glyph: '💰', label: 'Trade' },
  { id: 'documents', glyph: '📄', label: 'Docs' },
  { id: 'gallery', glyph: '🖼', label: 'Gallery' },
  { id: 'battlemap', glyph: '🗺', label: 'Battlemap' },
  { id: 'graph', glyph: '🔗', label: 'Graph' },
  { id: 'settings', glyph: '⚙', label: 'Settings' },
];
// Tab-strip label/glyph lookup that also covers drawer ids with no edge
// button (currently just entity-detail) — DRAWERS.find(...) alone would
// come up empty for those.
const DRAWER_META = { 'entity-detail': { id: 'entity-detail', glyph: '👤', label: 'Entity' } };
function drawerMeta(id) { return DRAWERS.find((d) => d.id === id) || DRAWER_META[id] || null; }
// Edge nav button order top-down: Guide, Oracle, Cast, Trade, Docs, Graph,
// Co-Pilot, Settings — Co-Pilot is the one remaining non-drawer button
// interleaved into the same array DRAWERS.map() used to render alone,
// rather than always appended at the very end. Party/Colony/Journal moved
// to the header's own tab group (HEADER_ORDER, below) per the "USER
// CHANGES" QoL batch — they're still ordinary drawers otherwise (DRAWERS/
// drawerMeta above is unchanged, still the source of truth for both groups'
// glyph/label).
const EDGE_ORDER = ['guide', 'oracle', 'cast', 'trade', 'documents', 'gallery', 'battlemap', 'graph', 'copilot', 'settings'];
// The header's own small drawer-tab group, right-aligned in .header-actions
// — same data-drawer-open routing as the edge nav (onClick's [data-drawer-
// open] branch has no idea which container a button lives in), rendered by
// the separate headerTabButtonHTML() below since the header is a compact
// horizontal bar, not the edge nav's vertical icon-tile strip.
const HEADER_ORDER = ['party', 'colony', 'journal'];

// data-shift-prompt's generic inline-prompt placeholder text, per shift
// name — a nicety, not a requirement (the fallback `${name}…` reads fine
// for any future shift this gets wired to without needing an entry here).
const SHIFT_PROMPT_PLACEHOLDERS = {
  'Set Objective': 'What is the party trying to accomplish?',
  'Introduce NPC': "Who's the NPC (name, brief description)?",
};

// Tabbed drawer switching (2026-07-04 design review): multiple drawers can
// be pinned open at once (openDrawers), with one visible at a time
// (activeDrawer) — the founding brief wanted "drawers stack side by side";
// tabs were chosen as the tractable version of that (switch instantly
// between an already-open Journal and Oracle without losing either's
// scroll/filter state) without the layout complexity of true multi-pane
// side-by-side panels competing with the Co-Pilot/doc-viewer regions.
let openDrawers = [];
let activeDrawer = null;
// Hides the main drawer panel entirely (a floating ☰ icon appears in its
// place) WITHOUT closing anything in openDrawers — "let me see the
// workspace behind this for a second" without losing tabs/scroll/filter
// state. Only reachable via the tab strip's own collapse arrow, which
// only exists once 2+ tabs are open (data-drawer-tabs' own visibility
// gate) — a single open drawer already has its own ✕ to close outright.
let drawerCollapsed = false;
let copilotOpen = false;
let root = null;
let oracleFilter = '';
let expandedOracleGroups = new Set(); // ephemeral UI state — never persisted
let docFilter = '';
let graphFilter = ''; // ephemeral — highlights/dims graph-svg nodes by name substring, never removes them
let helpOpen = new Set(); // ephemeral — which collapsible "?" tip icons are currently expanded, keyed by a stable per-instance string
let settingsMenuOpen = false; // ephemeral — the header gear's Settings/About dropdown (New Campaign lives only in the Settings drawer now, not this menu)
let aboutOpen = false; // ephemeral — the About overlay
let docTagFilters = new Set();
let docTagEditorOpen = new Set(); // ephemeral — which doc/ref cards' tag editors are expanded
let docRenameOpen = new Set(); // ephemeral — which doc/ref cards are showing an inline rename input instead of their title link
let docTagListOpen = false; // ephemeral — collapses the Documents drawer's tag-filter chip row (can get long once many tags exist)
let journalEditOpen = new Set(); // ephemeral — which journal entries are showing an editable mention-editor instead of their static rendered text
let whereLocationTagFilter = null; // ephemeral — the Location tag currently selected in the WHERE view's listbox (null = no filter/candidate panel shown)
let whoTagFilter = null; // ephemeral — same as whereLocationTagFilter, for the WHO view's NPC/Faction tag listbox
let galleryFilter = ''; // ephemeral — Gallery drawer search box
// Gallery's own "+ Upload" flow (as opposed to an entity's "+ Photo"): the
// resize already happened (canvas work, ui/imageResize.js) by the time
// this is set — { thumbDataUrl, originalDataUrl, mimeType, name } — only
// the addGalleryImages commit itself waits on the GM confirming/editing
// the friendly name in the inline form this drives. null when no upload
// is pending.
let galleryUploadDraft = null;
let galleryTagFilters = new Set(); // ephemeral — Gallery drawer active tag filters
let galleryTagListOpen = false; // ephemeral — collapses the Gallery drawer's tag-filter chip row, same as Documents' own
// Planetfall Grid Battlemap (docs/adr/0023): the built-in icon key
// currently "armed" from the palette (null = not placing anything) — a
// click on the canvas while armed adds one annotation icon there and
// clears this back to null. Dragging a Cast entity or an already-placed
// icon onto the canvas is a separate path (native HTML5 DnD, below) that
// never touches this flag at all.
let battlemapPlacingIcon = null;
// @-mention autocomplete (Journal input, Guide editor, WHO/WHERE/WHAT/WHY/HOW
// context fields) — { field, start, end, items, activeIndex } while typing an
// "@partial" run; start/end are the field.value indices of that run
// (including the "@"), replaced in place when a suggestion is chosen. null
// when no suggestion popup is open.
let mentionSuggest = null;
// Generic inline text-entry prompt (replaces every former window.prompt()
// data-entry popup, per direct user request: "as a general rule, do not
// have popup windows for data entry" — see openInlinePrompt/
// commitInlinePrompt/closeInlinePrompt below) — a small floating field
// positioned next to whatever triggered it, the same fixed-position/
// getBoundingClientRect technique mentionSuggest above already uses.
// { kind, label, placeholder, value, meta } while open; each `kind`'s
// actual effect lives in commitInlinePrompt's switch, `meta` carries
// whatever that kind's case needs (a group index, a live mention span,
// a captured Selection Range, ...). null when closed. Deliberately no
// close-on-blur — only Escape/✕/✓ close it, avoiding a focus-race between
// the input's blur and a click on its own submit/cancel buttons.
let inlinePrompt = null;
// Every text field @mentions can be dropped/typed into — Journal's add-note
// box, the Guide editor (previously missing from the drag-and-drop target
// list entirely, despite the Guide's own placeholder copy describing
// @mentions), and the WHO/WHERE/WHAT/WHY/HOW context fields. All are
// .mention-editor contenteditable divs now, not <textarea> — the how.activity
// <select> also carries data-ctx, so this scopes to .mention-editor
// specifically rather than a bare [data-ctx] to exclude it.
const MENTION_FIELD_SELECTOR = '[data-journal-input], [data-guide-input], .mention-editor[data-ctx], .mention-editor[data-entity-field]';
const DROP_TARGET_SELECTOR = `[data-drop-entity], ${MENTION_FIELD_SELECTOR}`;
// Relationship graph pan/zoom — ephemeral, reset whenever the Graph tab is
// freshly opened (see openDrawerTab). {scale, x, y} describes the SVG
// viewBox window into the fixed GRAPH_W x GRAPH_H layout space (see
// drawers/index.js's graph() — GRAPH_W/H here must match its W/H).
const GRAPH_W = 600, GRAPH_H = 520;
let graphView = { scale: 1, x: 0, y: 0 };
let graphPan = null; // { svg, startClientX, startClientY, startX, startY } while a mouse-drag pan is in progress
let statblockAddOpen = false; // ephemeral — collapses the "+ Add a statblock" chip row behind a gear icon
let collapsedStatblockGroups = new Set(); // ephemeral — keyed `${entityId}::${groupIndex}`, which statblock group blocks are collapsed
let recapOpen = false; // ephemeral — collapses the "Previously on..." session recap panel
let searchOpen = false; // ephemeral — Universal Search overlay
let searchQuery = '';
let oracleEditorOpen = new Set(); // ephemeral — which oracle tables' entry editors are expanded
let oracleTagEditorOpen = new Set(); // ephemeral — which oracle tables' TAG editors are expanded (docs/adr/0016), hidden by default
let oracleTagFilter = null; // ephemeral — array of tags a field's 🔮 link jumped here with, or null for the ordinary text-filtered view (mutually exclusive with oracleFilter)
let expandedGuideNodes = new Set(); // ephemeral — which Guide tree nodes are expanded (docs/adr/0017)
let guideRenameOpen = new Set(); // ephemeral — which Guide docs (tree row or the active title) are showing an inline rename input
let entitySearch = ''; // ephemeral — Cast panel name/tag search
let entityTypeFilter = ''; // ephemeral — Cast panel type filter ('' = all)
let entityTagFilters = new Set(); // ephemeral — Cast panel cumulative tag sub-filter (ADR 0012), AND semantics, mirrors docTagFilters
let entityTagListOpen = false; // ephemeral — collapses the tag sub-filter chip row, mirrors docTagListOpen
let catalogPickerOpen = false; // ephemeral — the Cast drawer's "+ Item from catalog" (ADR 0012) inline picker, open or not
let enhancementDraft = {}; // ephemeral — entityId -> name text rolled into the Enhancements add-form's name field, overwritten by each 🎲 roll until "Install" commits it (docs/adr/next-request.md, 2026-07-06)
let expandedEnhancements = new Set(); // ephemeral — entity ids whose Enhancements section is expanded (collapsed by default)
let expandedWorldDemographics = new Set(); // ephemeral — entity ids whose World Demographics card is expanded (docs/adr/0026 follow-up, collapsed by default)
let expandedWorldProfile = new Set(); // ephemeral — entity ids whose World Profile (UWP) card is expanded (docs/adr/0026 follow-up, collapsed by default)
let mechanicsScanning = false; // ephemeral — true while scanMechanicsIndex()'s async PDF.js scan is in flight (docs/adr/0014)
let tocScanning = false; // ephemeral — true while scanAndGenerateToc()'s async PDF.js outline scan is in flight (docs/adr/0020)
let lensPickerOpen = false; // ephemeral — "What Happens Next?"'s Suggestion Lens chip picker, open or not (docs/adr/0009)
let lensDraw = []; // ephemeral — the current random draw of lens chips, fixed until re-opened (not redrawn on every unrelated re-render)
let catalogSearch = ''; // ephemeral — the catalog picker's own name/tag search
let partyTrackerAddOpen = false; // ephemeral — the inline "+ Tracker" name/type creation form, open or not
let partyTrackerDraftKind = 'meter'; // ephemeral — the creation form's in-progress type pick, so its size/difficulty sub-field can react before the tracker actually exists
let partyTrackerDraftName = ''; // ephemeral — mirrors the creation form's name input so a kind-change re-render (which rebuilds that input from scratch) doesn't wipe out whatever the GM already typed
let tradeLocationId = ''; // ephemeral — which Location's market the Trade drawer currently shows
let tradeContractAddOpen = false; // ephemeral — the inline "+ Contract" creation form, open or not
// A drawer can be pulled out of the normal tab stack (openDrawers/
// activeDrawer) and "anchored" instead — pinned to its own side panel
// (.mc-drawer-anchor) immediately left of the main drawer, so two drawers
// are visible side by side (e.g. Journal anchored left of Oracle while
// rolling, so a roll's journal entry is visible without switching tabs).
// Independent of openDrawers — an anchored drawer is deliberately NOT also
// a tab (see anchorDrawerTab/unanchorDrawerTab below).
let anchoredDrawer = null;
// The doc-viewer iframe reload guard (below) can't compare against the live
// DOM `frame.src` readback — browsers always return that as a normalized
// ABSOLUTE URL, while resolvedActive.src is a relative path for Reference
// Library docs, so the two could never match and the guard misfired on
// EVERY render (any unrelated store.update() elsewhere in the app would
// reset the iframe to blank mid-load, stranding it white). Tracking "the
// last src I myself set" sidesteps the mismatch entirely.
let lastDocViewerSrc = null;
// The dice roll window (see renderDiceRollOverlay) — set by performFieldRoll
// whenever a statblock field is rolled, cleared on close/Escape/backdrop
// click. Shape: { label, method, r } where method picks which fields of r
// (rollAction/rollFlat/rollTraveller's return shape) the window renders.
let diceRollResult = null;
let focusInspectorNameNextRender = false; // ephemeral — set by clicking any data-open-entity link/chip, so Entity Detail's name field is focused+selected the moment it renders

export function mountShell(el) {
  root = el;
  el.innerHTML = `
    <div class="cockpit">
      <header class="mc-header">
        <div class="brand"><h1>GMAtlas</h1><span class="tagline">Frictionless Empowerment</span></div>
        <div class="header-actions">
          <button class="btn ghost sm" data-search-toggle title="Search everything (Cast, Journal, Oracle, Documents, Party, Colony) — Ctrl/Cmd+K">🔍 Search</button>
          <span class="campaign-title" title="Campaign name"></span>
          <div class="header-drawer-tabs" data-header-drawer-tabs></div>
          <div class="settings-menu-wrap">
            <button class="btn ghost sm" data-settings-menu-toggle title="Menu" aria-label="Menu">⚙</button>
            <div class="settings-menu" data-settings-menu hidden>
              <button type="button" data-menu-open-settings>Settings</button>
              <button type="button" data-menu-open-about>About</button>
            </div>
          </div>
        </div>
      </header>
      <div class="mc-about-overlay" data-about-overlay hidden aria-label="About GMAtlas">
        <div class="mc-about-card">
          <button class="icon-btn" data-about-close aria-label="Close">✕</button>
          <h2>GMAtlas</h2>
          <p class="tagline">Frictionless Empowerment</p>
          <p class="dim small" data-about-build></p>
          <p class="dim small">A campaign operating system for solo and GM-run sci-fi tabletop play — local-first, installable as a PWA.</p>
        </div>
      </div>
      <nav class="mc-strip" aria-label="Context questions" data-strip role="tablist"></nav>
      <div class="mc-breadcrumb" data-breadcrumb></div>
      <main class="mc-workspace" data-workspace aria-live="polite"></main>
      <aside class="mc-copilot" data-copilot aria-label="Co-Pilot"><h2>Co-Pilot</h2><div data-copilot-body></div></aside>
      <div class="mc-doc-viewer" data-doc-viewer hidden>
        <div class="doc-viewer-tabs" data-doc-viewer-tabs></div>
        <div class="doc-viewer-empty" data-doc-viewer-empty hidden></div>
        <iframe data-doc-viewer-frame title="Document viewer"></iframe>
      </div>
      <div class="mc-search-overlay" data-search-overlay hidden aria-label="Universal Search">
        <div class="search-panel">
          <div class="search-panel-head">
            <input type="text" class="search-input" data-search-input placeholder="Search everything…" autocomplete="off">
            <button class="icon-btn" data-search-close aria-label="Close search">✕</button>
          </div>
          <div class="search-results" data-search-results></div>
        </div>
      </div>
      <div class="mention-suggest" data-mention-suggest hidden></div>
      <div class="inline-prompt" data-inline-prompt hidden>
        <div class="inline-prompt-fields" data-inline-prompt-fields></div>
        <div class="inline-prompt-row">
          <button type="button" class="icon-btn" data-inline-prompt-submit aria-label="Confirm">✓</button>
          <button type="button" class="icon-btn" data-inline-prompt-cancel aria-label="Cancel">✕</button>
        </div>
      </div>
      <div class="dice-roll-overlay" data-dice-roll-overlay data-open="false" aria-label="Dice roll result">
        <div class="dice-roll-card" data-dice-roll-card></div>
      </div>
      <nav class="mc-edge" aria-label="Drawers" data-edge></nav>
      <aside class="mc-drawer-anchor" data-drawer-anchor aria-label="Anchored drawer">
        <div class="drawer-head">
          <h2 data-drawer-anchor-title>Drawer</h2>
          <div class="drawer-head-actions">
            <div class="drawer-head-extra" data-drawer-anchor-head-extra></div>
            <button class="icon-btn" data-drawer-anchor-unpin title="Move back into tabs" aria-label="Move back into tabs">▶</button>
            <button class="icon-btn" data-drawer-anchor-close title="Close" aria-label="Close">✕</button>
          </div>
        </div>
        <div class="mc-drawer-body" data-drawer-anchor-body></div>
      </aside>
      <aside class="mc-drawer" data-drawer aria-label="Drawer">
        <div class="drawer-tabs" data-drawer-tabs></div>
        <div class="drawer-head">
          <h2 data-drawer-title>Drawer</h2>
          <div class="drawer-head-actions">
            <div class="drawer-head-extra" data-drawer-head-extra></div>
            <button class="icon-btn" data-close-drawer aria-label="Close">✕</button>
          </div>
        </div>
        <div class="mc-drawer-body" data-drawer-body></div>
      </aside>
      <button class="drawer-collapsed-restore" data-drawer-restore hidden title="Restore drawer tabs" aria-label="Restore drawer tabs">☰</button>
    </div>
    <div class="toast" data-toast hidden></div>`;

  el.addEventListener('click', guarded(onClick));
  el.addEventListener('dblclick', guarded(onDblClick));
  el.addEventListener('change', guarded(onChange));
  el.addEventListener('input', guarded(onInput));
  el.addEventListener('dragstart', onDragStart);
  el.addEventListener('dragover', onDragOver);
  el.addEventListener('dragleave', onDragLeave);
  el.addEventListener('drop', onDrop);
  // Touch equivalent of the drag-and-drop above (see onTouchStart's comment)
  // — touchmove is NOT passive because it conditionally calls
  // preventDefault() once a drag actually engages, to stop the page from
  // scrolling under the finger while mid-drag; before that threshold, nothing
  // is prevented and an ordinary scroll/tap behaves exactly as it always did.
  el.addEventListener('touchstart', onTouchStart, { passive: true });
  el.addEventListener('touchmove', onTouchMove, { passive: false });
  el.addEventListener('touchend', onTouchEnd);
  el.addEventListener('touchcancel', onTouchEnd);
  // Relationship graph pan/zoom (2026-07-04, "must allow for zoom-in
  // capability" once a campaign has a lot of links) — wheel is not passive
  // since onWheel conditionally calls preventDefault() (only when the
  // cursor is actually over the graph SVG, so page scroll elsewhere is
  // unaffected); mousedown/mousemove/mouseup drive drag-to-pan the same way.
  el.addEventListener('wheel', onWheel, { passive: false });
  el.addEventListener('mousedown', onMouseDown);
  el.addEventListener('mousemove', onGraphMouseMove);
  el.addEventListener('mouseup', onGraphMouseUp);
  // Closes the @-mention suggestion popup when its field genuinely loses
  // focus (clicking elsewhere, tabbing away) — focusout bubbles (blur
  // doesn't), and picking a suggestion never reaches here in the first
  // place since onMouseDown already preventDefault()s that click.
  el.addEventListener('focusout', onFocusOut);
  // A small, deliberately short set (2026-07-04 review: "add shortcuts when
  // non-disruptive") — two near-universal conventions rather than a bound
  // shortcut for every action. On document, not root: Escape/Ctrl+K should
  // work regardless of what currently has focus, the same way they do in
  // comparable tools (VSCode, Slack, GitHub, Linear all bind Ctrl/Cmd+K to
  // search-like actions; Escape universally backs out of an overlay).
  document.addEventListener('keydown', guarded(onKeydown));

  // Safety net, not a new interaction route: every text/number field here
  // only commits on 'change' (fires on blur), so typing a value and then
  // refreshing/closing/switching tabs WITHOUT clicking away first silently
  // dropped the edit — the exact bug reported for statblock attribute values
  // and freshly-added statblock groups' fields. Blurring the focused field
  // fires its pending 'change' synchronously through the existing handler
  // above, so this reuses that logic rather than adding a second commit path.
  const flushFocusedField = () => {
    const el2 = document.activeElement;
    if (el2 && el2 !== document.body && typeof el2.blur === 'function') el2.blur();
  };
  window.addEventListener('beforeunload', flushFocusedField);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushFocusedField(); });

  store.subscribe(render);
  // A background persist failure (docs/adr/0015-indexeddb-persistence.md) —
  // rare now that IndexedDB's quota is orders of magnitude bigger than
  // localStorage's was, but not impossible. Same wording guarded() already
  // uses for a synchronous throw; this is the async counterpart, since
  // store.update() no longer has a synchronous outcome to throw from.
  store.onPersistError((err) => toast(`Couldn't save — ${err && err.message ? err.message : 'an error occurred'}. Storage may be full; try exporting your campaign as a backup.`));
  render();
}

// ---- interaction --------------------------------------------------------
function onClick(ev) {
  const t = ev.target;
  const hit = (sel) => t.closest(sel);

  const suggestItem = hit('[data-mention-suggest-item]');
  if (suggestItem) { chooseMentionSuggestItem(Number(suggestItem.dataset.mentionSuggestItem)); return; }

  // External links (Phase 11 backlog) inside a mention-editor field: a
  // plain click on a real <a> living inside a contenteditable region only
  // places the caret by default in every engine this app targets (the same
  // reason .mention-link navigation needs an explicit handler below,
  // instead of relying on native anchor behavior) — so this opens it
  // itself rather than letting the click fall through. data-ext-link
  // (not just the .ext-link class, kept only for styling) matches this
  // app's data-* delegated-routing convention (rule 4).
  const extLink = hit('[data-ext-link]');
  if (extLink) { ev.preventDefault(); window.open(extLink.dataset.extLink, '_blank', 'noopener,noreferrer'); return; }

  if (hit('[data-inline-prompt-submit]')) { commitInlinePrompt(); return; }
  if (hit('[data-inline-prompt-cancel]')) { closeInlinePrompt(); return; }

  const q = hit('[data-question]');
  if (q) return store.update((d) => { d.context.active = q.dataset.question; return d; });

  const edge = hit('[data-drawer-open]');
  if (edge) return toggleDrawer(edge.dataset.drawerOpen);
  if (hit('[data-close-drawer]')) return closeDrawerTab(activeDrawer);
  // Check the nested close ✕ and anchor icon before the tab button they sit
  // inside — all three match `[data-drawer-tab]` via closest() otherwise
  // (the tab button itself carries that attribute too), so neither would
  // ever be reachable on its own.
  const drawerTabClose = hit('[data-drawer-tab-close]');
  if (drawerTabClose) return closeDrawerTab(drawerTabClose.dataset.drawerTabClose);
  const drawerTabAnchor = hit('[data-drawer-tab-anchor]');
  if (drawerTabAnchor) return anchorDrawerTab(drawerTabAnchor.dataset.drawerTabAnchor);
  const drawerTab = hit('[data-drawer-tab]');
  if (drawerTab) { activeDrawer = drawerTab.dataset.drawerTab; return render(); }
  if (hit('[data-close-all-drawers]')) return closeAllDrawerTabs();
  if (hit('[data-drawer-collapse]')) { drawerCollapsed = true; return render(); }
  if (hit('[data-drawer-restore]')) { drawerCollapsed = false; return render(); }
  if (hit('[data-drawer-anchor-unpin]')) return unanchorDrawerTab();
  // Distinct from unpin (▶, "merge into tabs"): closes the anchored drawer
  // outright, with no promote-into-openDrawers step — fixes a real reported
  // bug where, if the anchor panel was the only thing open, ▶ silently
  // turned it into the MAIN drawer (which alone had a ✕) instead of closing
  // it, forcing a confusing second click.
  if (hit('[data-drawer-anchor-close]')) { anchoredDrawer = null; return render(); }
  if (hit('[data-toggle-copilot]')) { copilotOpen = !copilotOpen; return render(); }
  if (hit('[data-toggle-cast]')) return toggleCastDrawer();

  // Header gear menu (Settings / About — "USER CHANGES" QoL batch,
  // replacing the old bare campaign-title-is-the-settings-button). New
  // Campaign lives only inside the Settings drawer now (data-new-campaign,
  // below) — a destructive-adjacent action one menu level deeper than
  // Settings/About on purpose. Matches this app's existing convention
  // (lensPickerOpen etc.): only an explicit toggle or picking an item
  // closes it, no click-outside handler.
  if (hit('[data-settings-menu-toggle]')) { settingsMenuOpen = !settingsMenuOpen; return render(); }
  if (hit('[data-menu-open-settings]')) { settingsMenuOpen = false; toggleDrawer('settings'); return render(); }
  if (hit('[data-menu-open-about]')) { settingsMenuOpen = false; aboutOpen = true; return render(); }
  if (hit('[data-about-close]')) { aboutOpen = false; return render(); }

  // --- Phase 9: Activity -> Rules Lens suggestion, apply as default ruleset ---
  const applyRuleset = hit('[data-apply-ruleset]');
  if (applyRuleset) {
    const id = applyRuleset.dataset.applyRuleset;
    store.update((d) => { d.settings.statRuleset = id; return d; });
    return toast(`Default ruleset set to ${id}`);
  }

  // --- Universal Search (Phase 8) ---
  if (hit('[data-search-toggle]')) {
    searchOpen = !searchOpen;
    if (!searchOpen) { searchQuery = ''; const inp = root.querySelector('[data-search-input]'); if (inp) inp.value = ''; }
    renderSearchOverlay();
    if (searchOpen) { const inp = root.querySelector('[data-search-input]'); if (inp) inp.focus(); }
    return;
  }
  if (hit('[data-search-close]')) {
    searchOpen = false; searchQuery = '';
    const inp = root.querySelector('[data-search-input]'); if (inp) inp.value = '';
    return renderSearchOverlay();
  }
  if (hit('[data-dice-roll-close]')) { diceRollResult = null; return renderDiceRollOverlay(); }
  if (hit('[data-dice-roll-copy]')) {
    if (!diceRollResult) return;
    navigator.clipboard.writeText(diceRollCopyText(diceRollResult)).then(() => toast('Copied'), () => toast('Could not copy'));
    return;
  }
  if (hit('[data-dice-roll-journal]')) {
    if (!diceRollResult) return;
    const { label } = diceRollResult;
    store.update((d) => addNote(d, `${label}\n${diceRollCopyText(diceRollResult)}`, 'Roll'));
    return toast('Added to Journal');
  }
  const searchResult = hit('[data-search-result]');
  if (searchResult) {
    const idx = Number(searchResult.dataset.searchResult);
    const item = universalSearch(store.get(), searchQuery)[idx];
    searchOpen = false; searchQuery = '';
    const inp = root.querySelector('[data-search-input]'); if (inp) inp.value = '';
    if (item && item.target) {
      const target = item.target;
      openDrawerTab(target.drawer);
      if (target.drawer === 'oracle') oracleFilter = target.oracleFilterText || '';
      if (target.entityId) store.update((d) => setActiveEntity(d, target.entityId));
      else if (target.docTabKey) store.update((d) => openDocumentTab(d, target.docTabKey));
      else render();
    } else render();
    return;
  }

  if (hit('[data-continue-story]')) {
    store.update((d) => continueStory(d));
    return toast('Scene generated → Journal');
  }
  // "What Happens Next?" (docs/adr/0009-situation-engine-revisited.md,
  // Decision item 3): no longer an alias for Continue Story — it now opens
  // a small Suggestion Lens chip picker instead of generating immediately.
  // Continue Story (above) keeps its original no-input behavior unchanged.
  if (hit('[data-what-next]')) {
    lensPickerOpen = !lensPickerOpen;
    if (lensPickerOpen) lensDraw = drawSuggestionLenses(store.get());
    return render();
  }
  const lensPick = hit('[data-lens-pick]');
  if (lensPick) {
    const lensId = lensPick.dataset.lensPick;
    lensPickerOpen = false;
    store.update((d) => suggestNextWithLens(d, lensId));
    return toast('Scene generated → Journal');
  }

  const shift = hit('[data-shift]');
  if (shift) { store.update((d) => applyStoryShift(d, shift.dataset.shift)); return toast(shift.dataset.shift); }

  const shiftPrompt = hit('[data-shift-prompt]');
  if (shiftPrompt) {
    const name = shiftPrompt.dataset.shiftPrompt;
    openInlinePrompt('shift-prompt', {
      label: name, placeholder: SHIFT_PROMPT_PLACEHOLDERS[name] || `${name}…`,
      meta: { name }, anchorRect: shiftPrompt.getBoundingClientRect(),
    });
    return;
  }

  const roll = hit('[data-roll]');
  if (roll) {
    anchorJournalBesideOracleRoll(roll);
    const path = roll.dataset.roll.split('>');
    let text = '';
    store.update((d) => { const r = rollOracle(d, path); text = r.text; return r.campaign; });
    return toast('🎲 ' + text.split('\n').slice(-1)[0]);
  }

  if (hit('[data-journal-add]')) {
    const ta = root.querySelector('[data-journal-input]');
    const v = ta && serializeMentionEditor(ta).trim();
    if (v) { store.update((d) => addNote(d, v, 'Note')); toast('Note added'); }
    return;
  }
  const del = hit('[data-journal-del]');
  if (del) return store.update((d) => { d.journal = d.journal.filter((j) => j.id !== del.dataset.journalDel); return d; });
  const editToggle = hit('[data-journal-edit-toggle]');
  if (editToggle) {
    const id = editToggle.dataset.journalEditToggle;
    if (journalEditOpen.has(id)) journalEditOpen.delete(id); else journalEditOpen.add(id);
    return renderDrawerBody();
  }

  if (hit('[data-recap-toggle]')) { recapOpen = !recapOpen; return renderDrawerBody(); }
  const typeFilterBtn = hit('[data-entity-type-filter]');
  if (typeFilterBtn) {
    entityTypeFilter = typeFilterBtn.dataset.entityTypeFilter;
    // A tag valid under the old type filter may not exist under the new
    // one — same precedent as switching drawers resetting docTagFilters.
    entityTagFilters = new Set();
    return renderDrawerBody();
  }
  const entityTagFilterBtn = hit('[data-entity-tag-filter]');
  if (entityTagFilterBtn) {
    const tag = entityTagFilterBtn.dataset.entityTagFilter;
    if (entityTagFilters.has(tag)) entityTagFilters.delete(tag); else entityTagFilters.add(tag);
    return renderDrawerBody();
  }
  if (hit('[data-entity-tag-list-toggle]')) { entityTagListOpen = !entityTagListOpen; return renderDrawerBody(); }

  // Gear/weapon/armor catalog picker (ADR 0012) — search/select a
  // pre-authored item; clicking one creates an Item entity with one `gear`
  // statblock group per system the catalog entry has stats for, pre-filled.
  const catalogAdd = hit('[data-catalog-add]');
  if (catalogAdd) {
    const id = catalogAdd.dataset.catalogAdd;
    catalogPickerOpen = false; catalogSearch = '';
    let name = '';
    store.update((d) => { const r = createItemFromCatalog(d, findCatalogItem(id)); name = r.id && getEntity(r.campaign, r.id) ? getEntity(r.campaign, r.id).name : ''; return r.campaign; });
    openDrawerTab('entity-detail');
    return toast(name ? `Added ${name}` : 'Item added');
  }
  if (hit('[data-catalog-picker-close]')) { catalogPickerOpen = false; catalogSearch = ''; return renderDrawerBody(); }
  if (hit('[data-recap-save]')) {
    store.update((d) => addNote(d, formatSessionRecap(buildSessionRecap(d)), 'Session Recap'));
    return toast('Recap saved to Journal');
  }

  // --- graph node → open entity inspector ---
  const gNode = hit('[data-graph-node]');
  if (gNode) { openDrawerTab('entity-detail'); focusInspectorNameNextRender = true; store.update((d) => setActiveEntity(d, gNode.dataset.graphNode)); return; }

  // --- graph zoom buttons (wheel-zoom/drag-pan are onWheel/onGraphMouse* below,
  // both bypass a full render for smoothness — these buttons are the discrete,
  // low-frequency counterpart, so a plain updateGraphViewBox() call is enough). ---
  const gZoom = hit('[data-graph-zoom]');
  if (gZoom) {
    const action = gZoom.dataset.graphZoom;
    if (action === 'reset') {
      graphView = { scale: 1, x: 0, y: 0 };
    } else {
      const scale = Math.min(6, Math.max(0.5, graphView.scale * (action === 'in' ? 1.3 : 1 / 1.3)));
      const curW = GRAPH_W / graphView.scale, curH = GRAPH_H / graphView.scale;
      const cx = graphView.x + curW / 2, cy = graphView.y + curH / 2;
      const newW = GRAPH_W / scale, newH = GRAPH_H / scale;
      graphView = { scale, x: cx - newW / 2, y: cy - newH / 2 };
    }
    updateGraphViewBox();
    return;
  }

  // --- Planetfall Grid Battlemap (Phase 11, docs/adr/0023) ------------------
  // Checked BEFORE data-open-entity below: a placed token icon carries
  // data-open-entity on its OUTER div (so a plain click opens that entity,
  // same convention as everywhere else), but its ✕ remove badge is a
  // DESCENDANT of that same div — without checking the more specific
  // ✕/edit targets first, closest('[data-open-entity]') would match the
  // ancestor and open the entity instead of removing the icon.
  const bmIconRemove = hit('[data-battlemap-icon-remove]');
  if (bmIconRemove) {
    const [mapId, iconId] = bmIconRemove.dataset.battlemapIconRemove.split('::');
    return store.update((d) => removeBattlemapIcon(d, mapId, iconId));
  }
  const bmIconEdit = hit('[data-battlemap-icon-edit]');
  if (bmIconEdit) {
    const [mapId, iconId] = bmIconEdit.dataset.battlemapIconEdit.split('::');
    const map = getBattlemap(store.get(), mapId);
    const icon = map && map.icons.find((i) => i.id === iconId);
    if (!icon) return;
    openInlinePrompt('battlemap-icon-note', {
      label: 'Note (shown as a hover tooltip)', placeholder: 'What does the party see here?', value: icon.note || '',
      meta: { mapId, iconId }, anchorRect: bmIconEdit.getBoundingClientRect(),
    });
    return;
  }
  const bmPalettePick = hit('[data-battlemap-palette-pick]');
  if (bmPalettePick) {
    const key = bmPalettePick.dataset.battlemapPalettePick;
    battlemapPlacingIcon = battlemapPlacingIcon === key ? null : key;
    return renderDrawerBody();
  }
  // The canvas itself — only acts if an icon is currently armed from the
  // palette (battlemapPlacingIcon); a plain click with nothing armed does
  // nothing (dragging a Cast entity or an existing icon onto it is the
  // separate native-DnD path, onDrop, not this click handler). Checked
  // after the icon-specific handlers above for the same reason — a click
  // on an existing icon INSIDE the canvas must not also register as
  // "place a new one here."
  const bmCanvas = hit('[data-battlemap-canvas]');
  if (bmCanvas && battlemapPlacingIcon) {
    const mapId = bmCanvas.dataset.battlemapCanvas;
    const rect = bmCanvas.getBoundingClientRect();
    const x = rect.width ? (ev.clientX - rect.left) / rect.width : 0.5;
    const y = rect.height ? (ev.clientY - rect.top) / rect.height : 0.5;
    const key = battlemapPlacingIcon;
    battlemapPlacingIcon = null;
    return store.update((d) => addBattlemapIcon(d, mapId, { kind: 'annotation', iconKey: key, x, y }));
  }
  const bmSelect = hit('[data-battlemap-select]');
  if (bmSelect) return store.update((d) => setActiveBattlemap(d, bmSelect.dataset.battlemapSelect));
  const bmAdd = hit('[data-battlemap-add]');
  if (bmAdd) {
    openInlinePrompt('battlemap-add', { label: 'Map name', placeholder: 'e.g. Docking Bay 3', anchorRect: bmAdd.getBoundingClientRect() });
    return;
  }
  const bmRemove = hit('[data-battlemap-remove]');
  if (bmRemove) {
    if (window.confirm('Delete this map? This cannot be undone.')) store.update((d) => removeBattlemap(d, bmRemove.dataset.battlemapRemove));
    return;
  }

  // --- entities ---
  // Every entity click anywhere (Cast row, mention link, relationship chip,
  // graph node, WHO/WHERE chip, ...) opens the same Entity Detail tab — it
  // has no edge nav button of its own; this is the only way it opens (see
  // DRAWER_META/openDrawerTab('entity-detail')).
  const openEnt = hit('[data-open-entity]');
  if (openEnt) {
    // A click inside a contenteditable mention-link would otherwise still
    // run the browser's own default "place the caret here" action after
    // this handler returns, stealing focus right back from the inspector
    // name field this sets below.
    ev.preventDefault();
    openDrawerTab('entity-detail');
    // A single click both opens AND focuses the name field, ready to read
    // or rename — editing an inline mention's own label is done a different
    // way (arrow-key the cursor into it, same as any other inline text;
    // clicking it is a deliberate "go there" action, matching how mentions
    // behave in comparable editors like Notion/Google Docs). Must be set
    // BEFORE store.update() — that call synchronously triggers the render
    // that reads this flag, so setting it after would always be one render
    // too late.
    focusInspectorNameNextRender = true;
    store.update((d) => setActiveEntity(d, openEnt.dataset.openEntity));
    return;
  }
  const delEnt = hit('[data-entity-del]');
  if (delEnt) {
    const deletedId = delEnt.dataset.entityDel;
    // removeEntity's own fallback (domain/entities.js) picks the first
    // entity in the WHOLE campaign, since the pure domain layer has no
    // idea Cast might currently be filtered to a type/tag/search — if it
    // is, and that filtered list still has something left once the
    // deleted entity is excluded, prefer that instead, so deleting the
    // active NPC while Cast is filtered to "npc" doesn't silently jump
    // the inspector to some unrelated Location.
    const filteredNext = filterEntities(store.get(), { types: entityTypeFilter ? [entityTypeFilter] : null, search: entitySearch, tags: [...entityTagFilters] })
      .find((e) => e.id !== deletedId);
    store.update((d) => {
      let next = removeEntity(d, deletedId);
      if (filteredNext && getEntity(next, filteredNext.id)) next = setActiveEntity(next, filteredNext.id);
      return next;
    });
    return toast('Entity removed');
  }
  // WHO/WHY's entityList() "+ Type" buttons — a real pre-existing gap found
  // while wiring WHERE's own new "+ New Location" (below): this attribute
  // was rendered but had no click handler at all, so those buttons did
  // nothing. Fixed here since WHERE's version needed the identical
  // create-a-blank-entity behavior anyway.
  const entAdd = hit('[data-entity-add]');
  if (entAdd) { store.update((d) => createEntity(d, { type: entAdd.dataset.entityAdd }).campaign); return toast('Entity added'); }
  // WHERE's "+ New Location" — same blank-create as the generic "+ Type"
  // above; the new entity is unnamed until the GM opens Cast and names it,
  // at which point it becomes a taggable candidate below like any other
  // Location (no more auto-add to a curated list — that list is gone).
  const whereAddLoc = hit('[data-where-add-location]');
  if (whereAddLoc) { store.update((d) => createEntity(d, { type: 'location' }).campaign); return toast('Location added — name and tag it in Cast'); }
  // WHERE's "Present Here" curated list (context.where.entityIds) was
  // duplicative of Focus — a Location already belongs to the scene once
  // it's mentioned there. Clicking a matching Location (or, on WHO, a
  // matching NPC/Faction — same picker pattern, insertContextMention
  // below is shared by both) now inserts a real @mention at the end of
  // Focus directly, same insertMentionNode path the drag-and-drop mention
  // handler above uses.
  const insertWhereMention = hit('[data-insert-where-mention]');
  if (insertWhereMention) { insertContextMention('where', insertWhereMention.dataset.insertWhereMention); return; }
  const insertWhoMention = hit('[data-insert-who-mention]');
  if (insertWhoMention) { insertContextMention('who', insertWhoMention.dataset.insertWhoMention); return; }
  // Revealed/hidden (GM) starts collapsed on every entity, but once a GM
  // opens it, docs/adr/next-request.md (2026-07-06) asks that it "stay
  // revealed on future loading of the given entity" — a real persisted
  // campaign field (entity.revealedOpen), not ephemeral UI state, since it
  // needs to survive a reload.
  const revealToggle = hit('[data-reveal-toggle]');
  if (revealToggle) { const id = revealToggle.dataset.revealToggle; return store.update((d) => updateEntity(d, id, { revealedOpen: !getEntity(d, id).revealedOpen })); }
  const unlink = hit('[data-entity-unlink]');
  if (unlink) { const active = store.get().entities.activeId; return store.update((d) => removeRelationship(d, active, unlink.dataset.entityUnlink)); }
  const entTagRemove = hit('[data-entity-tag-remove]');
  if (entTagRemove) { const active = store.get().entities.activeId; return store.update((d) => removeEntityTag(d, active, entTagRemove.dataset.entityTagRemove)); }
  if (hit('[data-entity-link-add]')) {
    const active = store.get().entities.activeId;
    const target = root.querySelector('[data-entity-link-target]');
    const label = root.querySelector('[data-entity-link-label]');
    const type = root.querySelector('[data-entity-link-type]');
    if (active && target && target.value) { store.update((d) => addRelationship(d, active, target.value, (label && label.value.trim()) || 'linked', type && type.value)); toast('Linked'); }
    return;
  }

  // --- statblocks: add/remove whole groups; a group's own fields are only
  // ever value-edited from the entity view — shape/name/kind is Settings'
  // job (see drawers/index.js statblockGroupBlock). ------------------------
  const sbAdd = hit('[data-statblock-add]');
  if (sbAdd) {
    const active = store.get().entities.activeId;
    const kind = sbAdd.dataset.statblockAdd;
    const rulesetOrTemplateId = sbAdd.dataset.statblockRuleset || sbAdd.dataset.statblockTemplate;
    store.update((d) => addEntityStatblockGroup(d, active, kind, rulesetOrTemplateId));
    return toast('Statblock added');
  }
  const rmGroup = hit('[data-statblock-remove-group]');
  if (rmGroup) {
    const active = store.get().entities.activeId;
    store.update((d) => removeEntityStatblockGroup(d, active, Number(rmGroup.dataset.statblockRemoveGroup)));
    return toast('Statblock removed');
  }
  const sbAddField = hit('[data-statblock-add-field]');
  if (sbAddField) {
    const gi = Number(sbAddField.dataset.statblockAddField);
    openInlinePrompt('statblock-add-field', { label: 'Field name', placeholder: 'e.g. Callsign', meta: { gi }, anchorRect: sbAddField.getBoundingClientRect() });
    return;
  }
  const sbAddTrack = hit('[data-statblock-add-track-field]');
  if (sbAddTrack) {
    const gi = Number(sbAddTrack.dataset.statblockAddTrackField);
    openInlinePrompt('statblock-add-track', { label: 'Track name', placeholder: 'e.g. Ammo', meta: { gi }, anchorRect: sbAddTrack.getBoundingClientRect() });
    return;
  }
  const trackSet = hit('[data-statblock-track-set]');
  if (trackSet) {
    const active = store.get().entities.activeId;
    const [gi, fi] = trackSet.dataset.statblockTrackSet.split('::').map(Number);
    const n = Number(trackSet.dataset.trackN);
    return store.update((d) => setEntityStatblockTrackValue(d, active, gi, fi, n));
  }
  const rollLabel = hit('[data-statblock-roll-label]');
  if (rollLabel) {
    const [gi, fi] = rollLabel.dataset.statblockRollLabel.split('::').map(Number);
    const active = store.get().entities.activeId;
    const e = getEntity(store.get(), active);
    const group = e && e.statblocks && e.statblocks[gi];
    const f = group && group.fields[fi];
    if (f) performFieldRoll(f, `${e.name || 'Unnamed'} — ${f.key || 'Stat'}`);
    return;
  }
  if (hit('[data-statblock-add-toggle]')) { statblockAddOpen = !statblockAddOpen; return renderDrawerBody(); }
  const enhToggle = hit('[data-enhancements-toggle]');
  if (enhToggle) {
    const id = enhToggle.dataset.enhancementsToggle;
    if (expandedEnhancements.has(id)) expandedEnhancements.delete(id); else expandedEnhancements.add(id);
    return renderDrawerBody();
  }
  const worldDemoToggle = hit('[data-world-demographics-toggle]');
  if (worldDemoToggle) {
    const id = worldDemoToggle.dataset.worldDemographicsToggle;
    if (expandedWorldDemographics.has(id)) expandedWorldDemographics.delete(id); else expandedWorldDemographics.add(id);
    return renderDrawerBody();
  }
  const worldProfileToggle = hit('[data-world-profile-toggle]');
  if (worldProfileToggle) {
    const id = worldProfileToggle.dataset.worldProfileToggle;
    if (expandedWorldProfile.has(id)) expandedWorldProfile.delete(id); else expandedWorldProfile.add(id);
    return renderDrawerBody();
  }
  const tradeCodeRemove = hit('[data-entity-tradecode-remove]');
  if (tradeCodeRemove) {
    const [id, code] = tradeCodeRemove.dataset.entityTradecodeRemove.split('::');
    return store.update((d) => removeLocationTradeCode(d, id, code));
  }
  const baseRemove = hit('[data-entity-base-remove]');
  if (baseRemove) {
    const [id, name] = baseRemove.dataset.entityBaseRemove.split('::');
    return store.update((d) => removeLocationBase(d, id, name));
  }
  const sbGroupToggle = hit('[data-statblock-group-toggle]');
  if (sbGroupToggle) {
    const key = sbGroupToggle.dataset.statblockGroupToggle;
    if (collapsedStatblockGroups.has(key)) collapsedStatblockGroups.delete(key); else collapsedStatblockGroups.add(key);
    return renderDrawerBody();
  }
  // "View in Character Sheet" on a read-only Bond value (see rel-bond-value
  // above) — expands that statblock group if it was collapsed, then scrolls
  // it into view, so a GM can see/advance the actual track without hunting
  // for it further down the inspector.
  const viewBondTrack = hit('[data-view-bond-track]');
  if (viewBondTrack) {
    const gi = viewBondTrack.dataset.viewBondTrack;
    const active = store.get().entities.activeId;
    collapsedStatblockGroups.delete(`${active}::${gi}`);
    renderDrawerBody();
    const target = root.querySelector(`[data-statblock-group="${gi}"]`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // --- oracle: collapsible groups + roll-whole-group -----------------------
  const oracleToggle = hit('[data-oracle-toggle]');
  if (oracleToggle) {
    const key = oracleToggle.dataset.oracleToggle;
    if (expandedOracleGroups.has(key)) expandedOracleGroups.delete(key); else expandedOracleGroups.add(key);
    return renderDrawerBody();
  }
  if (hit('[data-oracle-collapse-all]')) { expandedOracleGroups = new Set(); return renderDrawerBody(); }
  const rollGroupBtn = hit('[data-roll-group]');
  if (rollGroupBtn) {
    anchorJournalBesideOracleRoll(rollGroupBtn);
    const path = rollGroupBtn.dataset.rollGroup.split('>');
    let text = '';
    store.update((d) => { const r = rollOracle(d, path, { group: true }); text = r.text; return r.campaign; });
    return toast('🎲 ' + text.split('\n').slice(-1)[0]);
  }

  // --- oracle: table entry editor (Phase 8) --------------------------------
  const oracleEditToggle = hit('[data-oracle-edit-toggle]');
  if (oracleEditToggle) {
    const key = oracleEditToggle.dataset.oracleEditToggle;
    if (oracleEditorOpen.has(key)) oracleEditorOpen.delete(key); else oracleEditorOpen.add(key);
    return renderDrawerBody();
  }
  const oracleEntryRemove = hit('[data-oracle-entry-remove]');
  if (oracleEntryRemove) {
    const [key, idx] = oracleEntryRemove.dataset.oracleEntryRemove.split('::');
    store.update((d) => removeOracleEntry(d, key.split('>'), Number(idx)));
    return renderDrawerBody();
  }
  const oracleEntryAdd = hit('[data-oracle-entry-add]');
  if (oracleEntryAdd) {
    const key = oracleEntryAdd.dataset.oracleEntryAdd;
    const input = oracleEntryAdd.previousElementSibling; // the sibling <input data-oracle-entry-new>
    const value = input && input.matches('[data-oracle-entry-new]') ? input.value.trim() : '';
    if (value) store.update((d) => addOracleEntry(d, key.split('>'), value));
    return renderDrawerBody();
  }
  const oracleReset = hit('[data-oracle-reset]');
  if (oracleReset) {
    const key = oracleReset.dataset.oracleReset;
    store.update((d) => resetOracleTable(d, key.split('>')));
    return renderDrawerBody();
  }

  // --- oracle tags (docs/adr/0016-oracle-tags-and-field-links.md) —
  // hidden by default, revealed via a dedicated 🏷 toggle next to ✎, same
  // "collapsed until asked" posture as the entries editor above.
  const oracleTagToggleEditor = hit('[data-oracle-tag-toggle-editor]');
  if (oracleTagToggleEditor) {
    const key = oracleTagToggleEditor.dataset.oracleTagToggleEditor;
    if (oracleTagEditorOpen.has(key)) oracleTagEditorOpen.delete(key); else oracleTagEditorOpen.add(key);
    return renderDrawerBody();
  }
  const oracleTagRemove = hit('[data-oracle-tag-remove]');
  if (oracleTagRemove) {
    const [key, tag] = oracleTagRemove.dataset.oracleTagRemove.split('::');
    store.update((d) => removeOracleTag(d, key.split('>'), tag));
    return renderDrawerBody();
  }
  const oracleTagFilterClear = hit('[data-oracle-tag-filter-clear]');
  if (oracleTagFilterClear) { oracleTagFilter = null; return renderDrawerBody(); }
  // Collapsible "?" tip icons ("USER CHANGES" QoL batch) — one flat toggle
  // Set shared by every instance across drawers AND the workspace (the HOW
  // tab's lens-picker tip lives there, not in a drawer), so this re-renders
  // both to be safe regardless of which view the clicked icon was in.
  const helpToggleBtn = hit('[data-help-toggle]');
  if (helpToggleBtn) {
    const key = helpToggleBtn.dataset.helpToggle;
    if (helpOpen.has(key)) helpOpen.delete(key); else helpOpen.add(key);
    renderDrawerBody();
    return render();
  }
  // A field's 🔮 link (docs/adr/0016) — opens Oracle anchored beside
  // whichever drawer/tab is currently active (e.g. Entity Detail), not on
  // top of it, so the field being written stays visible next to the
  // filtered Oracle results — anchorDrawerTab() already renders itself.
  const oracleFieldLink = hit('[data-oracle-field-link]');
  if (oracleFieldLink) {
    const [entityType, field] = oracleFieldLink.dataset.oracleFieldLink.split('.');
    const tags = oracleLinkTagsFor(entityType, field);
    if (tags) { oracleTagFilter = tags; oracleFilter = ''; anchorDrawerTab('oracle'); }
    return;
  }

  // --- Guide tree (docs/adr/0017-multi-doc-guide-tree.md) ------------------
  const guideNodeSelect = hit('[data-guide-node-select]');
  if (guideNodeSelect) { store.update((d) => setActiveGuideId(d, guideNodeSelect.dataset.guideNodeSelect)); return; }
  const guideNodeToggle = hit('[data-guide-node-toggle]');
  if (guideNodeToggle) {
    const id = guideNodeToggle.dataset.guideNodeToggle;
    if (expandedGuideNodes.has(id)) expandedGuideNodes.delete(id); else expandedGuideNodes.add(id);
    return renderDrawerBody();
  }
  if (hit('[data-guide-add-root]')) { store.update((d) => createGuideDoc(d, { title: 'Untitled' }).campaign); return; }
  const guideAddChild = hit('[data-guide-node-add-child]');
  if (guideAddChild) {
    const parentId = guideAddChild.dataset.guideNodeAddChild;
    expandedGuideNodes.add(parentId);
    store.update((d) => createGuideDoc(d, { title: 'Untitled', parentId }).campaign);
    return;
  }
  // Rename toggle/save shares one button (✎ opens the input, 💾 saves it) —
  // same two-click convention docRename/refRename already use. Handles
  // both the tree row's own rename AND the active doc's title input above
  // the editor (data-guide-rename-input carries whichever id is open).
  const guideNodeRename = hit('[data-guide-node-rename]');
  if (guideNodeRename) {
    const id = guideNodeRename.dataset.guideNodeRename;
    if (guideRenameOpen.has(id)) {
      const input = root.querySelector(`[data-guide-rename-input="${id}"]`);
      guideRenameOpen.delete(id);
      if (input && input.value.trim()) return store.update((d) => renameGuideDoc(d, id, input.value.trim()));
      return renderDrawerBody();
    }
    guideRenameOpen.add(id);
    return renderDrawerBody();
  }
  const guideNodeDelete = hit('[data-guide-node-delete]');
  if (guideNodeDelete) {
    const id = guideNodeDelete.dataset.guideNodeDelete;
    const camp = store.get();
    const target = (camp.guide && camp.guide.docs || []).find((d) => d.id === id);
    const count = countGuideDescendants(camp, id);
    const name = target ? target.title : 'this document';
    const message = count > 0
      ? `Delete "${name}" and its ${count} sub-document${count === 1 ? '' : 's'}? This can't be undone.`
      : `Delete "${name}"? This can't be undone.`;
    if (window.confirm(message)) store.update((d) => removeGuideDoc(d, id));
    return;
  }

  // --- party --- (inline creation form, not a window.prompt() popup — see
  // partyTrackerAddForm in drawers/index.js; name/type are both asked there,
  // never changeable again once the tracker exists)
  if (hit('[data-party-tracker-add-toggle]')) { partyTrackerAddOpen = true; partyTrackerDraftKind = 'meter'; partyTrackerDraftName = ''; renderDrawerBody(); restoreFocus('[data-party-tracker-draft-name]'); return; }
  if (hit('[data-party-tracker-add-cancel]')) { partyTrackerAddOpen = false; partyTrackerDraftName = ''; return renderDrawerBody(); }
  if (hit('[data-party-tracker-create]')) {
    const nameInput = root.querySelector('[data-party-tracker-draft-name]');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) { if (nameInput) nameInput.focus(); return; }
    const kind = partyTrackerDraftKind;
    const maxInput = root.querySelector('[data-party-tracker-draft-max]');
    const diffSelect = root.querySelector('[data-party-tracker-draft-difficulty]');
    partyTrackerAddOpen = false;
    store.update((d) => addPartyTracker(d, {
      name, kind,
      max: maxInput ? Number(maxInput.value) || 5 : 5,
      difficulty: diffSelect ? diffSelect.value : '',
    }));
    return toast('Tracker added');
  }
  const trkDel = hit('[data-party-tracker-remove]');
  if (trkDel) return store.update((d) => removePartyTracker(d, trkDel.dataset.partyTrackerRemove));
  const trkStep = hit('[data-party-tracker-step]');
  if (trkStep) return store.update((d) => stepPartyTracker(d, trkStep.dataset.partyTrackerStep, Number(trkStep.dataset.delta)));
  const trkBox = hit('[data-party-tracker-box]');
  if (trkBox) return store.update((d) => setPartyTrackerValue(d, trkBox.dataset.partyTrackerBox, Number(trkBox.dataset.trackN)));

  // --- colony ---
  if (hit('[data-colony-crew-add]')) { store.update((d) => addCrewRow(d, {})); return toast('Crew row added'); }
  const crewDel = hit('[data-colony-crew-remove]');
  if (crewDel) return store.update((d) => removeCrewRow(d, crewDel.dataset.colonyCrewRemove));

  // --- trade (Merchant Rules Lens, ADR 0003/0004) ---
  const tradeBuy = hit('[data-trade-buy]');
  if (tradeBuy) {
    const [locId, commodityId] = tradeBuy.dataset.tradeBuy.split('::');
    const qtyInput = tradeBuy.closest('tr')?.querySelector(`[data-trade-qty="${commodityId}"]`);
    const qty = qtyInput ? Number(qtyInput.value) || 1 : 1;
    store.update((d) => buyCommodity(d, locId, commodityId, qty));
    return toast(`Bought ${qty}`);
  }
  const tradeSell = hit('[data-trade-sell]');
  if (tradeSell) {
    const [locId, commodityId] = tradeSell.dataset.tradeSell.split('::');
    const qtyInput = tradeSell.closest('tr')?.querySelector(`[data-trade-qty="${commodityId}"]`);
    const qty = qtyInput ? Number(qtyInput.value) || 1 : 1;
    store.update((d) => sellCommodity(d, locId, commodityId, qty));
    return toast(`Sold ${qty}`);
  }
  if (hit('[data-trade-generate-contract]')) {
    let type = '';
    store.update((d) => { const r = generateContract(d); const c = r.campaign.threads.find((x) => x.id === r.id); type = c ? c.type : ''; return r.campaign; });
    return toast(type ? `Generated a ${type} contract` : 'Contract generated');
  }
  if (hit('[data-trade-contract-add-toggle]')) { tradeContractAddOpen = true; return renderDrawerBody(); }
  if (hit('[data-trade-contract-add-cancel]')) { tradeContractAddOpen = false; return renderDrawerBody(); }
  if (hit('[data-trade-contract-create]')) {
    const nameInput = root.querySelector('[data-trade-contract-draft-name]');
    const name = nameInput ? nameInput.value.trim() : '';
    const type = root.querySelector('[data-trade-contract-draft-type]')?.value.trim() || '';
    const patronId = root.querySelector('[data-trade-contract-draft-patron]')?.value || '';
    const originId = root.querySelector('[data-trade-contract-draft-origin]')?.value || '';
    const destinationId = root.querySelector('[data-trade-contract-draft-destination]')?.value || '';
    const payout = Number(root.querySelector('[data-trade-contract-draft-payout]')?.value) || 0;
    if (!name && !type) { if (nameInput) nameInput.focus(); return; }
    tradeContractAddOpen = false;
    store.update((d) => createContract(d, { name: name || type, type, patronId, originId, destinationId, payout }).campaign);
    return toast('Contract added');
  }

  // --- factions: Pressure Track (Phase 10) ---
  const pressureAdd = hit('[data-faction-pressure-add]');
  if (pressureAdd) {
    store.update((d) => createPressureTrack(d, pressureAdd.dataset.factionPressureAdd));
    return toast('Pressure Track added');
  }

  // --- factions: Force/Cunning/Wealth, Assets, turn resolution (SWN-inspired, 2026-07-06) ---
  const assetRoll = hit('[data-faction-asset-roll]');
  if (assetRoll) {
    let asset = '';
    store.update((d) => { const r = rollFactionAsset(d, assetRoll.dataset.factionAssetRoll); asset = r.asset; return r.campaign; });
    return toast(asset ? `Asset added: ${asset}` : 'No Faction Asset table entries found');
  }
  const assetRemove = hit('[data-faction-asset-remove]');
  if (assetRemove) {
    const [factionId, idx] = assetRemove.dataset.factionAssetRemove.split('::');
    store.update((d) => removeFactionAsset(d, factionId, Number(idx)));
    return;
  }
  const turnResolve = hit('[data-faction-turn-resolve]');
  if (turnResolve) {
    let line = '';
    store.update((d) => {
      const result = resolveFactionTurn(d, turnResolve.dataset.factionTurnResolve);
      if (!result) return d;
      line = formatFactionTurnResult(result);
      return addNote(d, line, 'Faction Turn');
    });
    return toast(line || 'Faction turn resolved');
  }

  // --- NPC deepening (SWN-inspired stereotype/want/complication, 2026-07-06) ---
  const deepen = hit('[data-deepen-npc]');
  if (deepen) {
    let added = null;
    store.update((d) => { const r = deepenNpc(d, deepen.dataset.deepenNpc); added = r.added; return r.campaign; });
    return toast(added ? 'NPC deepened' : 'Nothing to roll');
  }

  // --- enhancements (CWN-inspired strain/augmentation, renamed from
  // "Cybernetics" 2026-07-06 — see domain/enhancements.js) ---
  const enhInstall = hit('[data-enhancement-install]');
  if (enhInstall) {
    const id = enhInstall.dataset.enhancementInstall;
    const nameInput = root.querySelector(`[data-enhancement-name-input="${id}"]`);
    const typeInput = root.querySelector(`[data-enhancement-type-input="${id}"]`);
    const strainInput = root.querySelector(`[data-enhancement-strain-input="${id}"]`);
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) { if (nameInput) nameInput.focus(); return; }
    delete enhancementDraft[id]; // before update(): notify() re-renders synchronously, inside this call
    store.update((d) => installEnhancement(d, id, { name, type: typeInput ? typeInput.value : undefined, strain: strainInput ? strainInput.value : 1 }));
    return toast('Enhancement installed');
  }
  const enhRemove = hit('[data-enhancement-remove]');
  if (enhRemove) {
    const [entityId, enId] = enhRemove.dataset.enhancementRemove.split('::');
    store.update((d) => removeEnhancement(d, entityId, enId));
    return;
  }
  // The header's 🎲 rolls the Augmentation > Cyberware Concept oracle table
  // straight into the name draft instead of the generic toast+Journal flow
  // (docs/adr/next-request.md, 2026-07-06) — each roll overwrites the draft
  // until "Install" is clicked, same "oracle rolls flavor, the GM commits
  // the real record" split as before, just landing in the field instead of
  // requiring a copy/paste from the Journal.
  const enhRoll = hit('[data-roll-into-enhancement]');
  if (enhRoll) {
    const id = enhRoll.dataset.rollIntoEnhancement;
    // toJournal: false — this is a cheap, repeatable trial roll into the
    // draft field, not a committed event; only Install leaves a lasting
    // record, so re-rolling several times before installing doesn't spam
    // the Journal with rejected drafts.
    let text = '';
    store.update((d) => { const r = rollOracle(d, ['Augmentation', 'Cyberware Concept'], { toJournal: false }); text = r.text; return r.campaign; });
    enhancementDraft[id] = text.split('\n').slice(-1)[0];
    return renderDrawerBody();
  }

  // --- documents: open (viewer tabs), rename, tags ---------------------------
  const docOpen = hit('[data-doc-open]');
  if (docOpen) {
    ev.preventDefault(); // see data-open-entity's identical guard above
    // Ctrl/Cmd+Click on an inline @mention (not the Documents drawer's own
    // card links, which share data-doc-open but carry no data-mention-page)
    // edits the mention's page instead of navigating (ADR 0018) — the
    // mention's tooltip (mentionEditor.js's mentionTitle) describes exactly
    // this, fixing the previously-shipped, confirmed-non-functional tooltip
    // that had the two gestures backwards.
    if (docOpen.classList.contains('mention-link') && (ev.ctrlKey || ev.metaKey)) {
      editMentionPage(docOpen);
      return;
    }
    if (docOpen.dataset.docOpen.startsWith('lib:')) {
      const entry = getDocument(store.get(), docOpen.dataset.docOpen.slice(4));
      if (entry && entry.kind !== 'file') { toast('Text notes open inline below — not a PDF file.'); return; }
    }
    const page = docOpen.dataset.docOpenPage ? Number(docOpen.dataset.docOpenPage) : undefined;
    store.update((d) => openDocumentTab(d, docOpen.dataset.docOpen, page));
    return;
  }
  const tabClose = hit('[data-doc-viewer-tab-close]');
  if (tabClose) { store.update((d) => closeDocumentTab(d, tabClose.dataset.docViewerTabClose)); return; }
  const tabSwitch = hit('[data-doc-viewer-tab]');
  if (tabSwitch) { store.update((d) => setActiveDocumentTab(d, tabSwitch.dataset.docViewerTab)); return; }
  // The ✎ button both opens the inline rename input (first click) and saves
  // it (a second click while already editing) — previously a second click
  // just no-op'd (docRenameOpen already had the id), so the only way to
  // actually save was to blur/Tab/Enter the input; clicking ✎ again looked
  // like it should do the same thing and silently didn't.
  const docRename = hit('[data-doc-rename]');
  if (docRename) {
    const id = docRename.dataset.docRename;
    if (docRenameOpen.has(id)) {
      const input = root.querySelector(`[data-doc-rename-input="${id}"]`);
      docRenameOpen.delete(id);
      if (input && input.value.trim()) return store.update((d) => renameDocument(d, id, input.value.trim()));
      return renderDrawerBody();
    }
    docRenameOpen.add(id);
    return renderDrawerBody();
  }
  const refRename = hit('[data-ref-rename]');
  if (refRename) {
    const key = refRename.dataset.refRename;
    if (docRenameOpen.has(key)) {
      const input = root.querySelector(`[data-ref-rename-input="${key}"]`);
      docRenameOpen.delete(key);
      if (input && input.value.trim()) return store.update((d) => renameRefDocument(d, key, input.value.trim()));
      return renderDrawerBody();
    }
    docRenameOpen.add(key);
    return renderDrawerBody();
  }
  const refDelete = hit('[data-ref-delete]');
  if (refDelete) {
    const key = refDelete.dataset.refDelete;
    const current = listReferenceDocuments(store.get()).find((r) => r.key === key);
    if (window.confirm(`Remove "${current ? current.title : 'this entry'}" from the Reference Library? The bundled file itself is untouched — this only hides it from the list.`)) {
      store.update((d) => hideRefDocument(d, key));
      toast('Removed from Reference Library');
    }
    return;
  }
  const tagToggle = hit('[data-doc-tag-toggle]');
  if (tagToggle) {
    const key = tagToggle.dataset.docTagToggle;
    if (docTagEditorOpen.has(key)) docTagEditorOpen.delete(key); else docTagEditorOpen.add(key);
    return renderDrawerBody();
  }
  const tagRemove = hit('[data-doc-tag-remove]');
  if (tagRemove) {
    const [id, tag] = tagRemove.dataset.docTagRemove.split('::');
    return store.update((d) => removeDocumentTag(d, id, tag));
  }
  const refTagRemove = hit('[data-ref-tag-remove]');
  if (refTagRemove) {
    const [key, tag] = refTagRemove.dataset.refTagRemove.split('::');
    return store.update((d) => removeRefDocumentTag(d, key, tag));
  }
  const tagFilter = hit('[data-doc-tag-filter]');
  if (tagFilter) {
    const tag = tagFilter.dataset.docTagFilter;
    if (docTagFilters.has(tag)) docTagFilters.delete(tag); else docTagFilters.add(tag);
    return renderDrawerBody();
  }
  if (hit('[data-doc-tag-list-toggle]')) { docTagListOpen = !docTagListOpen; return renderDrawerBody(); }

  // --- Gallery (Phase 11, docs/adr/0021-gallery.md) — same shape as Documents' tag filter/list/delete just above ---
  const galleryTagRemove = hit('[data-gallery-tag-remove]');
  if (galleryTagRemove) {
    const [id, tag] = galleryTagRemove.dataset.galleryTagRemove.split('::');
    return store.update((d) => removeGalleryTag(d, id, tag));
  }
  const galleryTagFilter = hit('[data-gallery-tag-filter]');
  if (galleryTagFilter) {
    const tag = galleryTagFilter.dataset.galleryTagFilter;
    if (galleryTagFilters.has(tag)) galleryTagFilters.delete(tag); else galleryTagFilters.add(tag);
    return renderDrawerBody();
  }
  if (hit('[data-gallery-tag-list-toggle]')) { galleryTagListOpen = !galleryTagListOpen; return renderDrawerBody(); }
  const galleryDelete = hit('[data-gallery-delete]');
  if (galleryDelete) {
    if (window.confirm('Delete this image? This cannot be undone.')) store.update((d) => removeGalleryImage(d, galleryDelete.dataset.galleryDelete));
    return;
  }
  if (hit('[data-gallery-upload-confirm]')) {
    const draft = galleryUploadDraft;
    if (!draft) return;
    const nameInput = root.querySelector('[data-gallery-upload-name]');
    const name = ((nameInput && nameInput.value) || draft.name || '').trim() || 'Untitled';
    galleryUploadDraft = null;
    store.update((d) => addGalleryImages(d, { entityId: null, lockedTag: null, title: name, mimeType: draft.mimeType, thumbDataUrl: draft.thumbDataUrl, originalDataUrl: draft.originalDataUrl }).campaign);
    return toast('Image added');
  }
  if (hit('[data-gallery-upload-cancel]')) { galleryUploadDraft = null; return renderDrawerBody(); }

  // --- settings: Bestiary statblock templates -------------------------------
  const tplSystemAdd = hit('[data-tpl-system-add]');
  if (tplSystemAdd) {
    openInlinePrompt('template-system-add', { label: 'New game system name', placeholder: 'e.g. D&D 5e', anchorRect: tplSystemAdd.getBoundingClientRect() });
    return;
  }
  const tplFieldAdd = hit('[data-tpl-field-add]');
  if (tplFieldAdd) return store.update((d) => addTemplateField(d, tplFieldAdd.dataset.tplFieldAdd));
  const tplFieldRemove = hit('[data-tpl-field-remove]');
  if (tplFieldRemove) {
    const [sys, idx] = tplFieldRemove.dataset.tplFieldRemove.split('::');
    return store.update((d) => removeTemplateField(d, sys, Number(idx)));
  }
  const tplFieldUp = hit('[data-tpl-field-up]');
  if (tplFieldUp) {
    const [sys, idx] = tplFieldUp.dataset.tplFieldUp.split('::');
    return store.update((d) => moveTemplateField(d, sys, Number(idx), -1));
  }
  const tplFieldDown = hit('[data-tpl-field-down]');
  if (tplFieldDown) {
    const [sys, idx] = tplFieldDown.dataset.tplFieldDown.split('::');
    return store.update((d) => moveTemplateField(d, sys, Number(idx), 1));
  }

  const threadAdd = hit('[data-thread-add]');
  if (threadAdd) {
    openInlinePrompt('thread-add', { label: 'Thread name', placeholder: 'e.g. Find the medic', anchorRect: threadAdd.getBoundingClientRect() });
    return;
  }
  const expeditionAdd = hit('[data-expedition-add]');
  if (expeditionAdd) {
    openInlinePrompt('expedition-add', { label: 'Expedition name', placeholder: 'e.g. Survey the ridge line', anchorRect: expeditionAdd.getBoundingClientRect() });
    return;
  }
  const adv = hit('[data-thread-adv]');
  if (adv) return store.update((d) => advanceThread(d, adv.dataset.threadAdv, 1));
  const back = hit('[data-thread-back]');
  if (back) return store.update((d) => advanceThread(d, back.dataset.threadBack, -1));
  const tdel = hit('[data-thread-del]');
  if (tdel) return store.update((d) => removeThread(d, tdel.dataset.threadDel));

  const docSave = hit('[data-doc-save]');
  if (docSave) {
    const id = docSave.dataset.docSave;
    const ta = root.querySelector(`[data-doc-content="${id}"]`);
    if (ta) { store.update((d) => updateDocument(d, id, { content: serializeMentionEditor(ta) })); toast('Document saved'); }
    return;
  }
  const docDel = hit('[data-doc-delete]');
  if (docDel) {
    if (window.confirm('Delete this document?')) {
      store.update((d) => removeDocument(d, docDel.dataset.docDelete));
      toast('Document deleted');
    }
    return;
  }

  if (hit('[data-export-campaign]')) return download(`gmatlas-${stamp()}.json`, store.export());
  if (hit('[data-export-journal]')) return exportJournal();
  if (hit('[data-generate-mission]')) {
    store.update((d) => addNote(d, formatMission(generateMission(d)), 'Mission'));
    return toast('Mission generated');
  }
  if (hit('[data-hostile-locations-import]')) {
    let createdCount = 0;
    store.update((d) => {
      const r = importHostileLocations(d);
      createdCount = r.createdIds.length;
      return r.campaign;
    });
    return toast(createdCount ? `${createdCount} location(s) imported` : 'Already up to date — nothing new to import');
  }
  if (hit('[data-advance-faction-turns]')) {
    let rumorCount = 0;
    store.update((d) => {
      const r = advanceFactionTurns(d);
      rumorCount = r.rumors.length;
      return addNote(r.campaign, formatFactionTurnRumors(r.rumors), 'Faction Turn');
    });
    return toast(rumorCount ? `${rumorCount} faction(s) acted` : 'No factions tracked yet');
  }
  if (hit('[data-generate-creature]')) {
    store.update((d) => addNote(d, formatCreatureConcept(generateCreatureConcept(d)), 'Creature Concept'));
    return toast('Creature concept generated');
  }
  if (hit('[data-generate-site]')) {
    store.update((d) => addNote(d, formatSiteConcept(generateSiteConcept(d)), 'Site Concept'));
    return toast('Site concept generated');
  }
  if (hit('[data-generate-seed]')) {
    store.update((d) => addNote(d, formatAdventureSeed(generateAdventureSeed(d)), 'Adventure Seed'));
    return toast('Adventure seed generated');
  }
  if (hit('[data-new-campaign]')) return confirmNewCampaign();
  if (hit('[data-bind-file]')) return store.bindFile().then(() => toast('Save file bound')).catch(() => {});
  if (hit('[data-restore-backup]')) {
    if (!window.confirm('Restore the last backup? This replaces the current campaign with the previous save — export the current one first if you want to keep it.')) return;
    store.restoreBackup().then((result) => toast(result.ok ? 'Restored last backup' : `Couldn't restore backup — ${result.error && result.error.message}`));
    return;
  }
  // --- Game Mechanics Index (docs/adr/0014-mechanics-index-pdfjs.md) ---
  const mechScan = hit('[data-mechanics-scan]');
  if (mechScan) {
    mechanicsScanning = true;
    renderDrawerBody();
    scanMechanicsIndex(store)
      .then((entries) => { mechanicsScanning = false; renderDrawerBody(); toast(`Mechanics Index: ${entries.length} term(s) found`); })
      .catch((err) => { mechanicsScanning = false; renderDrawerBody(); toast(`Mechanics scan failed — ${err.message}`); });
    return;
  }
  // --- Reference Table of Contents (docs/adr/0020) ---
  const tocScan = hit('[data-toc-scan]');
  if (tocScan) {
    tocScanning = true;
    renderDrawerBody();
    scanAndGenerateToc(store)
      .then(({ generated, skipped }) => { tocScanning = false; renderDrawerBody(); toast(`Table of Contents: ${generated} document(s) generated${skipped ? `, ${skipped} skipped (no bookmarks)` : ''}`); })
      .catch((err) => { tocScanning = false; renderDrawerBody(); toast(`Table of Contents scan failed — ${err.message}`); });
    return;
  }
}

// Executes a statblock field's configured dice model (see ROLL_METHODS in
// drawers/index.js) and files the result to the Journal — shared by the
// track badge's double-click-to-roll and the attribute label's click-to-
// roll, so both entry points resolve identically. A field with
// rollMethod:'none' is silently a no-op (callers already gate on rollability
// via their own UI, this is just the last-line guard).
function performFieldRoll(f, label) {
  const method = f.rollMethod || 'none';
  if (method === 'none') return;
  if (method === 'flat') {
    const r = rollFlat(Number(f.value) || 0, { target: f.target || 6 });
    store.update((d) => logRoll(d, formatFlatRollText(label, r)));
    diceRollResult = { label, method, r };
    return renderDiceRollOverlay();
  }
  if (method === 'traveller') {
    const r = rollTraveller(Number(f.value) || 0, { target: f.target || 8 });
    store.update((d) => logRoll(d, formatTravellerRollText(label, r)));
    diceRollResult = { label, method, r };
    return renderDiceRollOverlay();
  }
  const r = rollAction(Number(f.value) || 0);
  store.update((d) => logRoll(d, formatRollText(label, r)));
  diceRollResult = { label, method, r };
  renderDiceRollOverlay();
}

// Escape: close whatever's topmost (search overlay > active drawer tab >
// mobile/tablet Co-Pilot sheet), always active even while a field has
// focus — the whole point is letting you back out of one. Ctrl/Cmd+K:
// open Universal Search from anywhere, matching the convention comparable
// tools already use for a search/command action.
function onKeydown(ev) {
  // Generic inline text-entry prompt (see openInlinePrompt et al.): Enter
  // submits from EITHER field when there are two (Link's description/URL),
  // Escape cancels from either — it has no <form> element to give Enter a
  // native effect, same reasoning as every other inline-form field below.
  if (ev.target.closest('[data-inline-prompt-field]')) {
    if (ev.key === 'Enter') { ev.preventDefault(); commitInlinePrompt(); return; }
    if (ev.key === 'Escape') { ev.preventDefault(); closeInlinePrompt(); return; }
  }

  // Tab-indent inside a rich-text field ("USER CHANGES" batch): a
  // contenteditable's default Tab behavior moves focus to the next control
  // (unhelpful here — a GM writing an indented list/note wants a literal
  // tab, the way any real text editor's text area behaves), so it's
  // overridden the same way the mention-suggest popup below already
  // overrides Up/Down/Enter/Escape's defaults in this same listener.
  const tabField = ev.target.closest('.mention-editor');
  if (tabField && ev.key === 'Tab' && !ev.shiftKey) {
    ev.preventDefault();
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      const node = document.createTextNode('\t');
      range.deleteContents();
      range.insertNode(node);
      const after = document.createRange();
      after.setStartAfter(node);
      after.collapse(true);
      sel.removeAllRanges();
      sel.addRange(after);
    }
    return;
  }

  // @-mention suggestion popup: Up/Down move the highlight, Enter picks it,
  // Escape dismisses without inserting anything — takes priority over
  // Escape's other meanings below while the popup for THIS field is open.
  if (mentionSuggest && ev.target === mentionSuggest.field) {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); mentionSuggest.activeIndex = (mentionSuggest.activeIndex + 1) % mentionSuggest.items.length; renderMentionSuggest(); return; }
    if (ev.key === 'ArrowUp') { ev.preventDefault(); mentionSuggest.activeIndex = (mentionSuggest.activeIndex - 1 + mentionSuggest.items.length) % mentionSuggest.items.length; renderMentionSuggest(); return; }
    if (ev.key === 'Enter') { ev.preventDefault(); chooseMentionSuggestItem(mentionSuggest.activeIndex); return; }
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); closeMentionSuggest(); return; }
  }

  // Doc/ref rename inputs and every tag input (entity/doc/ref) commit on
  // blur (see onChange) — Enter has no native effect on a bare <input>
  // outside a <form>, so it's wired here to trigger that same blur instead
  // of duplicating the commit logic.
  const commitOnEnterTarget = ev.target.closest('[data-doc-rename-input], [data-ref-rename-input], [data-doc-tag-input], [data-ref-tag-input], [data-entity-tag-input], [data-oracle-tag-input], [data-guide-rename-input], [data-guide-title-input]');
  if (commitOnEnterTarget && ev.key === 'Enter') { ev.preventDefault(); commitOnEnterTarget.blur(); return; }

  // Party Tracker creation form: Enter in the name field submits (same
  // click the visible Create button fires), Escape cancels without
  // creating — the form has no <form> element to give Enter a native effect.
  const trackerDraftName = ev.target.closest('[data-party-tracker-draft-name]');
  if (trackerDraftName) {
    if (ev.key === 'Enter') { ev.preventDefault(); const btn = root.querySelector('[data-party-tracker-create]'); if (btn) btn.click(); return; }
    if (ev.key === 'Escape') { ev.preventDefault(); partyTrackerAddOpen = false; return renderDrawerBody(); }
  }
  const renameInput = ev.target.closest('[data-doc-rename-input], [data-ref-rename-input]');
  if (renameInput && ev.key === 'Escape') {
    ev.preventDefault();
    const key = renameInput.dataset.docRenameInput || renameInput.dataset.refRenameInput;
    docRenameOpen.delete(key);
    return renderDrawerBody();
  }
  const guideRenameInputKey = ev.target.closest('[data-guide-rename-input]');
  if (guideRenameInputKey && ev.key === 'Escape') {
    ev.preventDefault();
    guideRenameOpen.delete(guideRenameInputKey.dataset.guideRenameInput);
    return renderDrawerBody();
  }

  if (ev.key === 'Escape') {
    if (diceRollResult) { diceRollResult = null; return renderDiceRollOverlay(); }
    if (searchOpen) {
      searchOpen = false; searchQuery = '';
      const inp = root.querySelector('[data-search-input]'); if (inp) inp.value = '';
      return renderSearchOverlay();
    }
    if (activeDrawer) return closeDrawerTab(activeDrawer);
    if (copilotOpen) { copilotOpen = false; return render(); }
    return;
  }
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') {
    ev.preventDefault();
    searchOpen = true;
    renderSearchOverlay();
    const inp = root.querySelector('[data-search-input]'); if (inp) inp.focus();
  }
}

// Crew-Link-style "double-click a stat to roll" — track fields only
// (attribute fields roll via their label click, see onClick's
// data-statblock-roll-label handler above). A field with rollMethod:'none'
// (a plain progress bar, e.g. Health) never gets a roll button in the first
// place — see trackRow() in drawers/index.js.
function onDblClick(ev) {
  const rollTarget = ev.target.closest('[data-statblock-roll]');
  if (!rollTarget) return;
  ev.preventDefault();
  const [gi, fi] = rollTarget.dataset.statblockRoll.split('::').map(Number);
  const active = store.get().entities.activeId;
  const e = getEntity(store.get(), active);
  const group = e && e.statblocks && e.statblocks[gi];
  const f = group && group.fields[fi];
  if (!f || !f.track) return;
  performFieldRoll(f, `${e.name || 'Unnamed'} — ${f.key || 'Stat'}`);
}

function onChange(ev) {
  const t = ev.target;
  const whereTagSelect = t.closest('[data-where-tag-select]');
  if (whereTagSelect) { whereLocationTagFilter = whereTagSelect.value || null; return render(); }
  const whoTagSelect = t.closest('[data-who-tag-select]');
  if (whoTagSelect) { whoTagFilter = whoTagSelect.value || null; return render(); }

  // --- Planetfall Grid Battlemap (Phase 11, docs/adr/0023) ------------------
  const bmRename = t.closest('[data-battlemap-rename]');
  if (bmRename) return store.update((d) => renameBattlemap(d, bmRename.dataset.battlemapRename, t.value));
  const bmBgSelect = t.closest('[data-battlemap-bg-select]');
  if (bmBgSelect) return store.update((d) => setBattlemapBackground(d, bmBgSelect.dataset.battlemapBgSelect, t.value || null));
  const bmGridToggle = t.closest('[data-battlemap-grid-toggle]');
  if (bmGridToggle) return store.update((d) => setBattlemapGrid(d, bmGridToggle.dataset.battlemapGridToggle, { enabled: t.checked }));
  const bmGridSize = t.closest('[data-battlemap-grid-size]');
  if (bmGridSize) return store.update((d) => setBattlemapGrid(d, bmGridSize.dataset.battlemapGridSize, { size: Number(t.value) }));
  // Background upload — the same client-side resize pipeline (ui/imageResize.js)
  // the entity-photo upload already uses, just a new call site with no
  // entityId: a battlemap background isn't owned by any one entity. A
  // larger maxDim (1600, vs. an entity thumbnail's 256) since this is meant
  // to actually be looked at full-drawer-width, not shown as a small photo.
  const bmBgUpload = t.closest('[data-battlemap-bg-upload]');
  if (bmBgUpload) {
    const mapId = bmBgUpload.dataset.battlemapBgUpload;
    const file = (t.files || [])[0];
    if (!file) return;
    loadAndMaybeResize(file, 1600)
      .then(({ thumbDataUrl, originalDataUrl }) => {
        store.update((d) => {
          const r = addGalleryImages(d, { entityId: null, lockedTag: 'battlemap', title: file.name, mimeType: file.type, thumbDataUrl, originalDataUrl });
          return setBattlemapBackground(r.campaign, mapId, r.thumbnailId);
        });
        toast('Background added');
      })
      .catch((err) => toast(`Couldn't add background — ${err.message}`));
    return;
  }
  const sceneField = t.closest('[data-scene-field]');
  if (sceneField) {
    const [sceneId, field] = sceneField.dataset.sceneField.split('::');
    return store.update((d) => updateSceneField(d, sceneId, field, t.value));
  }
  const ctx = t.closest('[data-ctx]');
  if (ctx) {
    // The free-text fields (situation/summary) are contenteditable now, not
    // <textarea> — they have no 'change' event at all, so they commit via
    // onFocusOut instead. Only how.activity's <select> reaches here today.
    const [key, field] = ctx.dataset.ctx.split('.');
    return store.update((d) => patchContext(d, key, { [field]: t.value }));
  }

  // Cast header's "Generate…" select (replaces the old row of "+ Type" chips
  // — a stateless picker, not a bound field, so it's reset back to the
  // placeholder after every use to fire 'change' again on a repeat pick of
  // the same type). A plain type creates a blank entity of that type; the
  // "🎲 NPC (rolled)" option keeps the oracle-chain NPC generator reachable
  // from the same control instead of a second separate button.
  const genSelect = t.closest('[data-entity-generate]');
  if (genSelect) {
    const value = genSelect.value;
    genSelect.value = '';
    if (!value) return;
    if (value === 'catalog-item') {
      catalogPickerOpen = true;
      return renderDrawerBody();
    }
    openDrawerTab('entity-detail');
    focusInspectorNameNextRender = true;
    if (value === 'generate-npc') {
      let name = '';
      store.update((d) => { const r = generateNpc(d); name = r.id && getEntity(r.campaign, r.id) ? getEntity(r.campaign, r.id).name : ''; return r.campaign; });
      return toast(name ? `Generated ${name}` : 'NPC generated');
    }
    store.update((d) => createEntity(d, { type: value }).campaign);
    return toast('Entity added');
  }

  // Entity tag input — same auto-commit-on-change UX as the Documents
  // drawer's tag fields (see docTagInput/refTagInput below): picking a
  // datalist suggestion or typing a new tag and blurring both fire 'change'.
  const entTagInput = t.closest('[data-entity-tag-input]');
  if (entTagInput) {
    const active = store.get().entities.activeId;
    const value = t.value.trim();
    t.value = '';
    if (value) return store.update((d) => addEntityTag(d, active, value));
    return;
  }

  // Oracle tag input (docs/adr/0016) — same auto-commit-on-change shape.
  const oracleTagInput = t.closest('[data-oracle-tag-input]');
  if (oracleTagInput) {
    const key = oracleTagInput.dataset.oracleTagInput;
    const value = t.value.trim();
    t.value = '';
    if (value) return store.update((d) => addOracleTag(d, key.split('>'), value));
    return;
  }

  // Inline rename inputs (doc-rename-input/ref-rename-input) replace the old
  // window.prompt() flow — 'change' fires on blur, which is also what Tab
  // and (via onKeydown's explicit .blur() call below) Enter trigger.
  const docRenameInput = t.closest('[data-doc-rename-input]');
  if (docRenameInput) {
    const id = docRenameInput.dataset.docRenameInput;
    docRenameOpen.delete(id);
    if (t.value.trim()) return store.update((d) => renameDocument(d, id, t.value.trim()));
    return renderDrawerBody();
  }
  // Guide tree/active-title rename input (docs/adr/0017) — same
  // commit-on-blur shape as doc-rename-input above.
  const guideRenameInput = t.closest('[data-guide-rename-input]');
  if (guideRenameInput) {
    const id = guideRenameInput.dataset.guideRenameInput;
    guideRenameOpen.delete(id);
    if (t.value.trim()) return store.update((d) => renameGuideDoc(d, id, t.value.trim()));
    return renderDrawerBody();
  }
  const refRenameInput = t.closest('[data-ref-rename-input]');
  if (refRenameInput) {
    const key = refRenameInput.dataset.refRenameInput;
    docRenameOpen.delete(key);
    if (t.value.trim()) return store.update((d) => renameRefDocument(d, key, t.value.trim()));
    return renderDrawerBody();
  }

  // Doc tag inputs commit themselves — no separate "+ Add" click needed.
  // Picking an existing tag from the datalist fires 'change' immediately
  // (a discrete selection, unlike a keystroke); typing a new one and
  // tabbing/Enter-ing away (see onKeydown) fires it on blur.
  const docTagInput = t.closest('[data-doc-tag-input]');
  if (docTagInput) {
    const id = docTagInput.dataset.docTagInput;
    const value = t.value.trim();
    t.value = '';
    if (value) return store.update((d) => addDocumentTag(d, id, value));
    return;
  }
  const refTagInput = t.closest('[data-ref-tag-input]');
  if (refTagInput) {
    const key = refTagInput.dataset.refTagInput;
    const value = t.value.trim();
    t.value = '';
    if (value) return store.update((d) => addRefDocumentTag(d, key, value));
    return;
  }

  const ef = t.closest('[data-entity-field]');
  if (ef) {
    const active = store.get().entities.activeId;
    const field = ef.dataset.entityField;
    if (field === 'type') {
      const current = getEntity(store.get(), active);
      const from = current ? (TYPE_LABEL[current.type] || current.type) : '';
      const to = TYPE_LABEL[t.value] || t.value;
      if (current && current.type !== t.value && !window.confirm(`Change entity type from ${from} to ${to}?`)) {
        t.value = current.type;
        return;
      }
    }
    // World Profile (docs/adr/0026): `gasGiant` is the first
    // checkbox-backed data-entity-field, hence the type check. `bases`
    // and `tradeCodes` are dropdown-add + chip-remove instead of plain
    // fields (data-entity-base-add/-remove, data-entity-tradecode-add/
    // -remove below), so neither reaches this generic path anymore.
    const value = t.type === 'checkbox' ? t.checked : t.value;
    return store.update((d) => updateEntity(d, active, { [field]: value }));
  }

  const tradeCodeAdd = t.closest('[data-entity-tradecode-add]');
  if (tradeCodeAdd) {
    const id = tradeCodeAdd.dataset.entityTradecodeAdd;
    const code = t.value;
    if (code) store.update((d) => addLocationTradeCode(d, id, code));
    t.value = '';
    return;
  }
  const baseAdd = t.closest('[data-entity-base-add]');
  if (baseAdd) {
    const id = baseAdd.dataset.entityBaseAdd;
    const name = t.value;
    if (name) store.update((d) => addLocationBase(d, id, name));
    t.value = '';
    return;
  }

  const relLabel = t.closest('[data-entity-rel-label]');
  if (relLabel) { const active = store.get().entities.activeId; return store.update((d) => updateRelationshipLabel(d, active, relLabel.dataset.entityRelLabel, t.value)); }

  const relType = t.closest('[data-entity-rel-type]');
  if (relType) { const active = store.get().entities.activeId; return store.update((d) => updateRelationshipType(d, active, relType.dataset.entityRelType, t.value)); }

  const relStrength = t.closest('[data-entity-rel-strength]');
  if (relStrength) { const active = store.get().entities.activeId; return store.update((d) => updateRelationshipStrength(d, active, relStrength.dataset.entityRelStrength, t.value)); }

  const factionStat = t.closest('[data-faction-stat]');
  if (factionStat) {
    const [factionId, stat] = factionStat.dataset.factionStat.split('::');
    return store.update((d) => setFactionStat(d, factionId, stat, t.value));
  }

  const oev = t.closest('[data-oracle-entry-value]');
  if (oev) {
    const [key, idx] = oev.dataset.oracleEntryValue.split('::');
    return store.update((d) => updateOracleEntry(d, key.split('>'), Number(idx), t.value));
  }

  const sval = t.closest('[data-statblock-val]');
  if (sval) {
    const [gi, fi] = sval.dataset.statblockVal.split('::').map(Number);
    const active = store.get().entities.activeId;
    return store.update((d) => setEntityStatblockField(d, active, gi, fi, { value: t.value }));
  }
  const sattr = t.closest('[data-statblock-attr-val]');
  if (sattr) {
    const [gi, fi] = sattr.dataset.statblockAttrVal.split('::').map(Number);
    const active = store.get().entities.activeId;
    return store.update((d) => setEntityStatblockAttributeValue(d, active, gi, fi, t.value));
  }

  // --- party trackers --- (kind/difficulty/max are creation-time-only —
  // see domain/party.js's updatePartyTracker — so only name and a counter's
  // raw value are ever patched here after creation)
  const trkName = t.closest('[data-party-tracker-name]');
  if (trkName) return store.update((d) => updatePartyTracker(d, trkName.dataset.partyTrackerName, { name: t.value }));
  const trkValue = t.closest('[data-party-tracker-value]');
  if (trkValue) return store.update((d) => updatePartyTracker(d, trkValue.dataset.partyTrackerValue, { value: Number(t.value) || 0 }));
  const trkDraftKind = t.closest('[data-party-tracker-draft-kind]');
  if (trkDraftKind) { partyTrackerDraftKind = trkDraftKind.value; return renderDrawerBody(); }

  // --- colony ---
  const colonyField = t.closest('[data-colony-field]');
  if (colonyField) return store.update((d) => setColonyField(d, colonyField.dataset.colonyField, t.value));
  const crewField = t.closest('[data-colony-crew-field]');
  if (crewField) {
    const [id, field] = crewField.dataset.colonyCrewField.split('::');
    return store.update((d) => updateCrewRow(d, id, { [field]: t.value }));
  }

  // --- trade ---
  const tradeLoc = t.closest('[data-trade-location]');
  if (tradeLoc) { tradeLocationId = tradeLoc.value; return renderDrawerBody(); }
  const tradeDial = t.closest('[data-trade-dial]');
  if (tradeDial) {
    const [locId, commodityId, field] = tradeDial.dataset.tradeDial.split('::');
    return store.update((d) => setMarketDial(d, locId, commodityId, field, Number(t.value)));
  }

  // --- settings: Bestiary statblock template field edits ---
  const tplKey = t.closest('[data-tpl-field-key]');
  if (tplKey) { const [sys, idx] = tplKey.dataset.tplFieldKey.split('::'); return store.update((d) => updateTemplateField(d, sys, Number(idx), { key: t.value })); }
  const tplKind = t.closest('[data-tpl-field-kind]');
  if (tplKind) { const [sys, idx] = tplKind.dataset.tplFieldKind.split('::'); return store.update((d) => updateTemplateField(d, sys, Number(idx), { kind: t.value })); }
  const tplRoll = t.closest('[data-tpl-field-rollmethod]');
  if (tplRoll) { const [sys, idx] = tplRoll.dataset.tplFieldRollmethod.split('::'); return store.update((d) => updateTemplateField(d, sys, Number(idx), { rollMethod: t.value })); }
  const tplFormat = t.closest('[data-tpl-field-format]');
  if (tplFormat) { const [sys, idx] = tplFormat.dataset.tplFieldFormat.split('::'); return store.update((d) => updateTemplateField(d, sys, Number(idx), { format: t.value })); }

  const threadStatus = t.closest('[data-thread-status]');
  if (threadStatus) return store.update((d) => setThreadStatus(d, threadStatus.dataset.threadStatus, t.value));
  const threadPriority = t.closest('[data-thread-priority]');
  if (threadPriority) return store.update((d) => setThreadPriority(d, threadPriority.dataset.threadPriority, t.value));
  const tplMax = t.closest('[data-tpl-field-max]');
  if (tplMax) { const [sys, idx] = tplMax.dataset.tplFieldMax.split('::'); return store.update((d) => updateTemplateField(d, sys, Number(idx), { max: Number(t.value) || 5 })); }
  const tplTarget = t.closest('[data-tpl-field-target]');
  if (tplTarget) { const [sys, idx] = tplTarget.dataset.tplFieldTarget.split('::'); return store.update((d) => updateTemplateField(d, sys, Number(idx), { target: Number(t.value) || 6 })); }

  const num = t.closest('[data-ctx-num]');
  if (num) { const [key, field] = num.dataset.ctxNum.split('.'); return store.update((d) => patchContext(d, key, { [field]: Number(t.value) })); }

  const expDial = t.closest('[data-expedition-dial]');
  if (expDial) { const [threadId, field] = expDial.dataset.expeditionDial.split('::'); return store.update((d) => setExpeditionDial(d, threadId, field, Number(t.value))); }

  if (t.closest('[data-campaign-title-input]')) return store.update((d) => { d.meta.title = t.value; return d; });
  const guideTitleInput = t.closest('[data-guide-title-input]');
  if (guideTitleInput) { const id = getActiveGuideDoc(store.get()).id; if (t.value.trim()) return store.update((d) => renameGuideDoc(d, id, t.value.trim())); return; }
  if (t.closest('[data-genre-input]')) return store.update((d) => { d.settings.genre = t.value; return d; });
  if (t.closest('[data-genre-pack-select]')) {
    store.update((d) => { d.settings.genrePack = t.value; return d; });
    return toast(`Genre Pack set to ${t.value}`);
  }
  if (t.closest('[data-settings-stat-ruleset]')) return store.update((d) => { d.settings.statRuleset = t.value; return d; });
  if (t.closest('[data-trade-economy-model-select]')) {
    store.update((d) => { d.settings.tradeEconomyModel = t.value; return d; });
    return toast(`Trade Economy Model set to ${t.value}`);
  }

  if (t.closest('[data-import-campaign]')) {
    const file = t.files && t.files[0];
    if (!file) return;
    const reader = new FileReader();
    // store.import() is async (IndexedDB) — an async function's own thrown
    // errors become a rejected Promise, not a synchronous throw, so this
    // must await it inside the try, not just call it.
    reader.onload = async () => { try { await store.import(reader.result); toast('Campaign imported'); } catch (e) { toast('Import failed'); } };
    reader.readAsText(file);
    return;
  }

  // Entity photo upload (Phase 11, docs/adr/0021-gallery.md) — resizes
  // client-side (ui/imageResize.js) before ever reaching the store, so a
  // huge phone photo never gets embedded twice (once as the thumbnail,
  // once as a redundant "original" identical to it).
  const photoUpload = t.closest('[data-entity-photo-upload]');
  if (photoUpload) {
    const entityId = photoUpload.dataset.entityPhotoUpload;
    const file = (t.files || [])[0];
    if (!file) return;
    const e = getEntity(store.get(), entityId);
    loadAndMaybeResize(file, 256)
      .then(({ thumbDataUrl, originalDataUrl }) => {
        store.update((d) => addGalleryImages(d, { entityId, lockedTag: e ? e.type : null, title: e ? e.name : '', mimeType: file.type, thumbDataUrl, originalDataUrl }).campaign);
        toast('Photo added');
      })
      .catch((err) => toast(`Couldn't add photo — ${err.message}`));
    return;
  }

  // Gallery's own "+ Upload" (as opposed to an entity's "+ Photo" above) —
  // same resize pipeline, but no entityId/lockedTag and no immediate
  // commit: the resized result becomes a pending draft, and the inline
  // form it opens (drawers/index.js's gallery()) is what actually calls
  // addGalleryImages, once the GM confirms a friendly name.
  const galleryUploadSelect = t.closest('[data-gallery-upload-select]');
  if (galleryUploadSelect) {
    const file = (t.files || [])[0];
    if (!file) return;
    loadAndMaybeResize(file, 256)
      .then(({ thumbDataUrl, originalDataUrl }) => {
        galleryUploadDraft = { thumbDataUrl, originalDataUrl, mimeType: file.type, name: titleFromFilename(file.name) };
        renderDrawerBody();
      })
      .catch((err) => toast(`Couldn't read image — ${err.message}`));
    return;
  }

  if (t.closest('[data-doc-upload]')) {
    const files = Array.from(t.files || []);
    if (!files.length) return;
    let done = 0;
    const total = files.length;
    for (const file of files) {
      // localStorage's shared per-origin quota (commonly 5-10MB, holding the
      // WHOLE campaign, not just this file) can't reliably hold a large
      // rulebook PDF base64-encoded — this used to fail silently (store.js's
      // persist() only logged a console.warn), so an upload like this could
      // look like it worked and then be gone on the next reload. Large,
      // static rulebooks belong in assets/docs/ (rebuilt into the
      // size-unlimited Reference Library) instead of embedded here.
      if (file.size > MAX_DOC_UPLOAD_BYTES) {
        done += 1;
        toast(`"${file.name}" (${formatBytes(file.size)}) is too big to store this way — add rulebook-sized PDFs to assets/docs/ and rebuild instead.`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          // The display title is derived from the filename (extension/
          // hyphens stripped, ALL-CAPS segments proper-cased — see
          // titleCase.js, shared with the Reference Library's own build-time
          // titles) — fileName itself is untouched, still the exact
          // original filename.
          const uploadTitle = titleFromFilename(file.name);
          store.update((d) => addDocument(d, { kind: 'file', title: uploadTitle, fileName: file.name, mimeType: file.type, dataUrl: reader.result }));
          done += 1;
          toast(done === total ? `Uploaded ${done} file${done === 1 ? '' : 's'}` : `Uploading… (${done}/${total})`);
          // Reference Table of Contents (docs/adr/0020) — per the user's
          // explicit choice, this is prompted per upload, not silent/
          // automatic: a real bookmark scan is real work (and needs
          // npm run serve, same file:// restriction as Mechanics Index),
          // so a GM opts in per document rather than it firing unasked.
          if (file.type === 'application/pdf' && window.confirm(`Generate a Table of Contents entry for "${uploadTitle}"? (scans its PDF bookmarks)`)) {
            scanAndGenerateToc(store, { onlyDoc: { title: uploadTitle, source: reader.result } })
              .then(({ generated }) => toast(generated ? `Table of Contents added for "${uploadTitle}"` : `"${uploadTitle}" has no bookmarks — nothing to generate`))
              .catch((err) => toast(`Table of Contents scan failed — ${err.message}`));
          }
        } catch (e) {
          done += 1;
          toast(`"${file.name}" couldn't be saved — browser storage is full. Add large rulebooks to assets/docs/ and rebuild instead.`);
        }
      };
      reader.readAsDataURL(file);
    }
    t.value = '';
    return;
  }
}

// Live feedback that must NOT trigger a full re-render (keeps focus/caret).
// Latest Scene's fields are <textarea rows="1"> that grow with their
// content instead of staying single-line or a fixed tall box — height is
// set directly from scrollHeight (not computed from a row count) so it
// naturally matches whatever the browser actually laid out; the CSS
// max-height on .scene-fields textarea (~4 rows) is what caps the visible
// growth and hands off to internal scrolling beyond that, this only ever
// asks for "as tall as the content wants," never enforces the cap itself.
function autoGrowSceneField(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

function onInput(ev) {
  const t = ev.target;
  const sceneFieldInput = t.closest('[data-scene-field]');
  if (sceneFieldInput) { autoGrowSceneField(sceneFieldInput); return; }
  const num = t.closest('[data-ctx-num]');
  if (num) { const lbl = num.previousElementSibling || num.parentElement.querySelector('.metric'); if (lbl && lbl.classList.contains('metric')) lbl.textContent = `${t.value}/10`; return; }

  const expDial = t.closest('[data-expedition-dial]');
  if (expDial) { const lbl = expDial.previousElementSibling; if (lbl && lbl.classList.contains('metric')) lbl.textContent = `${t.value}/10`; return; }

  const of = t.closest('[data-oracle-filter]');
  if (of) { oracleFilter = t.value; oracleTagFilter = null; renderDrawerBody(); restoreFocus('[data-oracle-filter]'); return; }

  const df = t.closest('[data-doc-filter]');
  if (df) { docFilter = t.value; renderDrawerBody(); restoreFocus('[data-doc-filter]'); return; }

  const gaf = t.closest('[data-gallery-filter]');
  if (gaf) { galleryFilter = t.value; renderDrawerBody(); restoreFocus('[data-gallery-filter]'); return; }

  const gf = t.closest('[data-graph-filter]');
  if (gf) { graphFilter = t.value; renderDrawerBody(); restoreFocus('[data-graph-filter]'); return; }

  const esrch = t.closest('[data-entity-search]');
  if (esrch) { entitySearch = t.value; renderDrawerBody(); restoreFocus('[data-entity-search]'); return; }

  const catSrch = t.closest('[data-catalog-search]');
  if (catSrch) { catalogSearch = t.value; renderDrawerBody(); restoreFocus('[data-catalog-search]'); return; }

  // Mirrors the Party Tracker creation form's name field into ephemeral
  // state, not for its own sake (the DOM already shows what was typed) but
  // so a kind-change 'change' event — which re-renders the whole form,
  // size/difficulty sub-field and all — rebuilds the name input with
  // whatever was already typed instead of resetting it to blank.
  const trkDraftName = t.closest('[data-party-tracker-draft-name]');
  if (trkDraftName) { partyTrackerDraftName = t.value; return; }

  // Same reasoning as the Party Tracker draft name above: keeps a typed
  // friendly name from being lost if some unrelated store.update()
  // elsewhere triggers a full render while the Gallery upload form is open.
  const galleryUploadNameInput = t.closest('[data-gallery-upload-name]');
  if (galleryUploadNameInput) { if (galleryUploadDraft) galleryUploadDraft.name = t.value; return; }

  // Same reasoning as the Party Tracker draft name above: typing a custom
  // name (not from a 🎲 roll) must survive any unrelated store.update
  // triggering a full re-render elsewhere, not just get overwritten back to
  // the last roll or blanked.
  const enhDraftName = t.closest('[data-enhancement-name-input]');
  if (enhDraftName) { enhancementDraft[enhDraftName.dataset.enhancementNameInput] = t.value; return; }

  // The search input lives in the static header skeleton, not inside a
  // drawer body that gets replaced wholesale — only its results list needs
  // updating, so focus/caret never needs restoring in the first place.
  const si = t.closest('[data-search-input]');
  if (si) { searchQuery = t.value; renderSearchOverlay(); return; }

  const mf = t.closest(MENTION_FIELD_SELECTOR);
  if (mf) updateMentionSuggest(mf);
}

// Shared by the Settings drawer's own "New Campaign" button and the header
// gear menu's identical item — one place owns the confirm text.
function confirmNewCampaign() {
  if (window.confirm('Start a new campaign? Your current one stays exportable but will be replaced in this browser.')) {
    store.newCampaign().then(() => toast('New campaign'));
  }
}

// Edge-tab click: closes if it's the currently-active tab (matches the old
// single-drawer toggle behavior for the common case), otherwise opens it as
// a new tab (or just switches to it if already pinned open) — never resets
// an already-open tab's own filter state, only a newly-opened one's.
function toggleDrawer(id) {
  if (activeDrawer === id) return closeDrawerTab(id);
  openDrawerTab(id);
  render();
}

function openDrawerTab(id) {
  if (!id) return;
  // Opening a drawer that's currently anchored (e.g. clicking its edge-tab
  // button directly) restores it to normal tab behavior rather than leaving
  // it anchored AND also added as a duplicate tab.
  if (anchoredDrawer === id) anchoredDrawer = null;
  if (!openDrawers.includes(id)) {
    openDrawers = [...openDrawers, id];
    if (id === 'oracle') oracleFilter = '';
    if (id === 'documents') { docFilter = ''; docTagFilters = new Set(); docTagEditorOpen = new Set(); }
    if (id === 'graph') graphView = { scale: 1, x: 0, y: 0 };
  }
  activeDrawer = id;
}

function closeDrawerTab(id) {
  openDrawers = openDrawers.filter((d) => d !== id);
  if (activeDrawer === id) activeDrawer = openDrawers[openDrawers.length - 1] || null;
  render();
}

// Pull a drawer OUT of the tab stack and pin it to the side panel left of
// the main drawer instead (see anchoredDrawer's doc comment above). Only
// one drawer can be anchored at a time — anchoring a second one displaces
// whichever was already there back into the normal tab group (never just
// discarded; "avoid closing or removing access"), same as
// unanchorDrawerTab does for the ▶ button. Also works on a drawer that
// isn't currently a tab at all (Cast's toggleCastDrawer relies on this —
// it can open straight into the anchor slot without ever touching
// openDrawers first).
function anchorDrawerTab(id) {
  if (!id) return;
  openDrawers = openDrawers.filter((d) => d !== id);
  if (activeDrawer === id) activeDrawer = openDrawers[openDrawers.length - 1] || null;
  if (anchoredDrawer && anchoredDrawer !== id) {
    const displaced = anchoredDrawer;
    if (!openDrawers.includes(displaced)) openDrawers = [...openDrawers, displaced];
    if (!activeDrawer) activeDrawer = displaced;
  }
  anchoredDrawer = id;
  render();
}

// The anchor panel's own "▶ move back into tabs" button — restores the
// anchored drawer to the normal tab stack as the active tab.
function unanchorDrawerTab() {
  if (!anchoredDrawer) return;
  const id = anchoredDrawer;
  anchoredDrawer = null;
  if (!openDrawers.includes(id)) openDrawers = [...openDrawers, id];
  activeDrawer = id;
  render();
}

// Cast's edge-nav toggle — opens into the anchor slot by default (a
// draggable, searchable entity list is most useful sitting beside whichever
// drawer IS active, e.g. to drag an entity into Journal or Guide, rather
// than replacing it in the tab stack), but once moved into the tab group
// (its own ⇤/▶ icons, same as any other drawer) it behaves exactly like one
// from then on — this only special-cases the "currently closed everywhere"
// case, not Cast's behavior once it's open.
function toggleCastDrawer() {
  if (anchoredDrawer === 'cast') { anchoredDrawer = null; return render(); }
  if (openDrawers.includes('cast')) {
    if (activeDrawer === 'cast') return closeDrawerTab('cast');
    activeDrawer = 'cast';
    return render();
  }
  anchorDrawerTab('cast');
}

// "Open the Journal anchoring it to the left of Oracles when rolling on
// Oracle tables": rolling FROM the Oracle drawer itself (`.mc-drawer-body`
// is shared by both the main drawer and the anchor panel, so this fires
// regardless of which one Oracle happens to be in — but NOT from the
// Co-Pilot's own quick-roll shortcut, which has no such ancestor) pins
// Journal into the anchor slot so the entry the roll just logged is
// visible without switching tabs. No-ops if something is already anchored
// (including Oracle itself, if the GM anchored Oracle rather than Journal)
// — this only ever fills an empty anchor slot, never steals one.
function anchorJournalBesideOracleRoll(el) {
  if (!el.closest('.mc-drawer-body') || anchoredDrawer) return;
  openDrawers = openDrawers.filter((d) => d !== 'journal');
  if (activeDrawer === 'journal') activeDrawer = openDrawers[openDrawers.length - 1] || null;
  anchoredDrawer = 'journal';
}

// The tab strip's own "✕ close all" corner button — distinct from a single
// tab's ✕ (closeDrawerTab above), which only ever closed the one tab it's
// on. Only rendered/reachable once 2+ tabs are pinned open in the first
// place (see the drawer-tabs strip's own visibility gate).
function closeAllDrawerTabs() {
  openDrawers = [];
  activeDrawer = null;
  render();
}

// ---- relationship graph: wheel-to-zoom, drag-to-pan ------------------------
// Both are high-frequency (a wheel gesture or a drag fires many events in a
// fraction of a second) so, like onInput's live-feedback cases, they mutate
// the already-rendered SVG's viewBox directly instead of going through a
// full store-driven re-render — buildGraph/computeLayout (a force-directed
// layout) never needs to re-run just because the view into it panned/zoomed.
function updateGraphViewBox() {
  const svg = root && root.querySelector('.graph-svg');
  if (!svg) return;
  const w = (GRAPH_W / graphView.scale).toFixed(1), h = (GRAPH_H / graphView.scale).toFixed(1);
  svg.setAttribute('viewBox', `${graphView.x.toFixed(1)} ${graphView.y.toFixed(1)} ${w} ${h}`);
}

function onWheel(ev) {
  const svg = ev.target.closest('.graph-svg');
  if (!svg) return;
  ev.preventDefault();
  const rect = svg.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const fx = (ev.clientX - rect.left) / rect.width, fy = (ev.clientY - rect.top) / rect.height;
  const curW = GRAPH_W / graphView.scale, curH = GRAPH_H / graphView.scale;
  const wx = graphView.x + fx * curW, wy = graphView.y + fy * curH; // user-space point under the cursor
  const scale = Math.min(6, Math.max(0.5, graphView.scale * (ev.deltaY < 0 ? 1.15 : 1 / 1.15)));
  const newW = GRAPH_W / scale, newH = GRAPH_H / scale;
  // Keep that same point under the cursor after the scale change.
  graphView = { scale, x: wx - fx * newW, y: wy - fy * newH };
  updateGraphViewBox();
}

function onMouseDown(ev) {
  // Mousedown (not click) on a mention-suggestion item, prevented, so the
  // still-focused text field never blurs — a click there normally would,
  // and blur firing before this button's own click handler is the classic
  // listbox race (the suggestion would already be gone by the time the
  // click tried to use it).
  if (ev.target.closest('[data-mention-suggest-item]')) { ev.preventDefault(); return; }

  // Rich-text toolbar (ADR 0018) — same mousedown-not-click reasoning as
  // above: preventDefault() here stops the button from ever stealing focus
  // (and therefore the field's current selection/caret) away from the
  // .mention-editor it's acting on, which a 'click' handler firing after
  // the field already blurred could never recover.
  const richCmd = ev.target.closest('[data-rich-cmd]');
  if (richCmd) {
    ev.preventDefault();
    const field = richCmd.closest('.rich-field')?.querySelector('.mention-editor');
    if (!field) return;
    const cmd = richCmd.dataset.richCmd;
    if (cmd === 'bold') wrapSelectionWithMarkup(field, '**', '**');
    else if (cmd === 'italic') wrapSelectionWithMarkup(field, '*', '*');
    else if (cmd === 'underline') wrapSelectionWithMarkup(field, '_', '_');
    else if (cmd === 'small') wrapSelectionWithMarkup(field, '~', '~');
    else if (cmd === 'large') wrapSelectionWithMarkup(field, '^', '^');
    else if (cmd === 'ul') toggleLinePrefix(field, '- ');
    else if (cmd === 'ol') toggleLinePrefix(field, '1. ');
    else if (cmd === 'table') insertTableSkeleton(field);
    else if (cmd === 'link') {
      // Capture the range NOW — by the time the inline prompt below is
      // submitted, focus has moved to its own input, and window.getSelection()
      // may no longer point at this field at all. Any currently-selected
      // text becomes the description field's starting value (editable) —
      // matches the intuitive "select text, then link it" gesture other
      // editors use, without requiring a selection at all.
      const sel = window.getSelection();
      const range = (sel && sel.rangeCount && field.contains(sel.anchorNode)) ? sel.getRangeAt(0).cloneRange() : null;
      const selectedText = range ? range.toString() : '';
      openInlinePrompt('ext-link', {
        fields: [
          { key: 'label', label: 'Link text', placeholder: 'What should it say?', value: selectedText },
          { key: 'url', label: 'URL', placeholder: 'https://example.com' },
        ],
        meta: { field, range }, anchorRect: richCmd.getBoundingClientRect(),
      });
    }
    return;
  }

  const svg = ev.target.closest('.graph-svg');
  if (!svg || ev.target.closest('[data-graph-node]')) return; // don't hijack a node click into a pan
  graphPan = { svg, startClientX: ev.clientX, startClientY: ev.clientY, startX: graphView.x, startY: graphView.y };
}

// --- Rich-text toolbar helpers (ADR 0018) ----------------------------------
// Both operate on the live Selection inside a .mention-editor field and
// insert literal markup characters as plain text nodes — the field's next
// blur-commit (onFocusOut) serializes that back to plain text exactly like
// any other edit, and the NEXT render is what turns it into a real <b>/<ul>
// etc. (buildMentionEditorHTML). Nothing here talks to the store directly.

function wrapSelectionWithMarkup(field, open, close) {
  field.focus();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !field.contains(sel.anchorNode)) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) {
    const node = document.createTextNode(open + close);
    range.insertNode(node);
    const caret = document.createRange();
    caret.setStart(node, open.length);
    caret.collapse(true);
    sel.removeAllRanges();
    sel.addRange(caret);
  } else {
    const closeNode = document.createTextNode(close);
    const endRange = range.cloneRange();
    endRange.collapse(false);
    endRange.insertNode(closeNode);
    const openNode = document.createTextNode(open);
    const startRange = range.cloneRange();
    startRange.collapse(true);
    startRange.insertNode(openNode);
    const after = document.createRange();
    after.setStartAfter(closeNode);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);
  }
}

// Inserts a `[label](url)` link at `range` (or, if none was captured — the
// field never had a live selection to begin with — at the end of `field`'s
// content), replacing whatever `range` covered. Distinct from
// wrapSelectionWithMarkup above: that wraps whatever text is ALREADY
// selected with fixed open/close markers, whereas here the label is a
// specific string the GM just typed into the inline prompt's own field,
// which may not match the originally-selected text at all (or there may
// have been no selection in the first place) — so this always replaces
// range content with the literal markup, never wraps it.
function insertExtLinkMarkup(field, range, label, url) {
  field.focus();
  const target = range || (() => {
    const r = document.createRange();
    r.selectNodeContents(field);
    r.collapse(false);
    return r;
  })();
  target.deleteContents();
  const node = document.createTextNode(`[${label}](${url})`);
  target.insertNode(node);
  const after = document.createRange();
  after.setStartAfter(node);
  after.collapse(true);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(after);
}

// Toggles a "- "/"1. " marker at the start of the current visual line —
// Selection.modify('extend','backward','lineboundary') (supported in every
// engine this app targets — Chromium/WebKit; see "run" skill notes on this
// project's Playwright-verified environment) finds that boundary without
// this app needing its own line-break-aware DOM walk across the mixed text-
// node/<br>/<div> shapes a contenteditable can produce.
function toggleLinePrefix(field, marker) {
  field.focus();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !field.contains(sel.anchorNode) || typeof sel.modify !== 'function') return;
  const caret = sel.getRangeAt(0).cloneRange();
  caret.collapse(true);
  sel.removeAllRanges();
  sel.addRange(caret);
  sel.modify('extend', 'backward', 'lineboundary');
  const lineRange = sel.getRangeAt(0);
  const existing = lineRange.toString().match(/^(-\s|\d+\.\s)/);
  const lineStart = lineRange.cloneRange();
  lineStart.collapse(true);
  const node = lineStart.startContainer;
  const offset = lineStart.startOffset;
  if (existing && node.nodeType === Node.TEXT_NODE && offset + existing[0].length <= node.nodeValue.length) {
    node.nodeValue = node.nodeValue.slice(0, offset) + node.nodeValue.slice(offset + existing[0].length);
    const after = document.createRange();
    after.setStart(node, offset);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);
  } else if (!existing) {
    if (node.nodeType === Node.TEXT_NODE) {
      node.nodeValue = node.nodeValue.slice(0, offset) + marker + node.nodeValue.slice(offset);
      const after = document.createRange();
      after.setStart(node, offset + marker.length);
      after.collapse(true);
      sel.removeAllRanges();
      sel.addRange(after);
    } else {
      const textNode = document.createTextNode(marker);
      lineStart.insertNode(textNode);
      const after = document.createRange();
      after.setStartAfter(textNode);
      after.collapse(true);
      sel.removeAllRanges();
      sel.addRange(after);
    }
  }
}

// Inserts a fixed 2-column/2-row pipe-table skeleton at the caret — per the
// user's explicit choice, this is the toolbar's entire table feature: no
// dedicated add/remove-row/column UI, more rows/columns come from typing
// more "| cell |" syntax by hand, same "toolbar inserts lightweight markup"
// shape every other button here already uses (domain/documents.js's
// parseTextBlocks renders it as a real bordered <table> on the next save).
function insertTableSkeleton(field) {
  field.focus();
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !field.contains(sel.anchorNode)) return;
  const range = sel.getRangeAt(0);
  const skeleton = '\n| Column 1 | Column 2 |\n| --- | --- |\n|  |  |\n';
  const node = document.createTextNode(skeleton);
  range.deleteContents();
  range.insertNode(node);
  const after = document.createRange();
  after.setStartAfter(node);
  after.collapse(true);
  sel.removeAllRanges();
  sel.addRange(after);
}

function onGraphMouseMove(ev) {
  if (!graphPan) return;
  const rect = graphPan.svg.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const curW = GRAPH_W / graphView.scale, curH = GRAPH_H / graphView.scale;
  const dx = (ev.clientX - graphPan.startClientX) / rect.width * curW;
  const dy = (ev.clientY - graphPan.startClientY) / rect.height * curH;
  graphView = { ...graphView, x: graphPan.startX - dx, y: graphPan.startY - dy };
  updateGraphViewBox();
}

function onGraphMouseUp() { graphPan = null; }

// ---- drag-and-drop: entity → entity (relate) or entity → text (mention) --
// Native HTML5 DnD, delegated at the root like everything else. A custom
// MIME type keeps this from reacting to unrelated drags (e.g. file drops).
const ENTITY_DRAG_TYPE = 'application/x-saga-entity';
const DOCUMENT_DRAG_TYPE = 'application/x-saga-document';
// Guide-tree reparenting (docs/adr/0017) — a separate MIME type and target
// resolution path from the entity/document one above (that one's target
// resolution is specifically about text-mention insertion; this one's is
// about tree structure), sharing only the same delegated dragstart/
// dragover/dragleave/drop listeners (rule 4).
const GUIDE_NODE_DRAG_TYPE = 'application/x-gmatlas-guide-node';
// Repositioning an already-placed Battlemap icon (docs/adr/0023) — a
// separate MIME type from ENTITY_DRAG_TYPE below since dropping an ENTITY
// onto the battlemap canvas means something different (place a NEW token)
// than dropping an EXISTING icon back onto it (move that one icon);
// carries "mapId::iconId" the same "::"-joined-pair shape every other
// battlemap data-* attribute here uses.
const BATTLEMAP_ICON_DRAG_TYPE = 'application/x-gmatlas-battlemap-icon';

function onDragStart(ev) {
  const guideSrc = ev.target.closest('[data-drag-guide-node]');
  if (guideSrc) {
    ev.dataTransfer.setData(GUIDE_NODE_DRAG_TYPE, guideSrc.dataset.dragGuideNode);
    ev.dataTransfer.effectAllowed = 'move';
    return;
  }

  const battlemapIconSrc = ev.target.closest('[data-drag-battlemap-icon]');
  if (battlemapIconSrc) {
    ev.dataTransfer.setData(BATTLEMAP_ICON_DRAG_TYPE, battlemapIconSrc.dataset.dragBattlemapIcon);
    ev.dataTransfer.effectAllowed = 'move';
    return;
  }

  const entitySrc = ev.target.closest('[data-drag-entity]');
  if (entitySrc) {
    ev.dataTransfer.setData(ENTITY_DRAG_TYPE, entitySrc.dataset.dragEntity);
    ev.dataTransfer.effectAllowed = 'link';
    return;
  }

  const docSrc = ev.target.closest('[data-drag-document]');
  if (docSrc) {
    ev.dataTransfer.setData(DOCUMENT_DRAG_TYPE, docSrc.dataset.dragDocument);
    ev.dataTransfer.effectAllowed = 'copy';
  }
}

function onDragOver(ev) {
  const types = ev.dataTransfer.types || [];
  if (types.includes(GUIDE_NODE_DRAG_TYPE)) {
    const target = ev.target.closest('[data-drop-guide-node]');
    if (target) { ev.preventDefault(); target.classList.add('drop-hover'); }
    return;
  }
  if (types.includes(BATTLEMAP_ICON_DRAG_TYPE) || types.includes(ENTITY_DRAG_TYPE)) {
    const bmTarget = ev.target.closest('[data-drop-battlemap]');
    if (bmTarget) { ev.preventDefault(); bmTarget.classList.add('drop-hover'); return; }
  }
  if (!types.includes(ENTITY_DRAG_TYPE) && !types.includes(DOCUMENT_DRAG_TYPE)) return;
  const target = ev.target.closest(DROP_TARGET_SELECTOR);
  if (target) { ev.preventDefault(); target.classList.add('drop-hover'); }
}

function onDragLeave(ev) {
  const target = ev.target.closest('.drop-hover');
  if (target) target.classList.remove('drop-hover');
}

function onDrop(ev) {
  const guideNodeId = ev.dataTransfer.getData(GUIDE_NODE_DRAG_TYPE);
  if (guideNodeId) {
    const target = ev.target.closest('[data-drop-guide-node]');
    if (target) { ev.preventDefault(); target.classList.remove('drop-hover'); completeGuideNodeDrop(target, guideNodeId); }
    return;
  }
  const entityId = ev.dataTransfer.getData(ENTITY_DRAG_TYPE);
  const documentId = ev.dataTransfer.getData(DOCUMENT_DRAG_TYPE);
  const battlemapIconRef = ev.dataTransfer.getData(BATTLEMAP_ICON_DRAG_TYPE);
  const bmTarget = ev.target.closest('[data-drop-battlemap]');
  if (bmTarget && (entityId || battlemapIconRef)) {
    ev.preventDefault();
    bmTarget.classList.remove('drop-hover');
    completeBattlemapDrop(bmTarget, { entityId, battlemapIconRef }, ev.clientX, ev.clientY);
    return;
  }
  if (!entityId && !documentId) return;
  const target = ev.target.closest(DROP_TARGET_SELECTOR);
  if (!target) return;
  ev.preventDefault();
  target.classList.remove('drop-hover');
  completeDrop(target, { entityId, documentId }, ev.clientX, ev.clientY);
}

// Shared drop target for both placing a NEW token (dragging a Cast entity
// chip on) and repositioning an EXISTING icon (dragging one of the map's
// own icons back onto itself) — distinguished by which MIME type carried
// data, same "one place decides what a drop actually does" posture as
// completeDrop/completeGuideNodeDrop above.
function completeBattlemapDrop(target, { entityId, battlemapIconRef }, clientX, clientY) {
  const mapId = target.dataset.dropBattlemap;
  const rect = target.getBoundingClientRect();
  const x = rect.width ? (clientX - rect.left) / rect.width : 0.5;
  const y = rect.height ? (clientY - rect.top) / rect.height : 0.5;
  if (battlemapIconRef) {
    const [srcMapId, iconId] = battlemapIconRef.split('::');
    if (srcMapId !== mapId) return; // an icon only ever moves within its own map
    return store.update((d) => moveBattlemapIcon(d, mapId, iconId, x, y));
  }
  if (entityId) {
    const ent = getEntity(store.get(), entityId);
    store.update((d) => addBattlemapIcon(d, mapId, { kind: 'token', entityId, label: ent ? ent.name || '' : '', x, y }));
    toast(`${(ent && ent.name) || 'Token'} placed on the map`);
  }
}

/** The Guide-tree reparent mutator both the mouse (onDrop) and touch
 *  (onTouchEnd) paths call — moveGuideDoc itself already no-ops on a
 *  same-node or cycle-creating drop, so this doesn't need to duplicate
 *  that guard, just resolve the "__root__" drop-zone sentinel to null. */
function completeGuideNodeDrop(target, guideNodeId) {
  const dropId = target.dataset.dropGuideNode;
  const newParentId = dropId === '__root__' ? null : dropId;
  store.update((d) => moveGuideDoc(d, guideNodeId, newParentId));
}

// Shared by the mouse path (onDrop, native HTML5 DnD) and the touch path
// (onTouchEnd, below) — exactly one place decides what a drop actually
// does, so the two input methods can never quietly diverge. clientX/Y (where
// available — onTouchEnd doesn't have a live touch point) place the
// inserted mention at the exact text position under the drop, the same way
// a native text drop would; falling back to "end of field" otherwise.
function completeDrop(target, { entityId, documentId }, clientX, clientY) {
  const dropEnt = target.closest('[data-drop-entity]');
  if (dropEnt && entityId) {
    const targetId = dropEnt.dataset.dropEntity;
    if (targetId && targetId !== entityId) { store.update((d) => addRelationship(d, entityId, targetId, 'linked')); toast('Linked'); }
    return;
  }
  const dropText = target.closest(MENTION_FIELD_SELECTOR);
  if (!dropText) return;
  const range = (clientX != null && caretRangeAtPoint(clientX, clientY)) || (() => {
    const r = document.createRange();
    r.selectNodeContents(dropText);
    r.collapse(false);
    return r;
  })();

  if (documentId) {
    // documentId is a tab key ("lib:<id>" or "ref:<manifest file path>" —
    // same shape data-doc-open already uses), not a bare library id: a
    // Reference Library entry has no entry in campaign.documents.library
    // at all, so looking it up with getDocument() always missed, and the
    // drag fell through to the browser's native link-drag of the row's
    // href="#" instead of this custom handler — that's what showed up as
    // a raw "file:///.../index.html#" string when dropped.
    const resolved = resolveDocumentTab(store.get(), documentId);
    if (resolved) {
      const title = resolved.title || 'Untitled document';
      // Inserted pageless immediately, then the inline prompt below offers
      // a page — asked every drop, not just when one seems relevant, same
      // as before; leaving it blank/cancelling still leaves a plain
      // (pageless) mention, just reordered (insert now, refine after)
      // instead of blocking the drop on a window.prompt() beforehand.
      const span = insertMentionNode(range, { kind: 'doc', tabKey: documentId, name: title });
      dropText.focus();
      commitMentionField(dropText);
      toast(`Referenced ${title}`);
      openInlinePrompt('mention-page', {
        label: `Page in "${title}"? (optional)`, placeholder: 'e.g. 12',
        meta: { mentionEl: span }, anchorRect: span.getBoundingClientRect(),
      });
      return;
    }
  }
  if (entityId) {
    const ent = getEntity(store.get(), entityId);
    if (ent) {
      const name = ent.name || 'Unnamed';
      insertMentionNode(range, { kind: 'entity', entityId, name });
      dropText.focus();
      commitMentionField(dropText);
      toast(`Mentioned ${name}`);
    }
  }
}

// ---- touch equivalent of the drag-and-drop above --------------------------
// HTML5 drag-and-drop's dragstart/dragover/drop events never fire for touch
// gestures on real mobile browsers (a well-known gap, not a bug in the code
// above) — so linking entities or mentioning one in a note has had no
// touch path at all until now. This recognizes the same gesture (press a
// data-drag-entity/data-drag-document handle, move, release over a
// data-drop-entity/text-field target) and feeds the exact same
// completeDrop() the mouse path uses, rather than a second interaction
// model with its own chance to drift out of sync.
const TOUCH_DRAG_THRESHOLD = 10; // px of finger movement before a touch counts as a drag, not a tap/scroll
let touchDrag = null;

function onTouchStart(ev) {
  const t = ev.target;
  const guideSrc = t.closest('[data-drag-guide-node]');
  const entitySrc = !guideSrc && t.closest('[data-drag-entity]');
  const docSrc = !guideSrc && !entitySrc && t.closest('[data-drag-document]');
  if (!guideSrc && !entitySrc && !docSrc) return;
  const touch = ev.touches[0];
  touchDrag = {
    guideNodeId: guideSrc ? guideSrc.dataset.dragGuideNode : null,
    entityId: entitySrc ? entitySrc.dataset.dragEntity : null,
    documentId: docSrc ? docSrc.dataset.dragDocument : null,
    startX: touch.clientX, startY: touch.clientY,
    engaged: false, lastTarget: null, ghostEl: null,
  };
}

function onTouchMove(ev) {
  if (!touchDrag) return;
  const touch = ev.touches[0];
  const dx = touch.clientX - touchDrag.startX, dy = touch.clientY - touchDrag.startY;
  if (!touchDrag.engaged) {
    if (Math.hypot(dx, dy) < TOUCH_DRAG_THRESHOLD) return; // could still be a tap or a page scroll
    touchDrag.engaged = true;
    touchDrag.ghostEl = makeTouchDragGhost(touchDrag);
  }
  ev.preventDefault(); // only once actually dragging — a plain tap/scroll is never blocked
  if (touchDrag.ghostEl) { touchDrag.ghostEl.style.left = touch.clientX + 'px'; touchDrag.ghostEl.style.top = touch.clientY + 'px'; }
  const under = document.elementFromPoint(touch.clientX, touch.clientY);
  const dropTarget = under && under.closest(touchDrag.guideNodeId ? '[data-drop-guide-node]' : DROP_TARGET_SELECTOR);
  if (dropTarget !== touchDrag.lastTarget) {
    if (touchDrag.lastTarget) touchDrag.lastTarget.classList.remove('drop-hover');
    if (dropTarget) dropTarget.classList.add('drop-hover');
    touchDrag.lastTarget = dropTarget || null;
  }
  touchDrag.lastX = touch.clientX;
  touchDrag.lastY = touch.clientY;
}

function onTouchEnd() {
  if (!touchDrag) return;
  const drag = touchDrag;
  touchDrag = null;
  if (drag.ghostEl) drag.ghostEl.remove();
  if (drag.lastTarget) drag.lastTarget.classList.remove('drop-hover');
  if (!drag.engaged || !drag.lastTarget) return; // a tap, or released off any valid target
  if (drag.guideNodeId) { completeGuideNodeDrop(drag.lastTarget, drag.guideNodeId); return; }
  completeDrop(drag.lastTarget, drag, drag.lastX, drag.lastY);
}

function makeTouchDragGhost(drag) {
  const label = drag.guideNodeId
    ? (((store.get().guide && store.get().guide.docs) || []).find((d) => d.id === drag.guideNodeId) || {}).title
    : drag.entityId ? (getEntity(store.get(), drag.entityId) || {}).name : (resolveDocumentTab(store.get(), drag.documentId) || {}).title;
  const el = document.createElement('div');
  el.className = 'touch-drag-ghost';
  el.textContent = label || (drag.guideNodeId ? 'Document' : drag.entityId ? 'Entity' : 'Document');
  document.body.appendChild(el);
  return el;
}

// ---- @-mention autocomplete -------------------------------------------
// Typing "@" and a few characters of a name in any mention-bearing field
// pops up a filtered list of matching entities/documents (mirrors the
// discoverability drag-and-drop already gives — this is the same outcome
// for someone who's just typing) — picking one replaces the in-progress
// "@partial" run with a finished @Name/@[Name] (or, for a document,
// @[Title#page] after asking which page, same one-off prompt the drag path
// uses) mention, in place.
const MENTION_TRIGGER = /@([A-Za-z0-9 _''-]*)$/;
const MENTION_MAX_SUGGESTIONS = 8;

function onFocusOut(ev) {
  if (mentionSuggest && ev.target === mentionSuggest.field) closeMentionSuggest();

  // Contenteditable context fields (WHO/WHERE/WHAT/WHY/HOW) have no native
  // 'change' event — that only exists on <input>/<textarea>/<select> — so
  // this is their blur-commit instead, same trigger point onChange's
  // data-ctx branch uses for the (still-a-<select>) how.activity field.
  const ctxField = ev.target.closest('[data-ctx]');
  if (ctxField && ctxField.isContentEditable) {
    const [key, field] = ctxField.dataset.ctx.split('.');
    const value = serializeMentionEditor(ctxField);
    const current = ((store.get().context[key] || {})[field]) || '';
    if (value !== current) store.update((d) => editContextText(d, key, field, value));
  }

  // Guide autosaves on blur too now — no Save button (nothing else in the
  // app uses one; every other field commits on blur/change already, so
  // Guide having a separate explicit-save step was the odd one out).
  // data-guide-active names which doc this editor instance belongs to (the
  // one that was active when it rendered) — commits to THAT id, not
  // whatever's active by the time blur actually fires, in case a re-render
  // switched the active doc out from under a pending edit.
  const guideField = ev.target.closest('[data-guide-input]');
  if (guideField) {
    const id = guideField.dataset.guideActive;
    const value = serializeMentionEditor(guideField);
    const current = getActiveGuideDoc(store.get());
    if (id && (id !== current.id || value !== current.text)) store.update((d) => setGuideDocText(d, id, value));
  }

  // Every rich-text-converted entity field (Overview, Revealed/hidden,
  // Faction's Scenario seed/Agenda — ADR 0018 plus the "USER CHANGES"
  // follow-up batch) is a mention-editor div, not a <textarea>/<input> —
  // same reason as the ctxField branch above (no native 'change' event on
  // a contenteditable). One generic branch keyed off dataset.entityField
  // covers all of them; every OTHER data-entity-field (name, type, hq,
  // leadership, fear, need, secret, ...) is still a plain input and stays
  // on onChange's t.value path (see onChange's data-entity-field branch).
  const richEntityField = ev.target.closest('[data-entity-field]');
  if (richEntityField && richEntityField.isContentEditable) {
    const field = richEntityField.dataset.entityField;
    const active = store.get().entities.activeId;
    const value = serializeMentionEditor(richEntityField);
    const current = getEntity(store.get(), active);
    if (current && value !== (current[field] || '')) store.update((d) => updateEntity(d, active, { [field]: value }));
  }

  // Editing an existing journal entry (the ✎ icon) — auto-saves on blur,
  // same as every other field here; "✓ Done" (data-journal-edit-toggle)
  // just closes edit mode afterward, it's not a separate save step.
  const journalEditField = ev.target.closest('[data-journal-edit]');
  if (journalEditField) {
    const id = journalEditField.dataset.journalEdit;
    const value = serializeMentionEditor(journalEditField);
    const current = (store.get().journal || []).find((j) => j.id === id);
    if (current && value !== current.text) store.update((d) => editNote(d, id, value));
  }

  // Colony's textarea-type fields (data/colonyFields.js) — same reasoning,
  // converted from <textarea> to a mention-editor div; the number/text
  // <input>-type Colony fields are untouched and still commit via
  // onChange's [data-colony-field] branch.
  const colonyRichField = ev.target.closest('[data-colony-field]');
  if (colonyRichField && colonyRichField.isContentEditable) {
    const key = colonyRichField.dataset.colonyField;
    const value = serializeMentionEditor(colonyRichField);
    const current = getColonyFields(store.get())[key];
    if (value !== (current || '')) store.update((d) => setColonyField(d, key, value));
  }

  // A Document library note's content box — converted from <textarea> to
  // a mention-editor div; committed the same way its "Save" button always
  // has (data-doc-save, ui onClick), just reading serializeMentionEditor
  // instead of .value now — no separate blur-autosave path for this one,
  // since the explicit Save button is this field's established pattern
  // (unlike every other field here, which never had one).
}

// Ctrl/Cmd+Click a document mention's page (ADR 0018) — the page lives in a
// fixed data-mention-page/data-doc-open-page attribute, not the editable
// label text, so it needs its own edit path rather than "arrow-key in and
// type" (which only ever touches the label). Edits the live span directly,
// then dispatches a synthetic focusout so the enclosing field's own
// blur-commit (onFocusOut, above) picks it up exactly like any other
// in-field edit — no separate store-write path to keep in sync.
function editMentionPage(mentionEl) {
  const current = mentionEl.dataset.mentionPage || '';
  openInlinePrompt('mention-page', {
    label: 'Change page to (blank to remove)', placeholder: 'e.g. 12', value: current,
    meta: { mentionEl }, anchorRect: mentionEl.getBoundingClientRect(),
  });
}

// Shared by editMentionPage (Ctrl/Cmd+Click an existing mention) and the
// "which page?" inline prompt opened right after a fresh doc-mention
// insertion (onDrop, chooseMentionSuggestItem) — same commit either way.
function applyMentionPage(mentionEl, input) {
  const trimmed = (input || '').trim();
  if (!trimmed) {
    mentionEl.dataset.mentionPage = '';
    delete mentionEl.dataset.docOpenPage;
  } else {
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n <= 0) { toast('Enter a valid page number'); return; }
    mentionEl.dataset.mentionPage = String(n);
    mentionEl.dataset.docOpenPage = String(n);
  }
  const field = mentionEl.closest('.mention-editor');
  if (field) field.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
}

function closeMentionSuggest() {
  mentionSuggest = null;
  const el = root && root.querySelector('[data-mention-suggest]');
  if (el) { el.hidden = true; el.innerHTML = ''; }
}

// --- Generic inline text-entry prompt --------------------------------------
// Replaces every window.prompt() this app used to show for a piece (or, for
// the Link button, two pieces) of free text — "as a general rule, do not
// have popup windows for data entry," so every one of them now opens this
// same small floating field instead, keyed by `kind`. Opening is always the
// caller's job (pass an anchorRect — usually the trigger element's own
// getBoundingClientRect()); committing/cancelling always goes through here.
//
// Single-field callers (nine of the ten kinds) pass label/placeholder/value
// flat, same as before this got multi-field support — openInlinePrompt
// synthesizes a one-item `fields` array from those under a fixed 'value'
// key, so commitInlinePrompt's existing single-field branches (reading
// `values.value`) didn't need to change at all. Only a caller that actually
// needs more than one input (currently just the Link button: description +
// URL) passes an explicit `fields` array instead.

function openInlinePrompt(kind, { label, placeholder = '', value = '', meta = null, anchorRect, fields }) {
  inlinePrompt = { kind, meta, fields: fields || [{ key: 'value', label, placeholder, value }] };
  renderInlinePrompt(anchorRect);
}

function renderInlinePrompt(anchorRect) {
  const el = root && root.querySelector('[data-inline-prompt]');
  if (!el || !inlinePrompt) return;
  const fieldsEl = el.querySelector('[data-inline-prompt-fields]');
  fieldsEl.innerHTML = inlinePrompt.fields.map((f) => `
    <label class="inline-prompt-label">${escapeHtml(f.label)}
      <input type="text" class="inline-prompt-input" data-inline-prompt-field="${escapeHtml(f.key)}" value="${escapeHtml(f.value || '')}" placeholder="${escapeHtml(f.placeholder || '')}" autocomplete="off">
    </label>`).join('');
  if (anchorRect) {
    const top = Math.min(anchorRect.bottom + 4, window.innerHeight - 60);
    const left = Math.min(anchorRect.left, window.innerWidth - 280);
    el.style.top = Math.max(4, top) + 'px';
    el.style.left = Math.max(4, left) + 'px';
  }
  el.hidden = false;
  const first = fieldsEl.querySelector('[data-inline-prompt-field]');
  if (first) { first.focus(); first.select(); }
}

function closeInlinePrompt() {
  inlinePrompt = null;
  const el = root && root.querySelector('[data-inline-prompt]');
  if (el) el.hidden = true;
}

// Every former window.prompt() call site's post-input logic lives here now,
// one branch per `kind` — each is exactly what that site used to do with
// its prompt's return value, just reading `values.value` (or, for a
// multi-field kind, `values.<key>`) /meta instead.
function commitInlinePrompt() {
  if (!inlinePrompt) return;
  const values = {};
  (root ? root.querySelectorAll('[data-inline-prompt-field]') : []).forEach((el) => { values[el.dataset.inlinePromptField] = (el.value || '').trim(); });
  const value = values.value || ''; // the synthesized single-field key
  const { kind, meta } = inlinePrompt;
  closeInlinePrompt();

  if (kind === 'shift-prompt') {
    if (value) { store.update((d) => applyStoryShift(d, meta.name, value)); toast(meta.name); }
  } else if (kind === 'statblock-add-field') {
    const active = store.get().entities.activeId;
    store.update((d) => addEntityStatblockField(d, active, meta.gi, { key: value || 'New Field', value: '' }));
    toast('Field added');
  } else if (kind === 'statblock-add-track') {
    const active = store.get().entities.activeId;
    store.update((d) => addEntityStatblockField(d, active, meta.gi, { key: value || 'New Track', value: 0, max: 5, track: true }));
    toast('Track added');
  } else if (kind === 'template-system-add') {
    if (value) { store.update((d) => addTemplateSystem(d, value, value)); toast('System added'); }
  } else if (kind === 'thread-add') {
    if (value) { store.update((d) => addThread(d, value)); toast('Thread added'); }
  } else if (kind === 'expedition-add') {
    if (value) { store.update((d) => createExpedition(d, value)); toast('Expedition added'); }
  } else if (kind === 'ext-link') {
    const url = sanitizeExternalLinkUrl(values.url);
    if (!url) { toast('Not a valid link — use a plain http(s) address'); return; }
    const label = values.label || url;
    insertExtLinkMarkup(meta.field, meta.range, label, url);
  } else if (kind === 'mention-page') {
    applyMentionPage(meta.mentionEl, value);
  } else if (kind === 'battlemap-add') {
    store.update((d) => createBattlemap(d, value).campaign);
  } else if (kind === 'battlemap-icon-note') {
    store.update((d) => updateBattlemapIcon(d, meta.mapId, meta.iconId, { note: value }));
  }
}

// mention-editor fields are contenteditable, not <textarea>/<input> — there's
// no .value/.selectionStart to read, so the trigger check works off the real
// caret (window.getSelection()) and the specific text node it's in. Typing
// "@" only ever happens inside a plain text node (never inside an existing
// mention <span>, which is a single atomic insert — see insertMentionNode),
// so restricting the trigger to a text-node caret is not a real limitation.
function updateMentionSuggest(field) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return closeMentionSuggest(); // no support mid-selection
  const node = sel.getRangeAt(0).startContainer;
  if (node.nodeType !== Node.TEXT_NODE || !field.contains(node)) return closeMentionSuggest();
  const offset = sel.getRangeAt(0).startOffset;
  const m = node.textContent.slice(0, offset).match(MENTION_TRIGGER);
  if (!m) return closeMentionSuggest();
  const query = m[1].trim().toLowerCase();
  const start = offset - m[0].length;
  const doc = store.get();
  const entityItems = listEntities(doc)
    .filter((e) => (e.name || '').toLowerCase().includes(query))
    .slice(0, MENTION_MAX_SUGGESTIONS)
    .map((e) => ({ kind: 'entity', id: e.id, label: e.name || 'Unnamed', sublabel: TYPE_LABEL[e.type] || 'Entity' }));
  const docItems = [
    ...listDocuments(doc).map((d) => ({ kind: 'doc', title: d.title || d.fileName || 'Untitled document', sublabel: 'document', tabKey: 'lib:' + d.id })),
    ...listReferenceDocuments(doc).map((r) => ({ kind: 'doc', title: r.title, sublabel: 'reference library', tabKey: 'ref:' + r.key })),
  ].filter((d) => d.title.toLowerCase().includes(query));
  const items = [...entityItems, ...docItems].slice(0, MENTION_MAX_SUGGESTIONS);
  if (!items.length) return closeMentionSuggest();
  mentionSuggest = { field, node, start, end: offset, items, activeIndex: 0 };
  renderMentionSuggest();
}

function renderMentionSuggest() {
  const el = root && root.querySelector('[data-mention-suggest]');
  if (!el || !mentionSuggest) return;
  const { field, items, activeIndex } = mentionSuggest;
  el.innerHTML = items.map((it, i) => `
    <button type="button" class="mention-suggest-item ${i === activeIndex ? 'active' : ''}" data-mention-suggest-item="${i}">
      <span class="mention-suggest-label">${it.kind === 'entity' ? '👤' : '📄'} ${escapeHtml(it.label || it.title)}</span>
      <span class="dim small">${escapeHtml(it.sublabel)}</span>
    </button>`).join('');
  const rect = field.getBoundingClientRect();
  el.style.left = rect.left + 'px';
  el.style.top = (rect.bottom + 4) + 'px';
  el.style.width = Math.min(rect.width, 320) + 'px';
  el.hidden = false;
}

// Commits a mention-editor field's current content the same way its normal
// interaction would: Journal/Guide only save on their explicit button
// (unaffected — the freshly-inserted node just sits there until clicked),
// context fields auto-save (mirrors onFocusOut's commit for a real blur).
function commitMentionField(field) {
  const ctxAttr = field.dataset.ctx;
  if (!ctxAttr) return;
  const [key, fieldName] = ctxAttr.split('.');
  store.update((d) => editContextText(d, key, fieldName, serializeMentionEditor(field)));
}

// Shared by WHERE's and WHO's tag-picker candidate click (workspace/
// index.js's whereLocationPicker/whoEntityPicker) — inserts a real
// @mention for `entityId` at the end of the given context question's
// Focus field (`key.summary`) and commits it the same way any other
// mention insertion does.
function insertContextMention(key, entityId) {
  const ent = getEntity(store.get(), entityId);
  const field = root.querySelector(`[data-ctx="${key}.summary"]`);
  if (!ent || !field) return;
  const range = document.createRange();
  range.selectNodeContents(field);
  range.collapse(false);
  insertMentionNode(range, { kind: 'entity', entityId, name: ent.name || 'Unnamed' });
  field.focus();
  commitMentionField(field);
  toast(`Mentioned ${ent.name || 'Unnamed'} in Focus`);
}

// Shared by clicking a suggestion and pressing Enter on the highlighted one.
function chooseMentionSuggestItem(index) {
  if (!mentionSuggest) return;
  const { field, node, start, end, items } = mentionSuggest;
  const item = items[index];
  if (!item) return closeMentionSuggest();
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  closeMentionSuggest();
  if (item.kind === 'entity') {
    insertMentionNode(range, { kind: 'entity', entityId: item.id, name: item.label });
    field.focus();
    commitMentionField(field);
  } else {
    // Inserted pageless immediately, same reasoning as the drag-and-drop
    // doc-mention path above: refine with an optional page via the inline
    // prompt after inserting, instead of blocking on window.prompt() first.
    const span = insertMentionNode(range, { kind: 'doc', tabKey: item.tabKey, name: item.title });
    field.focus();
    commitMentionField(field);
    openInlinePrompt('mention-page', {
      label: `Page in "${item.title}"? (optional)`, placeholder: 'e.g. 12',
      meta: { mentionEl: span }, anchorRect: span.getBoundingClientRect(),
    });
  }
}

// document.caretRangeFromPoint (Chrome/Safari) / caretPositionFromPoint
// (Firefox) — the two ways to ask "what text position is under this pixel",
// needed to place a drag-and-dropped mention exactly where the cursor let
// go, the same way a native text drop would land at that spot.
function caretRangeAtPoint(clientX, clientY) {
  if (document.caretRangeFromPoint) return document.caretRangeFromPoint(clientX, clientY);
  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(clientX, clientY);
    if (!pos) return null;
    const r = document.createRange();
    r.setStart(pos.offsetNode, pos.offset);
    r.collapse(true);
    return r;
  }
  return null;
}

// ---- rendering ----------------------------------------------------------
function render() {
  const doc = store.get();
  if (!doc || !root) return;

  root.querySelector('.campaign-title').textContent = doc.meta.title;

  const strip = root.querySelector('[data-strip]');
  strip.innerHTML = CONTEXT_QUESTIONS.map((k) => {
    const sel = doc.context.active === k;
    return `<button class="mc-q" data-question="${k}" role="tab" aria-selected="${sel}">
      <span class="q-key">${QUESTION_LABELS[k]}</span>
      <span class="q-val">${escapeHtml(contextSummary(doc.context, k)) || '—'}</span>
    </button>`;
  }).join('');

  const bc = root.querySelector('[data-breadcrumb]');
  const crumbs = doc.timeline.length ? doc.timeline : [{ label: doc.meta.title }, { label: `Scene ${doc.scenes.length}` }];
  bc.innerHTML = crumbs.map((c, i) => `${i ? '<span class="sep">▸</span>' : ''}<span class="crumb">${escapeHtml(c.label || '')}</span>`).join(' ');

  root.querySelector('[data-workspace]').innerHTML = renderWorkspace(doc, doc.context.active, buildDrawerUi());
  // A freshly-rendered Scene field textarea starts at its rows="1" default
  // regardless of how much text it holds — only typing into it fires the
  // 'input' event that would otherwise trigger autoGrowSceneField, so a
  // field that already holds a long value needs this one-time sizing pass
  // to open at its real height instead of waiting for the next keystroke.
  root.querySelectorAll('[data-scene-field]').forEach(autoGrowSceneField);
  root.querySelector('[data-copilot-body]').innerHTML = renderCopilot(doc);
  root.querySelector('[data-copilot]').dataset.open = String(copilotOpen);

  const linkCount = Math.round(((doc.entities.items || []).reduce((s, e) => s + ((e.relationships || []).length), 0)) / 2);
  const badges = {
    journal: doc.journal.length || '', cast: (doc.entities.items || []).length || '', graph: linkCount || '',
    party: (doc.party && doc.party.trackers && doc.party.trackers.length) || '',
  };
  const edge = root.querySelector('[data-edge]');
  edge.innerHTML = EDGE_ORDER.map((id) => {
    if (id === 'copilot') return `<button data-toggle-copilot title="Co-Pilot"><span class="glyph">💡</span><b>Co-Pilot</b></button>`;
    const d = drawerMeta(id);
    if (!d) return '';
    const badge = badges[d.id] || '';
    if (id === 'cast') {
      const isOpen = anchoredDrawer === 'cast' || openDrawers.includes('cast');
      return `<button data-toggle-cast aria-expanded="${isOpen}" title="Cast — a draggable, searchable entity list; opens anchored beside whichever drawer is active by default"><span class="glyph">${d.glyph}</span><b>${d.label}</b>${badge ? `<span class="badge">${badge}</span>` : ''}</button>`;
    }
    return `<button data-drawer-open="${d.id}" aria-expanded="${activeDrawer === d.id}" title="${d.label}">
      <span class="glyph">${d.glyph}</span><b>${d.label}</b>${badge ? `<span class="badge">${badge}</span>` : ''}
    </button>`;
  }).join('');

  // Party/Colony/Journal's own small tab group in the header ("USER
  // CHANGES" QoL batch) — same [data-drawer-open] routing as the edge nav
  // above (onClick doesn't care which container it lives in), just a
  // compact horizontal button instead of the edge nav's icon tile.
  const headerTabs = root.querySelector('[data-header-drawer-tabs]');
  if (headerTabs) {
    headerTabs.innerHTML = HEADER_ORDER.map((id) => {
      const d = drawerMeta(id);
      if (!d) return '';
      const badge = badges[d.id] || '';
      return `<button class="btn ghost sm" data-drawer-open="${d.id}" aria-expanded="${activeDrawer === d.id}" title="${d.label}"><span class="glyph">${d.glyph}</span> <span class="btn-label">${d.label}</span>${badge ? `<span class="badge">${badge}</span>` : ''}</button>`;
    }).join('');
  }

  const settingsMenuEl = root.querySelector('[data-settings-menu]');
  if (settingsMenuEl) settingsMenuEl.hidden = !settingsMenuOpen;

  const aboutEl = root.querySelector('[data-about-overlay]');
  if (aboutEl) {
    aboutEl.hidden = !aboutOpen;
    if (aboutOpen) {
      const buildEl = aboutEl.querySelector('[data-about-build]');
      if (buildEl) buildEl.textContent = `Phase ${BUILD.phase} · v${BUILD.version} — ${BUILD.label}`;
    }
  }

  const drawer = root.querySelector('[data-drawer]');
  drawer.dataset.open = String(openDrawers.length > 0 && !drawerCollapsed);
  const titleEl = drawer.querySelector('[data-drawer-title]');
  titleEl.textContent = titleForDrawer(doc, activeDrawer);
  titleEl.classList.remove('drawer-title-toggle'); // Cast's own collapse-via-title is gone — Cast isn't a drawer tab anymore
  titleEl.title = '';
  drawer.style.setProperty('--drawer-w', (doc.drawers.widths[activeDrawer] || 420) + 'px');
  const drawerHeadExtra = drawer.querySelector('[data-drawer-head-extra]');
  if (drawerHeadExtra) drawerHeadExtra.innerHTML = headExtraForDrawer(activeDrawer);
  // Tab strip — same pattern as the doc viewer's own tabs below: one pinned
  // drawer per tab, click to switch, ✕ to close without needing to make it
  // active first. Hidden entirely when only one (or zero) drawers are open,
  // so the common case looks identical to the old single-drawer UI. Each
  // tab also gets an anchor icon (⇤) that pulls it out of this stack
  // entirely and pins it to its own side panel left of the main drawer
  // (see anchorDrawerTab) — e.g. Journal anchored left of Oracle while
  // rolling, so both stay visible at once.
  const drawerTabsEl = root.querySelector('[data-drawer-tabs]');
  drawerTabsEl.hidden = openDrawers.length < 2;
  drawerTabsEl.innerHTML = openDrawers.length < 2 ? '' : (
    `<div class="drawer-tabs-scroll">${openDrawers.map((id) => {
      const m = drawerMeta(id);
      return `<button class="drawer-tab ${id === activeDrawer ? 'active' : ''}" data-drawer-tab="${id}" title="${m ? m.label : id}">
        <span class="glyph">${m ? m.glyph : ''}</span><span class="drawer-tab-label">${m ? m.label : id}</span>
        <span class="drawer-tab-anchor" data-drawer-tab-anchor="${id}" title="Anchor beside the main drawer" aria-label="Anchor ${m ? m.label : id} beside the main drawer">⇤</span>
        <span class="drawer-tab-close" data-drawer-tab-close="${id}" aria-label="Close ${m ? m.label : id}">✕</span>
      </button>`;
    }).join('')}</div>
    <button class="drawer-tabs-collapse" data-drawer-collapse title="Hide the drawer (keeps its tabs open — click the floating icon to bring it back)" aria-label="Hide drawer">⌄</button>
    <button class="drawer-tabs-close-all" data-close-all-drawers title="Close all open tabs" aria-label="Close all open tabs">✕</button>`
  );
  const restoreBtn = root.querySelector('[data-drawer-restore]');
  if (restoreBtn) restoreBtn.hidden = !(drawerCollapsed && openDrawers.length > 0);
  renderDrawerBody();

  // The anchor panel — a second, independent "current drawer" slot pinned
  // left of the main drawer (see anchoredDrawer's doc comment). Uses the
  // exact same renderDrawer()/titleForDrawer() the main drawer does; the
  // two are otherwise unrelated (a drawer is either a normal tab or
  // anchored, never both — see openDrawerTab/anchorDrawerTab).
  const anchorPanel = root.querySelector('[data-drawer-anchor]');
  anchorPanel.dataset.open = String(!!anchoredDrawer);
  anchorPanel.querySelector('[data-drawer-anchor-title]').textContent = titleForDrawer(doc, anchoredDrawer);
  const anchorHeadExtra = anchorPanel.querySelector('[data-drawer-anchor-head-extra]');
  if (anchorHeadExtra) anchorHeadExtra.innerHTML = headExtraForDrawer(anchoredDrawer);
  const mainDrawerWidthPx = openDrawers.length > 0 ? (doc.drawers.widths[activeDrawer] || 420) : 0;
  anchorPanel.style.setProperty('--anchor-offset', mainDrawerWidthPx + 'px');
  anchorPanel.style.setProperty('--anchor-w', (doc.drawers.widths[anchoredDrawer] || 420) + 'px');
  renderDrawerAnchorBody();

  const viewer = root.querySelector('[data-doc-viewer]');
  const openTabs = (doc.documents && doc.documents.openTabs) || [];
  viewer.hidden = openTabs.length === 0;
  // Stop the viewer short of whatever drawer is currently open (it's always
  // the Documents drawer in practice, since that's the only place a
  // data-doc-open link exists) — the drawer sits at a higher z-index, so
  // without this the viewer's own controls (e.g. a tab's close button)
  // render underneath the drawer and become unclickable despite being
  // visible. Accounts for an anchored drawer too, if one is pinned beside
  // the main drawer (sidePanelInsetPx below).
  viewer.style.setProperty('--viewer-overlap', `${sidePanelInsetPx(doc)}px`);
  if (openTabs.length) {
    const activeTab = doc.documents.activeTab && openTabs.includes(doc.documents.activeTab)
      ? doc.documents.activeTab : openTabs[openTabs.length - 1];
    viewer.querySelector('[data-doc-viewer-tabs]').innerHTML = openTabs.map((key) => {
      const resolved = resolveDocumentTab(doc, key);
      const title = resolved ? resolved.title : 'Document';
      return `<button class="doc-viewer-tab ${key === activeTab ? 'active' : ''}" data-doc-viewer-tab="${escapeHtml(key)}" title="${escapeHtml(title)}">
        <span class="doc-viewer-tab-title">${escapeHtml(title)}</span>
        <span class="doc-viewer-tab-close" data-doc-viewer-tab-close="${escapeHtml(key)}" aria-label="Close tab">✕</span>
      </button>`;
    }).join('');

    const resolvedActive = resolveDocumentTab(doc, activeTab);
    const frame = viewer.querySelector('[data-doc-viewer-frame]');
    const empty = viewer.querySelector('[data-doc-viewer-empty]');
    if (resolvedActive && resolvedActive.src) {
      frame.hidden = false;
      empty.hidden = true;
      if (lastDocViewerSrc !== resolvedActive.src) {
        // Two mentions of the SAME document at different pages (docs/adr's
        // @[Name#12] vs @[Name#45]) resolve to a src differing only in its
        // #page=N fragment — a browser's built-in PDF viewer doesn't
        // reliably jump to the new page when an iframe's src is reassigned
        // to a URL that differs ONLY by fragment (it isn't always treated
        // as a real navigation the way a differing path/query is). Forcing
        // a real reload (blank, then the real src) makes clicking the
        // second mention actually jump, not just silently update the src
        // attribute with no visible effect.
        frame.src = 'about:blank';
        frame.src = resolvedActive.src;
        lastDocViewerSrc = resolvedActive.src;
      }
    } else {
      // A resolved 'lib' entry with no dataUrl means the file never actually
      // saved (e.g. an old campaign that predates store.js's quota-rollback
      // fix) — show a message instead of a blank iframe.
      frame.hidden = true;
      frame.removeAttribute('src');
      empty.hidden = false;
      empty.textContent = resolvedActive
        ? `"${resolvedActive.title}" couldn't be loaded — it may have failed to save (browser storage limits). Try re-adding it, or for large rulebooks add the PDF to assets/docs/ and rebuild.`
        : 'This document is no longer available.';
      lastDocViewerSrc = null;
    }
  }

  renderSearchOverlay();
  renderDiceRollOverlay();
}

// Lives outside the drawer/workspace update paths above since it's a
// header-level overlay, not a drawer — same "static skeleton, targeted
// update" approach as the doc viewer just above.
function renderSearchOverlay() {
  const overlay = root && root.querySelector('[data-search-overlay]');
  if (!overlay) return;
  overlay.hidden = !searchOpen;
  const resultsEl = overlay.querySelector('[data-search-results]');
  if (resultsEl) resultsEl.innerHTML = searchOpen ? renderSearchPanel(store.get(), searchQuery) : '';
}

// The dice roll window (performFieldRoll's replacement for a plain toast) —
// a graphical breakdown of the roll: the action/flat/traveller die(s) plus
// the field's value added up on one row, whatever it's being measured
// against (2d10 challenge dice for an action roll, a flat target number for
// flat/traveller) on another, and a big color-coded outcome banner, styled
// after a real dice-roller app rather than a plain text toast. Docked at
// the bottom-right corner (like a toast, but persistent until dismissed)
// rather than a centered, backdrop-dimmed modal, so it doesn't block
// working in the rest of the app while it's up. Same "static skeleton,
// targeted update" approach as the search overlay above, using data-open
// (not [hidden]) so the corner slide-in can actually transition.
function renderDiceRollOverlay() {
  const overlay = root && root.querySelector('[data-dice-roll-overlay]');
  if (!overlay) return;
  overlay.dataset.open = String(!!diceRollResult);
  const card = overlay.querySelector('[data-dice-roll-card]');
  if (!card) return;
  card.innerHTML = diceRollResult ? diceRollCardHtml(diceRollResult.label, diceRollResult.method, diceRollResult.r) : '';
}

// A drawn pip-die face (rounded square + dots), not a Unicode ⚀-⚅ glyph —
// font/platform glyph coverage for that Unicode block is unreliable (it
// rendered as a blank tofu box in an actual browser check), and an SVG
// draws identically everywhere with no build-time asset (this app ships as
// a single bundled script, no image pipeline).
const DIE_PIP_POSITIONS = {
  1: [[12, 12]],
  2: [[7, 7], [17, 17]],
  3: [[7, 7], [12, 12], [17, 17]],
  4: [[7, 7], [17, 7], [7, 17], [17, 17]],
  5: [[7, 7], [17, 7], [12, 12], [7, 17], [17, 17]],
  6: [[7, 6], [17, 6], [7, 12], [17, 12], [7, 18], [17, 18]],
};
function diePipsIcon(n) {
  const pts = DIE_PIP_POSITIONS[Math.max(1, Math.min(6, n | 0))];
  const pips = pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="currentColor" stroke="none"/>`).join('');
  return `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="2" width="20" height="20" rx="4.5"/>${pips}</svg>`;
}

// Shared by the dice roll window's copy (⧉) and "add to Journal" buttons —
// both want the exact same plain-text rendering of the result, just sent
// to a different place.
function diceRollCopyText({ method, r }) {
  return method === 'flat' ? formatFlatRollCopyText(r) : method === 'traveller' ? formatTravellerRollCopyText(r) : formatRollCopyText(r);
}

// An open-book outline, not the 📖 emoji — color-emoji glyph coverage is
// unreliable here (confirmed by a real browser check: it rendered as a
// blank box), same issue the die-face SVGs already worked around.
const JOURNAL_ADD_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 5c2.5-1 5.5-1 8 .5 2.5-1.5 5.5-1.5 8-.5v14c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5Z"/><path d="M12 5.5v14"/></svg>';

// A d10-ish diamond outline — a d10 has no equivalent Unicode/simple-pip
// convention the way a d6 does, so the challenge/target die gets a plain
// diamond instead, matching the screenshot's iconography.
const DICE_DIAMOND_ICON = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2 L22 12 L12 22 L2 12 Z"/></svg>';
const DICE_TARGET_ICON = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/></svg>';

function diceRollCardHtml(label, method, r) {
  const addsPart = r.adds ? ` + ${r.adds}` : '';
  let rows, outcomeLabel, outcomeClass;
  if (method === 'flat' || method === 'traveller') {
    const diceIcon = method === 'traveller'
      ? `<span class="dice-face-pair">${diePipsIcon(r.die1)}${diePipsIcon(r.die2)}</span>`
      : diePipsIcon(r.die);
    const dieSum = method === 'traveller' ? `${r.die1} + ${r.die2}` : `${r.die}`;
    rows = [
      { icon: diceIcon, label: 'Roll', text: `${dieSum} + ${r.value}${addsPart} = ${r.total}` },
      { icon: DICE_TARGET_ICON, label: 'Target', text: `${r.target}` },
    ];
    outcomeLabel = r.outcomeLabel;
    outcomeClass = r.outcome; // 'success' | 'fail'
  } else {
    rows = [
      { icon: diePipsIcon(r.actionDie), label: 'Action', text: `${r.actionDie} + ${r.value}${addsPart} = ${r.total}` },
      { icon: DICE_DIAMOND_ICON, label: 'Challenge', text: `${r.challenge1}, ${r.challenge2}${r.match ? ' (match)' : ''}` },
    ];
    outcomeLabel = r.outcomeLabel;
    outcomeClass = r.outcome; // 'strong-hit' | 'weak-hit' | 'miss'
  }
  const rowsHtml = rows.map((row) => `
    <div class="dice-roll-row" title="${escapeHtml(row.label)}">
      <span class="dice-roll-icon">${row.icon}</span>
      <span class="dice-roll-formula">${escapeHtml(row.text)}</span>
    </div>`).join('');
  return `
    <div class="dice-roll-head">
      <h3 class="dice-roll-label">${escapeHtml(label)}</h3>
      <div class="dice-roll-head-actions">
        <button class="icon-btn" data-dice-roll-copy title="Copy result">⧉</button>
        <button class="icon-btn" data-dice-roll-journal title="Add to Journal">${JOURNAL_ADD_ICON}</button>
        <button class="icon-btn" data-dice-roll-close aria-label="Close">✕</button>
      </div>
    </div>
    <div class="dice-roll-body">
      <div class="dice-roll-rows">${rowsHtml}</div>
      <div class="dice-roll-outcome dice-outcome-${outcomeClass}">${escapeHtml(outcomeLabel.toUpperCase())}</div>
    </div>`;
}

// Total horizontal space (in px) the main drawer + an anchored drawer (if
// pinned) together occupy, immediately left of the edge tabs — what the doc
// viewer's --viewer-overlap needs to stay clear of, so its own controls
// (e.g. a tab's close button) don't render underneath (and therefore
// unclickable behind) either drawer panel. A collapsed main drawer
// (drawerCollapsed) is visually gone — the viewer should reclaim that
// space and expand to cover the workspace behind it, the same "see what's
// underneath" goal the collapse arrow itself exists for — so it drops out
// of this calculation entirely while collapsed. The anchor panel isn't
// affected by the main drawer's collapse state, so it still counts.
function sidePanelInsetPx(doc) {
  let px = 0;
  if (openDrawers.length > 0 && !drawerCollapsed) px += doc.drawers.widths[activeDrawer] || 420;
  if (anchoredDrawer) px += doc.drawers.widths[anchoredDrawer] || 420;
  return px;
}

// Entity Detail's title names whichever entity it's currently showing —
// there's only ever the one active entity, so unlike every other drawer
// there's no separate list to distinguish it from. Shared by both the main
// drawer and the anchor panel, since either can show it.
function titleForDrawer(doc, id) {
  if (id === 'entity-detail') {
    const active = getEntity(doc, doc.entities && doc.entities.activeId);
    return active ? `Entity — ${active.name || 'Unnamed'}` : 'Entity';
  }
  const meta = drawerMeta(id);
  return meta ? meta.label : 'Drawer';
}

// Cast's "Generate…" dropdown is the one drawer-specific control that lives
// in the HEAD (next to the close ✕/unpin ▶) rather than the body — every
// other drawer's own controls (Party's "+ Tracker", Trade's "+ Contract",
// ...) stay inside their own body content, but Cast's search/filter/list
// already fills that space, and the dropdown needs to read "right next to
// the close button" regardless of whether Cast is the main drawer or
// anchored. Both head-extra slots call this; it's a no-op ('') for every
// other drawer id.
function castGenerateSelectHtml() {
  return `<select class="entity-generate-select" data-entity-generate title="Create a new entity of this type">
    <option value="" selected>Generate…</option>
    ${ENTITY_TYPES.map((t) => `<option value="${t}">${TYPE_LABEL[t]}</option>`).join('')}
    <option value="generate-npc">🎲 NPC (rolled)</option>
    <option value="catalog-item">📦 Item (from catalog)</option>
  </select>`;
}
function headExtraForDrawer(id) {
  if (id === 'cast') return castGenerateSelectHtml();
  // Guide/Documents' top-of-drawer intro tips have no in-content header of
  // their own to sit next to (unlike a Settings group's <h3> or Documents'
  // own "Reference Library" <h4>, both wrapped directly where they're
  // rendered) — the drawer's own chrome title fills that role instead, so
  // the toggle icon lives in its head-extra slot; the tip text itself still
  // unfolds inside the drawer body (guide()/documents()), reading
  // ui.helpOpen the same way every other instance does.
  if (id === 'guide') return helpToggle('guide-intro');
  if (id === 'documents') return helpToggle('documents-intro');
  return '';
}

// Every ephemeral UI flag a drawer template might read, in one place —
// shared by the main drawer and the anchor panel (renderDrawerAnchorBody
// below) since either can be asked to render any drawer id.
function buildDrawerUi() {
  return {
    oracleFilter, expandedOracleGroups, oracleEditorOpen, oracleTagEditorOpen, oracleTagFilter, docFilter, docTagFilters, docTagEditorOpen, docRenameOpen, docTagListOpen, statblockAddOpen, collapsedStatblockGroups, recapOpen, graphView,
    entitySearch, entityTypeFilter, entityTagFilters, entityTagListOpen, catalogPickerOpen, catalogSearch, storageInfo: store.storageInfo(),
    enhancementDraft, expandedEnhancements, expandedWorldDemographics, expandedWorldProfile, mechanicsScanning, tocScanning, lensPickerOpen, lensDraw,
    expandedGuideNodes, guideRenameOpen,
    partyTrackerAddOpen, partyTrackerDraftKind, partyTrackerDraftName,
    tradeLocationId, tradeContractAddOpen,
    journalEditOpen, whereLocationTagFilter, whoTagFilter, graphFilter, helpOpen, settingsMenuOpen, aboutOpen,
    galleryFilter, galleryTagFilters, galleryTagListOpen, galleryUploadDraft,
    battlemapPlacingIcon,
  };
}

function renderDrawerBody() {
  const doc = store.get();
  const body = root && root.querySelector('[data-drawer-body]');
  if (body) {
    body.innerHTML = activeDrawer ? renderDrawer(activeDrawer, doc, buildDrawerUi()) : '';
  }
  // Every ephemeral UI flag this touches (oracleFilter, recapOpen, ...)
  // could equally apply to whichever drawer is anchored, not just the main
  // one — refreshing both here means none of renderDrawerBody's many call
  // sites need to remember to also call renderDrawerAnchorBody themselves.
  renderDrawerAnchorBody();
  // Clicking any entity link (inline mention, WHO/WHERE chip, relationship
  // chip, graph node, ...) sets this so the Cast inspector's name field is
  // immediately focused+selected once it renders — "single click opens it
  // AND puts you right on the name," not just a switch to the Cast tab.
  if (focusInspectorNameNextRender) {
    focusInspectorNameNextRender = false;
    const nameInput = root && root.querySelector('.inspector-name');
    if (nameInput) { nameInput.focus(); nameInput.select(); }
  }
}

// The anchor panel's content — same renderDrawer()/buildDrawerUi() the main
// drawer uses, just targeting the anchor panel's own body element. A drawer
// is never both anchored AND the active tab at once (see openDrawerTab/
// anchorDrawerTab), so there's no risk of double-rendering the same id.
function renderDrawerAnchorBody() {
  const doc = store.get();
  const body = root && root.querySelector('[data-drawer-anchor-body]');
  if (body) body.innerHTML = anchoredDrawer ? renderDrawer(anchoredDrawer, doc, buildDrawerUi()) : '';
}

// A store.update() that fails to persist (most commonly localStorage quota
// exceeded — see store.js's persist()) rolls back and throws, by design
// (Article VIII: never show a change as "there" when it silently failed to
// save). But every delegated handler above calls store.update() bare, with
// no try/catch — an uncaught throw there used to mean the interaction just
// silently did nothing (the state visibly reverted via the rollback
// render(), and the actual error only ever reached the browser console,
// which most GMs never open). Wrapping dispatch here means ANY handler
// failure — not just this one cause — surfaces as a toast instead of a
// click that appears to do nothing. This is the single choke point every
// interaction already passes through (rule 4: one delegated listener per
// event type), so it's one wrapper, not one try/catch per call site.
function guarded(fn) {
  return function guardedHandler(ev) {
    try { return fn(ev); } catch (err) {
      console.error('Interaction failed:', err);
      toast(`Couldn't save — ${err && err.message ? err.message : 'an error occurred'}. Storage may be full; try exporting your campaign as a backup.`);
    }
  };
}

// ---- helpers ------------------------------------------------------------
function toast(msg) {
  const el = root.querySelector('[data-toast]');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.classList.remove('show'); el.hidden = true; }, 2200);
}

function restoreFocus(sel) {
  const el = root.querySelector(sel);
  if (el) { const v = el.value; el.focus(); try { el.setSelectionRange(v.length, v.length); } catch {} }
}

function exportJournal() {
  const doc = store.get();
  const text = (doc.journal || []).map((e) => `${new Date(e.createdAt).toLocaleString()} — ${e.source}\n${stripHtml(e.text)}`).join('\n\n');
  download(`gmatlas-journal-${stamp()}.txt`, text || 'No journal entries.');
}

function download(name, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function stamp() { return new Date().toISOString().slice(0, 19).replace(/:/g, '-'); }
function stripHtml(s) { return String(s || '').replace(/<[^>]+>/g, ''); }
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
