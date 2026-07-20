import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const plan = readFileSync('RELEASE_PLAN.md', 'utf8');
for (const heading of [
  'Goal',
  'Included',
  'Excluded',
  'Evidence and claim boundary',
  'Acceptance and verification',
]) {
  assert.ok(plan.includes(`## ${heading}`), `release plan missing ${heading}`);
}
assert.ok(plan.includes('synthetic-orchestration'));
assert.ok(plan.includes('private to public'));
console.log('release-plan: PASS (decision-complete release gate)');
