// site.js — builds the browser app and assembles ../_site, the static files
// the Worker serves beside /api (wrangler.toml [assets]). Mirrors the
// "Assemble Pages site" step in .github/workflows/deploy-pages.yml, so the
// two deployments publish the same files, with the bundle flattened to
// ./app.bundle.js. Of the Reference Library PDFs, only the openly licensed
// ones ship (below); the Pages copy ships none.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const site = join(root, '_site');

execFileSync(process.execPath, [join(root, 'scripts', 'build.js')], { cwd: root, stdio: 'inherit' });

rmSync(site, { recursive: true, force: true });
mkdirSync(site);
cpSync(join(root, 'manifest.webmanifest'), join(site, 'manifest.webmanifest'));
cpSync(join(root, 'styles'), join(site, 'styles'), { recursive: true });
cpSync(join(root, 'assets'), join(site, 'assets'), { recursive: true, filter: (src) => !src.startsWith(join(root, 'assets', 'docs')) });
// Sourcebook PDFs: only the openly licensed (CC-BY) ones are served. Every
// other publisher's book comes in through "Import my copy" (roadmap 4.5;
// src/domain/permissions.js referenceDocSource).
const { LICENSES } = await import(pathToFileURL(join(root, 'src', 'data', 'licenses.js')).href);
// Workers static assets take files up to 25 MiB; a bigger open PDF isn't
// served (the app offers Import my copy for open books too).
const MAX_ASSET_BYTES = 25 * 1024 * 1024;
let openDocs = 0;
for (const file of LICENSES.filter((l) => l.open).flatMap((l) => l.docs)) {
  if (!existsSync(join(root, file))) continue;
  if (statSync(join(root, file)).size > MAX_ASSET_BYTES) { console.warn(`  not served (over 25 MiB): ${file}`); continue; }
  mkdirSync(dirname(join(site, file)), { recursive: true });
  cpSync(join(root, file), join(site, file));
  openDocs += 1;
}
// Which online GMAtlas this build points at (account.js ACCOUNT_SERVICE_URL):
// production for `--production`, else the dev site.
const production = process.argv.includes('--production');
const SERVICE_LINE = "ACCOUNT_SERVICE_URL = 'https://gmatlas.online/'";
let bundle = readFileSync(join(root, 'dist', 'app.bundle.js'), 'utf8');
if (!bundle.includes(SERVICE_LINE)) throw new Error('ACCOUNT_SERVICE_URL not found in the bundle; update scripts/site.js to match src/core/account.js.');
if (!production) bundle = bundle.replace(SERVICE_LINE, "ACCOUNT_SERVICE_URL = 'https://dev.gmatlas.online/'");
// Which certificate keys it trusts (data/certKeys.js pins production's):
// a dev build trusts only the dev key, so certificates never cross between
// the two environments.
if (!production) {
  const toml = readFileSync(join(root, 'server', 'wrangler.toml'), 'utf8');
  const kid = (/^CERT_KEY_ID\s*=\s*"([^"]+)"/m.exec((/^\[vars\]([\s\S]*?)(?=^\[)/m.exec(toml) || [])[1] || '') || [])[1];
  const key = JSON.parse(readFileSync(join(root, 'server', 'keys', `cert-${kid}.public.json`), 'utf8'));
  const KEYS = /CERT_PUBLIC_KEYS = \[[\s\S]*?\];/;
  if (!KEYS.test(bundle)) throw new Error('CERT_PUBLIC_KEYS not found in the bundle; update scripts/site.js to match src/data/certKeys.js.');
  bundle = bundle.replace(KEYS, () => `CERT_PUBLIC_KEYS = [${JSON.stringify(key)}];`);
}
writeFileSync(join(site, 'app.bundle.js'), bundle);
// The admin page (admin.html + its own bundle) ships only beside the
// service, never to the static Pages copy. It talks to its own origin.
cpSync(join(root, 'dist', 'admin.bundle.js'), join(site, 'admin.bundle.js'));
for (const file of ['index.html', 'sw.js', 'admin.html']) {
  const text = readFileSync(join(root, file), 'utf8').replace(/\.\/dist\/(app|admin)\.bundle\.js/g, './$1.bundle.js');
  writeFileSync(join(site, file), text);
}
console.log(`Assembled ${site} (${openDocs} open-licence PDFs) for ${production ? 'production (gmatlas.online)' : 'dev (dev.gmatlas.online)'}`);
