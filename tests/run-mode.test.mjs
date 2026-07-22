import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveRunMode } from '../scripts/lib/run-mode.mjs';

// `evidence/runs/baseline-001/` is gitignored, so "a fresh clone" means hasBaselineOne === false.
// That state used to select the record branch, which is how a reader could run the advertised
// reproduce command, get any numbers at all, and be told COMPLETE with exit 0.
const freshClone = { hasBaselineOne: false, hasBaselineTwo: true, timestamp: 'T' };
const authorMachine = { hasBaselineOne: true, hasBaselineTwo: true, timestamp: 'T' };

test('a fresh clone compares against the canonical baseline instead of recording one', () => {
  const mode = resolveRunMode({ argv: ['node', 'run-teardown.mjs'], ...freshClone });
  assert.equal(mode.recordResult, false);
  assert.equal(mode.comparisonKey, 'baselineTwo');
  assert.equal(mode.runId, 'reproduction-T');
});

test('the summary label does not depend on whether the clone is fresh', () => {
  const cold = resolveRunMode({ argv: ['node', 'run-teardown.mjs'], ...freshClone });
  const warm = resolveRunMode({ argv: ['node', 'run-teardown.mjs'], ...authorMachine });
  assert.equal(cold.runKind, 'reproduction');
  assert.equal(warm.runKind, cold.runKind);
});

test('a patched run without a flag compares against the recorded remediation', () => {
  const mode = resolveRunMode({ argv: ['node', 'run-teardown.mjs', '--patched'], ...freshClone });
  assert.equal(mode.recordResult, false);
  assert.equal(mode.comparisonKey, 'remediationOne');
  assert.equal(mode.runKind, 'reproduction');
});

test('recording a canonical artifact requires asking for it in words', () => {
  const baseline = resolveRunMode({ argv: ['node', 'run-teardown.mjs', '--record'], ...freshClone });
  assert.equal(baseline.recordResult, true);
  assert.equal(baseline.trackedResultKey, 'baselineOne');
  assert.equal(baseline.runId, 'baseline-001');
  assert.equal(baseline.runKind, 'baseline');

  const remediation = resolveRunMode({
    argv: ['node', 'run-teardown.mjs', '--patched', '--record'],
    ...authorMachine,
  });
  assert.equal(remediation.recordResult, true);
  assert.equal(remediation.trackedResultKey, 'remediationOne');
  assert.equal(remediation.runId, 'remediation-001');
  assert.equal(remediation.runKind, 'remediation');
});

test('confirmation still promotes the bootstrap run to the canonical baseline', () => {
  const mode = resolveRunMode({
    argv: ['node', 'run-teardown.mjs', '--confirm-baseline'],
    hasBaselineOne: true,
    hasBaselineTwo: false,
    timestamp: 'T',
  });
  assert.equal(mode.recordResult, true);
  assert.equal(mode.trackedResultKey, 'baselineTwo');
  assert.equal(mode.runId, 'baseline-002');
});
