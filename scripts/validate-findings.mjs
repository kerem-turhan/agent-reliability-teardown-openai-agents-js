import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const findings = JSON.parse(readFileSync('findings/findings.json', 'utf8'));
const baseline = JSON.parse(readFileSync('evidence/runs/baseline-002/results.json', 'utf8'));
const remediation = JSON.parse(readFileSync('evidence/runs/remediation-001/results.json', 'utf8'));
const corpus = JSON.parse(readFileSync('evaluation/corpus/freeze.json', 'utf8'));
const patchHash = createHash('sha256').update(readFileSync(findings.patch.path)).digest('hex');

assert.equal(findings.outcome, 'meaningful_findings');
assert.equal(findings.targetCommit, baseline.target.commitSha);
assert.equal(findings.targetCommit, remediation.target.commitSha);
assert.equal(findings.corpusSha256, corpus.corpusSha256);
assert.equal(baseline.corpus.sha256, remediation.corpus.sha256);
assert.equal(findings.patch.sha256, patchHash);
assert.equal(remediation.patch.sha256, patchHash);
assert.deepEqual(findings.baselineTotals, { pass: 4, fail: 2, harnessError: 0 });
assert.deepEqual(findings.remediationTotals, { pass: 6, fail: 0, harnessError: 0 });
assert.ok(Date.parse(baseline.completedAt) < Date.parse(remediation.startedAt));

for (const finding of findings.findings) {
  assert.match(finding.id, /^F-\d{3}$/);
  assert.equal(finding.evidenceLevel, 'synthetic-orchestration');
  assert.equal(finding.baselineStatus, 'fail');
  assert.equal(finding.remediationStatus, 'pass');
  assert.ok(finding.demonstratedImpact.length > 40);
  assert.ok(finding.limitation.length > 40);
  // A cited root-cause path is a claim about code, and different halves of one mechanism can rest
  // on different evidence. F-001 is the case in point: the harness overrides `search()`, so the
  // exception-to-null conversion it also cites is never executed by any corpus case and is
  // static-analysis, not something observed. Every path must therefore declare its level, and a
  // finding must rest on at least one path that actually ran.
  assert.ok(finding.rootCausePaths.length > 0);
  assert.deepEqual(
    Object.keys(finding.rootCauseEvidence ?? {}).sort(),
    [...finding.rootCausePaths].sort(),
    `${finding.id}: every root-cause path must declare its evidence level`,
  );
  for (const [path, level] of Object.entries(finding.rootCauseEvidence)) {
    assert.ok(
      ['synthetic-orchestration', 'static-analysis'].includes(level),
      `${finding.id}: unknown evidence level ${level} for ${path}`,
    );
  }
  assert.ok(
    Object.values(finding.rootCauseEvidence).includes('synthetic-orchestration'),
    `${finding.id}: no root-cause path was actually executed`,
  );
  assert.ok(existsSync(`findings/${finding.id}.md`));
  assert.equal(baseline.cases.find((item) => item.id === finding.caseId)?.status, 'fail');
  assert.equal(remediation.cases.find((item) => item.id === finding.caseId)?.status, 'pass');
}
assert.equal(findings.findings.length, 2);
console.log(`findings: PASS (${findings.findings.length} RED→GREEN findings)`);

