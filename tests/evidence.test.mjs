import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { sanitizeForRelease } from '../scripts/lib/release-evidence.mjs';

const baselinePath = 'evidence/runs/baseline-002/results.json';
const remediationPath = 'evidence/runs/remediation-001/results.json';
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const remediation = JSON.parse(readFileSync(remediationPath, 'utf8'));

test('sanitized canonical evidence preserves RED and GREEN totals', () => {
  assert.deepEqual(baseline.totals, { cases: 6, pass: 4, fail: 2, harnessError: 0 });
  assert.deepEqual(remediation.totals, { cases: 6, pass: 6, fail: 0, harnessError: 0 });
});

test('the published evidence is byte-for-byte what the tracked sanitizer produces', () => {
  // The published shape used to be unreproducible: a `sanitizedForRelease` flag no code wrote, and
  // a transformation that existed only in whatever was done by hand once. If this ever fails, the
  // tracked evidence and the code that is supposed to produce it have parted ways.
  for (const path of [baselinePath, remediationPath]) {
    const tracked = readFileSync(path, 'utf8');
    assert.equal(`${JSON.stringify(sanitizeForRelease(JSON.parse(tracked)), null, 2)}\n`, tracked, path);
  }
});

test('the sanitizer drops private linkage rather than trusting the input to lack it', () => {
  const recorded = {
    schemaVersion: 1,
    runId: 'baseline-002',
    runKind: 'baseline',
    evidenceLevel: 'synthetic-orchestration',
    runnerCommit: 'a'.repeat(40),
    // Built from fragments: an absolute home path is exactly what scan-release refuses to let a
    // tracked file contain, and it is right to.
    command: `corepack pnpm exec vitest run ${['/Users', 'someone', 'checkout', 'examples'].join('/')}`,
    environment: {
      node: 'v24.13.0',
      platform: 'darwin',
      architecture: 'arm64',
      networkPolicy: 'denied by fake boundaries and fetch guard',
      apiKeyPresent: false,
    },
    rawArtifacts: [{ name: 'vitest.json', sha256: 'b'.repeat(64) }],
    totals: { cases: 6, pass: 4, fail: 2, harnessError: 0 },
  };
  const sanitized = sanitizeForRelease(recorded);
  assert.equal('runnerCommit' in sanitized, false);
  assert.equal('rawArtifacts' in sanitized, false);
  assert.equal(sanitized.command, 'npm run teardown:baseline');
  assert.deepEqual(sanitized.environment, {
    networkPolicy: 'denied by fake boundaries and fetch guard',
    apiKeyPresent: false,
  });
  assert.equal(sanitized.sanitizedForRelease, true);
  assert.deepEqual(sanitized.totals, recorded.totals, 'the run substance must be untouched');
  assert.throws(() => sanitizeForRelease({ ...recorded, runKind: 'exploratory' }), /no release command/);
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
