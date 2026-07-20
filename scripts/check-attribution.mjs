import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const freeze = JSON.parse(readFileSync('research/target-freeze.json', 'utf8'));
const upstreamLicense = readFileSync(`${freeze.localCheckout}/${freeze.license.path}`);
const hash = createHash('sha256').update(upstreamLicense).digest('hex');
assert.equal(hash, freeze.license.sha256);
assert.match(readFileSync('LICENSE', 'utf8'), /^MIT License/);
const notice = readFileSync('THIRD_PARTY_NOTICES.md', 'utf8');
for (const value of [freeze.repository, freeze.commitSha, freeze.license.sha256, freeze.license.copyright]) {
  assert.ok(notice.includes(value), `third-party notice missing ${value}`);
}
assert.ok(readFileSync('patches/manifest.json', 'utf8').includes('MIT'));
console.log('attribution: PASS (project MIT + frozen upstream MIT notice)');
