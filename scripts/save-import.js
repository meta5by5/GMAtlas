// save-import.js — save an exported campaign JSON into data/imported-campaign.json
// Usage: node scripts/save-import.js path/to/exported.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
const args = process.argv.slice(2);
if (!args[0]) {
  console.error('Usage: node scripts/save-import.js path/to/exported.json');
  process.exit(2);
}
const src = args[0];
try {
  const raw = readFileSync(src, 'utf8');
  // validate JSON
  JSON.parse(raw);
  const outDir = join(process.cwd(), 'data');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'imported-campaign.json'), raw, 'utf8');
  console.log('Saved imported campaign to data/imported-campaign.json');
} catch (e) {
  console.error('Failed to save imported campaign:', e.message);
  process.exit(1);
}
