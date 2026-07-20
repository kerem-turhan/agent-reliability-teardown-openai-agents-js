import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const document = JSON.parse(readFileSync('claims/claims.json', 'utf8'));
const packageDocument = JSON.parse(readFileSync('package.json', 'utf8'));
assert.equal(document.schemaVersion, 1);
assert.ok(document.claims.length >= 8);
const ids = new Set();
for (const claim of document.claims) {
  assert.match(claim.id, /^C-\d{3}$/);
  assert.ok(!ids.has(claim.id), `duplicate claim ${claim.id}`);
  ids.add(claim.id);
  assert.ok(claim.claim.length > 30 && claim.scope.length > 10 && claim.limitation.length > 20);
  assert.ok(claim.evidencePaths.length > 0);
  for (const path of claim.evidencePaths) assert.ok(existsSync(path), `${claim.id} missing ${path}`);
  const commands = [...claim.command.matchAll(/npm run ([A-Za-z0-9:_-]+)/g)].map((match) => match[1]);
  assert.ok(commands.length > 0, `${claim.id} has no npm validation command`);
  for (const command of commands) {
    assert.ok(packageDocument.scripts[command], `${claim.id} references missing npm script ${command}`);
  }
}
const table = readFileSync('CLAIMS.md', 'utf8');
for (const id of ids) assert.ok(table.includes(`| ${id} |`), `${id} absent from claim table`);
console.log(`claims: PASS (${document.claims.length} claims mapped)`);
