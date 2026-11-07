// release.js — the ONLY way code reaches production (https://gmatlas.online).
// Everyday deploys (`npm run deploy`) go to dev (https://dev.gmatlas.online).
//
//   npm run release:production -- --confirm gmatlas.online
//
// Refuses unless every check passes, then:
//   1. tags the release (prod-YYYYMMDD-HHMM) and pushes the tag,
//   2. applies D1 migrations to the production database,
//   3. builds the site for production and deploys [env.production].
//
// Checks:
//   - on `main`, clean working tree, and HEAD is exactly origin/main
//     (production only ever runs code that's on main on GitHub);
//   - core and server tests pass;
//   - production is configured: a real D1 database_id, and its certificate
//     key (CERT_KEY_ID p1) pinned in src/data/certKeys.js with its public
//     half in keys/ (otherwise every signed-in browser would reject it).
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const root = join(serverDir, '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const confirm = args[args.indexOf('--confirm') + 1];

const fail = (msg) => { console.error(`\nRelease refused: ${msg}`); process.exit(1); };
const git = (cmd) => execSync(`git ${cmd}`, { cwd: root, encoding: 'utf8' }).trim();
const run = (cmd, cwd = serverDir) => {
  console.log(`\n> ${cmd}`);
  const r = spawnSync(cmd, { cwd, stdio: 'inherit', shell: true });
  if (r.status !== 0) fail(`"${cmd}" failed.`);
};

if (!dryRun && confirm !== 'gmatlas.online') {
  fail('pass --confirm gmatlas.online to release to production (or --dry-run to only run the checks).');
}

// Source: main, clean, pushed.
const branch = git('branch --show-current');
if (branch !== 'main') fail(`production releases come from main; this is "${branch}". Merge to main first (server -> main by pull request).`);
if (git('status --porcelain')) fail('the working tree has uncommitted changes.');
git('fetch origin main --tags');
if (git('rev-parse HEAD') !== git('rev-parse origin/main')) fail('HEAD is not origin/main. Push (or pull) so production runs exactly what is on GitHub.');

// Configuration.
const toml = readFileSync(join(serverDir, 'wrangler.toml'), 'utf8');
const prod = toml.slice(toml.indexOf('[env.production]'));
if (prod.includes('SET-ME')) fail('set the production D1 database_id in wrangler.toml (npx wrangler d1 create db_gmatlas_production).');
const kid = (/^CERT_KEY_ID\s*=\s*"([^"]+)"/m.exec(prod.slice(prod.indexOf('[env.production.vars]'))) || [])[1];
if (!kid) fail('CERT_KEY_ID missing from [env.production.vars].');
if (!existsSync(join(serverDir, 'keys', `cert-${kid}.public.json`))) fail(`no keys/cert-${kid}.public.json: run npm run secrets:production first.`);
if (!readFileSync(join(root, 'src', 'data', 'certKeys.js'), 'utf8').includes(`kid: '${kid}'`)) fail(`the production key "${kid}" isn't pinned in src/data/certKeys.js.`);

// Tests.
run('npm test', root);
run('npm test', serverDir);

if (dryRun) { console.log('\nAll release checks pass (dry run: nothing tagged or deployed).'); process.exit(0); }

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const tag = `prod-${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`;
git(`tag -a ${tag} -m "Production release ${tag}"`);
git(`push origin ${tag}`);
console.log(`\nTagged ${tag}.`);

run('npx --yes wrangler@4 d1 migrations apply db_gmatlas_production --remote --env production');
run('node scripts/site.js --production');
run('npx --yes wrangler@4 deploy --env production');
console.log(`\nReleased ${tag} to https://gmatlas.online`);
