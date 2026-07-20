import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('release manifest is a unique sorted allowlist with a private visibility gate', () => {
  const manifest = JSON.parse(readFileSync('release-manifest.json', 'utf8'));
  assert.equal(manifest.policy, 'allowlist');
  assert.equal(manifest.visibility, 'private-until-human-approval');
  assert.equal(manifest.evidenceBoundary, 'synthetic-orchestration');
  assert.equal(new Set(manifest.files).size, manifest.files.length);
  assert.deepEqual(manifest.files, [...manifest.files].sort());
});
