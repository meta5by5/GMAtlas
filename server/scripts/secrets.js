// secrets.js — generates the service's secrets and puts them where they go.
//
//   node scripts/secrets.js --local    writes server/.dev.vars for `npm run dev`
//                                      (with MAIL_MODE=log, so codes print to the console)
//   node scripts/secrets.js --remote   sends each one to Cloudflare with
//                                      `wrangler secret put` (needs `wrangler login` first)
//
// The certificate key pair is made fresh each time. In --remote mode its
// public half is written to keys/cert-<CERT_KEY_ID>.public.json (committed:
// the browser app pins it), and the run refuses if that file already exists,
// since replacing a key under the same id would make every device reject the
// certificates it holds. To replace the key, change CERT_KEY_ID in
// wrangler.toml first (see "Rotating the signing key" in README.md).
// Private values are never written to disk in --remote mode.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateSigningKeyPair, randomToken } from '../src/crypto.js';

const serverDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv.includes('--remote') ? 'remote' : process.argv.includes('--local') ? 'local' : null;
const force = process.argv.includes('--force');
if (!mode) {
  console.error('Usage: node scripts/secrets.js --local | --remote');
  process.exit(1);
}

const toml = readFileSync(join(serverDir, 'wrangler.toml'), 'utf8');
const kid = (/^CERT_KEY_ID\s*=\s*"([^"]+)"/m.exec(toml) || [])[1];
if (!kid) {
  console.error('CERT_KEY_ID is missing from wrangler.toml [vars].');
  process.exit(1);
}

const { privateJwk, publicJwk } = await generateSigningKeyPair();
const publicKey = { kid, kty: publicJwk.kty, crv: publicJwk.crv, x: publicJwk.x, y: publicJwk.y };
const secrets = {
  ACCESS_TOKEN_SECRET: randomToken(32),
  CODE_PEPPER: randomToken(32),
  CERT_SIGNING_JWK: JSON.stringify(privateJwk),
};

if (mode === 'local') {
  const file = join(serverDir, '.dev.vars');
  if (existsSync(file) && !force) {
    console.error('server/.dev.vars already exists. Re-run with --force to replace it (signs out every local session).');
    process.exit(1);
  }
  const lines = Object.entries(secrets).map(([k, v]) => `${k}=${k === 'CERT_SIGNING_JWK' ? `'${v}'` : v}`);
  writeFileSync(file, [...lines, 'MAIL_MODE=log', ''].join('\n'));
  console.log('Wrote server/.dev.vars (gitignored).');
  console.log(`Local certificate public key (${kid}), for testing only:\n${JSON.stringify(publicKey)}`);
} else {
  const keyFile = join(serverDir, 'keys', `cert-${kid}.public.json`);
  if (existsSync(keyFile)) {
    console.error(`keys/cert-${kid}.public.json already exists: a key with id "${kid}" is already deployed.`);
    console.error('To replace it, change CERT_KEY_ID in wrangler.toml to a new id first.');
    process.exit(1);
  }
  for (const [name, value] of Object.entries(secrets)) {
    const run = spawnSync('npx', ['--yes', 'wrangler@4', 'secret', 'put', name], { cwd: serverDir, input: value, stdio: ['pipe', 'inherit', 'inherit'], shell: process.platform === 'win32' });
    if (run.status !== 0) {
      console.error(`wrangler secret put ${name} failed. Fix the error and re-run; it makes a fresh set.`);
      process.exit(1);
    }
  }
  mkdirSync(dirname(keyFile), { recursive: true });
  writeFileSync(keyFile, `${JSON.stringify(publicKey, null, 2)}\n`);
  console.log(`Secrets set. Public key written to keys/cert-${kid}.public.json; commit it.`);
}
