import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const canonicalPath = existsSync('evidence/runs/baseline-002/results.json')
  ? 'evidence/runs/baseline-002/results.json'
  : 'evidence/runs/baseline-001/results.json';
const freeze = JSON.parse(readFileSync('research/target-freeze.json', 'utf8'));
const corpusFreeze = JSON.parse(readFileSync('evaluation/corpus/freeze.json', 'utf8'));
function validateResult(path, expectedKind) {
  const result = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.runKind, expectedKind);
  assert.equal(result.evidenceLevel, 'synthetic-orchestration');
  assert.equal(result.target.commitSha, freeze.commitSha);
  assert.equal(result.corpus.sha256, corpusFreeze.corpusSha256);
  assert.equal(result.totals.cases, 6);
  assert.equal(result.totals.cases, result.totals.pass + result.totals.fail + result.totals.harnessError);
  assert.equal(result.totals.harnessError, 0);
  assert.equal(new Set(result.cases.map((item) => item.id)).size, 6);
  for (const item of result.cases) {
    assert.equal(item.evidenceLevel, 'synthetic-orchestration');
    assert.ok(['pass', 'fail'].includes(item.status));
  }
  const rawDirectory = `.work/evidence-raw/${result.runId}`;
  if (existsSync(rawDirectory)) {
    for (const artifact of result.rawArtifacts) {
      const actual = createHash('sha256')
        .update(readFileSync(`${rawDirectory}/${artifact.name}`))
        .digest('hex');
      assert.equal(actual, artifact.sha256, `raw hash mismatch: ${result.runId}/${artifact.name}`);
    }
  }
  return result;
}

const baseline = validateResult(canonicalPath, 'baseline');
let message = `baseline ${baseline.totals.pass} pass/${baseline.totals.fail} fail`;
if (existsSync('evidence/runs/remediation-001/results.json')) {
  const remediation = validateResult('evidence/runs/remediation-001/results.json', 'remediation');
  assert.equal(remediation.processExitCode, 0);
  assert.deepEqual(remediation.totals, { cases: 6, pass: 6, fail: 0, harnessError: 0 });
  message += `; remediation ${remediation.totals.pass} pass/${remediation.totals.fail} fail`;
}
console.log(`evidence: PASS (${message})`);
