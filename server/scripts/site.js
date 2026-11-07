// site.js — builds the browser app and assembles ../_site, the static files
// the Worker serves beside /api (wrangler.toml [assets]). Mirrors the
// "Assemble Pages site" step in .github/workflows/deploy-pages.yml, so the
// two deployments publish the same files: no Reference Library PDFs, and the
// bundle flattened to ./app.bundle.js.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const site = join(root, '_site');

execFileSync(process.execPath, [join(root, 'scripts', 'build.js')], { cwd: root, stdio: 'inherit' });

rmSync(site, { recursive: true, force: true });
mkdirSync(site);
cpSync(join(root, 'manifest.webmanifest'), join(site, 'manifest.webmanifest'));
cpSync(join(root, 'styles'), join(site, 'styles'), { recursive: true });
cpSync(join(root, 'assets'), join(site, 'assets'), { recursive: true, filter: (src) => !src.startsWith(join(root, 'assets', 'docs')) });
cpSync(join(root, 'dist', 'app.bundle.js'), join(site, 'app.bundle.js'));
for (const file of ['index.html', 'sw.js']) {
  const text = readFileSync(join(root, file), 'utf8').replace(/\.\/dist\/app\.bundle\.js/g, './app.bundle.js');
  writeFileSync(join(site, file), text);
}
console.log(`Assembled ${site}`);
