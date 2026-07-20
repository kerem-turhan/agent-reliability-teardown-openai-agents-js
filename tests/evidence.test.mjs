import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const baseline = JSON.parse(readFileSync('evidence/runs/baseline-002/results.json', 'utf8'));
const remediation = JSON.parse(readFileSync('evidence/runs/remediation-001/results.json', 'utf8'));

test('sanitized canonical evidence preserves RED and GREEN totals', () => {
  assert.deepEqual(baseline.totals, { cases: 6, pass: 4, fail: 2, harnessError: 0 });
  assert.deepEqual(remediation.totals, { cases: 6, pass: 6, fail: 0, harnessError: 0 });
});

test('published evidence has an explicit boundary and no private runner linkage', () => {
  for (const result of [baseline, remediation]) {
    assert.equal(result.evidenceLevel, 'synthetic-orchestration');
    assert.equal(result.sanitizedForRelease, true);
    assert.equal('runnerCommit' in result, false);
    assert.equal('rawArtifacts' in result, false);
    assert.deepEqual(result.environment, {
      networkPolicy: 'denied by fake boundaries and fetch guard',
      apiKeyPresent: false,
    });
  }
});
