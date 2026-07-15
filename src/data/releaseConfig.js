// releaseConfig.js — where the Reference Library's PDFs live once they
// aren't present locally (docs/adr/0039-reference-library-release-hosting.md).
// A GitHub Release, not Git LFS — LFS bandwidth is a metered, easily-
// exhausted quota (this repo hit its 10GB monthly cap from CI re-pulling the
// same ~469MB of PDFs on every push); a Release asset is a normal HTTPS
// download with no such per-repo bandwidth ceiling.
//
// One constant to bump if the PDFs are ever re-uploaded under a new tag
// (e.g. after adding/removing a title) — nothing else in the app hardcodes
// a release tag.
export const REFERENCE_LIBRARY_RELEASE_TAG = 'reference-library-v1';

const REPO = 'meta5by5/GMAtlas';

/** Builds a GitHub Release asset download URL for one Reference Library
 *  file — `filename` is the raw on-disk name (referenceLibraryManifest.js's
 *  `releaseAsset`), never a path (a release asset has no directory
 *  structure). Each path segment element is individually
 *  `encodeURIComponent`-ed since several filenames contain spaces/
 *  parentheses ("Intergalactic Space Trader (IST) 01_PlanetEconomy.pdf"). */
export function releaseAssetUrl(filename, tag = REFERENCE_LIBRARY_RELEASE_TAG) {
  return `https://github.com/${REPO}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(filename)}`;
}
