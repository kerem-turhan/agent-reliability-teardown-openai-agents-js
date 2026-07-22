import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

// Both canonical runs are tracked, so their absence is a broken release, not a mode to fall back
// from. The former fallback to the gitignored bootstrap run meant a clone missing its canonical
// evidence still printed PASS after validating something else, or nothing at all.
const canonicalPath = 'evidence/runs/baseline-002/results.json';
const remediationPath = 'evidence/runs/remediation-001/results.json';
for (const path of [canonicalPath, remediationPath]) {
  assert.ok(existsSync(path), `canonical evidence is missing: ${path}`);
}
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
  // Released evidence is sanitized, and sanitizing drops the link to the local raw run artifacts.
  // That absence has to be declared rather than inferred: a result with no raw artifacts and no
  // sanitization flag is unexplained, and unexplained is a failure. Where the raw artifacts are
  // present — an unsanitized local run — every declared hash is recomputed, with no skip if the
  // directory is missing, because the earlier `existsSync` guard made this block unreachable for
  // every reader while still being advertised as a check.
  if (result.sanitizedForRelease === true) {
    assert.equal('rawArtifacts' in result, false, `${result.runId}: sanitized evidence must not link raw artifacts`);
  } else {
    assert.ok(Array.isArray(result.rawArtifacts) && result.rawArtifacts.length > 0, `${result.runId}: unsanitized evidence must declare its raw artifacts`);
    const rawDirectory = `.work/evidence-raw/${result.runId}`;
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
const remediation = validateResult(remediationPath, 'remediation');
assert.equal(remediation.processExitCode, 0);
assert.deepEqual(remediation.totals, { cases: 6, pass: 6, fail: 0, harnessError: 0 });
console.log(
  `evidence: PASS (baseline ${baseline.totals.pass} pass/${baseline.totals.fail} fail; ` +
    `remediation ${remediation.totals.pass} pass/${remediation.totals.fail} fail)`,
);
