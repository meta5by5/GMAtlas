// dnd5ePdfImport.js — the async, browser-only half of the D&D 5e PDF
// character-sheet importer (direct request, phase 4): drives the vendored
// PDF.js UMD build (assets/vendor/pdfjs/, window.pdfjsLib — same one
// mechanicsScan.js/tocScan.js already use) to read a GM-uploaded D&D Beyond
// character-sheet PDF export's own AcroForm field values, then hands the
// plain {fieldName: value} map to domain/dnd5eImport.js's pure
// mapDnd5ePdfFieldsToCharacterSheet() to do the actual field-mapping.
// Deliberately NOT in src/domain/ — architectural rule 3 requires the
// domain layer stay pure/synchronous/DOM-free, and reading a File through
// PDF.js is neither.
//
// Real finding, confirmed against an actual export (not assumed): a D&D
// Beyond character-sheet PDF's values are NOT part of the page's drawn
// text layer at all (getTextContent() only ever returns the STATIC labels
// baked into the page background — "SPECIES", "CLASS & LEVEL", etc., never
// "Dwarf" or "Cleric 5 / Fighter 2") — they live in real, cleanly-named
// AcroForm fields instead (page.getAnnotations(), each entry's
// `fieldName`/`fieldValue`). That's a far more reliable source than
// reconstructing a column layout from text-item positions would have
// been, so that's what this reads.
//
// Same file:// restriction every other PDF.js feature in this app already
// has (Chromium blocks a file:// page's fetch of another file:// resource
// outright) — checked up front here too, same message pattern as
// mechanicsScan.js's own scanMechanicsIndex().
import { configureWorker } from './mechanicsScan.js';
import { mapDnd5ePdfFieldsToCharacterSheet } from '../domain/dnd5eImport.js';

/** Reads every page's AcroForm field values from `file` (a real uploaded
 *  PDF, e.g. from a file input's `files[0]`) and returns
 *  mapDnd5ePdfFieldsToCharacterSheet()'s result — the review-step UI's job
 *  to show before anything is actually written to the campaign. Throws
 *  with a clear message if PDF.js hasn't loaded, under file://, or if the
 *  PDF has no AcroForm fields at all (not a D&D Beyond export, or a
 *  flattened/scanned PDF with no fillable fields — nothing to read). */
export async function parseDnd5eCharacterSheetPdf(file) {
  const pdfjsLib = typeof window !== 'undefined' && window.pdfjsLib;
  if (!pdfjsLib) throw new Error('PDF.js did not load — check assets/vendor/pdfjs/pdf.min.js');
  if (typeof location !== 'undefined' && location.protocol === 'file:') {
    throw new Error('PDF import needs the app served over http(s) — run `npm run serve` and try again (file:// blocks reading local PDFs for security reasons)');
  }
  configureWorker(pdfjsLib);

  const url = URL.createObjectURL(file);
  let fields = {};
  try {
    const doc = await pdfjsLib.getDocument(url).promise;
    let sawAnyField = false;
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const annots = await page.getAnnotations();
      for (const a of annots) {
        if (!a.fieldName) continue;
        // A checkbox's own fieldValue is "Off"/"On" (or the widget's own
        // export value), not a real character value to carry across —
        // this template's checkboxes (death-save trackers, the character
        // portrait's own image field, an unused header row) don't map to
        // anything in this app's dnd5e sections, so they're skipped
        // entirely rather than polluting the merged field map with
        // "Off" strings.
        if (a.fieldType === 'Btn') continue;
        sawAnyField = true;
        // Real export field names repeat verbatim across pages
        // (CharacterName/CharacterName2/... all carry the identical
        // value) — merging by exact name, page order, last-page-wins is
        // safe since duplicates never actually disagree.
        if (a.fieldValue !== null && a.fieldValue !== undefined) fields[a.fieldName] = a.fieldValue;
      }
    }
    if (!sawAnyField) {
      throw new Error('This PDF has no fillable character-sheet fields to read — is it a D&D Beyond character sheet export?');
    }
  } finally {
    URL.revokeObjectURL(url);
  }

  return mapDnd5ePdfFieldsToCharacterSheet(fields);
}
