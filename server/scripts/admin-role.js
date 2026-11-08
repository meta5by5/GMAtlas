// admin-role.js — gives (or takes away) an admin role from the command line,
// for bootstrapping the first owner; after that, owners manage roles in the
// admin panel. The account must exist (sign in once first).
//
//   npm run admin:role -- --email you@example.com --role owner            (dev)
//   npm run admin:role -- --email you@example.com --role owner --env production
//   npm run admin:role -- --email you@example.com --role support --remove
//   add --local for the `npm run dev` database
//
// Writes an audit_log entry (actor "cli").
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const email = String(opt('email') || '').trim().toLowerCase();
const role = opt('role');
const envName = opt('env');
const remove = args.includes('--remove');
const local = args.includes('--local');
const ROLES = ['owner', 'admin', 'support', 'content'];

const fail = (msg) => { console.error(msg); process.exit(1); };
if (!/^[^\s'"@]+@[^\s'"@]+$/.test(email)) fail('Pass --email <the account’s email>.');
if (!ROLES.includes(role)) fail(`Pass --role ${ROLES.join('|')}.`);
if (envName && !/^[\w-]+$/.test(envName)) fail('Bad --env.');

function d1(sql) {
  const where = local ? '--local' : '--remote';
  const cmd = `npx --yes wrangler@4 d1 execute DB ${where}${envName ? ` --env ${envName}` : ''} --json --command "${sql.replace(/"/g, '\\"')}"`;
  const r = spawnSync(cmd, { cwd: serverDir, shell: true, encoding: 'utf8' });
  if (r.status !== 0) fail(`wrangler failed:\n${r.stderr || r.stdout}`);
  const out = JSON.parse(r.stdout.slice(r.stdout.indexOf('[')));
  return out[0].results || [];
}

const [user] = d1(`SELECT id, roles FROM users WHERE email = '${email}'`);
if (!user) fail(`No account with ${email} in ${envName || 'dev'}${local ? ' (local)' : ''}. Sign in once first.`);
const before = JSON.parse(user.roles || '[]');
const after = ROLES.filter((r) => (r === role ? !remove : before.includes(r)));
const at = new Date().toISOString();
const q = (v) => `'${JSON.stringify(v).replace(/'/g, "''")}'`;
d1(`UPDATE users SET roles = ${q(after)} WHERE id = '${user.id}'; INSERT INTO audit_log (id, at, actor_id, action, target_kind, target_id, before_json, after_json, note) VALUES ('aud_cli_${randomUUID()}', '${at}', 'cli', 'admin.user.roles', 'user', '${user.id}', ${q({ roles: before })}, ${q({ roles: after })}, 'set from the command line (scripts/admin-role.js)')`);
console.log(`${email}: roles ${JSON.stringify(before)} -> ${JSON.stringify(after)} (${envName || 'dev'}${local ? ', local' : ''})`);
