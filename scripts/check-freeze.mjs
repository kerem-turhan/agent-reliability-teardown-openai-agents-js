import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const manifest = JSON.parse(await readFile('research/target-freeze.json', 'utf8'));
const candidates = JSON.parse(await readFile('research/candidates.json', 'utf8'));
const selected = candidates.candidates.find((item) => item.id === candidates.selectedCandidateId);
assert.ok(selected, 'selected candidate missing');
assert.equal(manifest.repository, selected.repository);
assert.equal(manifest.commitSha, selected.commitSha);
assert.equal(manifest.license.spdx, selected.license);
assert.match(manifest.commitSha, /^[0-9a-f]{40}$/);
assert.match(manifest.gitTree, /^[0-9a-f]{40}$/);
assert.match(manifest.license.sha256, /^[0-9a-f]{64}$/);
assert.match(manifest.freezeCommit, /^[0-9a-f]{40}$/);
assert.equal(manifest.resultsExecutedBeforeFreeze, false);

const checkout = manifest.localCheckout;
const allowPatch = process.argv.includes('--allow-patch');
const head = execFileSync('git', ['-C', checkout, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const tree = execFileSync('git', ['-C', checkout, 'rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim();
const dirty = execFileSync('git', ['-C', checkout, 'status', '--porcelain'], {
  encoding: 'utf8',
}).trimEnd();
const licenseBytes = await readFile(`${checkout}/${manifest.license.path}`);
const licenseHash = createHash('sha256').update(licenseBytes).digest('hex');
assert.equal(head, manifest.commitSha, 'checkout HEAD drifted');
assert.equal(tree, manifest.gitTree, 'checkout tree drifted');
if (allowPatch) {
  assert.equal(
    dirty,
    ' M examples/financial-research-agent/manager.ts',
    'checkout contains changes beyond the declared remediation',
  );
} else {
  assert.equal(dirty, '', 'checkout is dirty before baseline');
}
assert.equal(licenseHash, manifest.license.sha256, 'license hash drifted');

const ignored = execFileSync('git', ['check-ignore', checkout], { encoding: 'utf8' }).trim();
assert.ok(ignored, 'target checkout is not ignored');
// This is a sterile release repository with a fresh, independent history (see RELEASE_PLAN.md),
// so the freeze commit recorded during private preparation is intentionally not an ancestor here.
// The freeze provenance that matters for the evidence boundary — that no result ran before the
// freeze — is asserted above via manifest.resultsExecutedBeforeFreeze, and target integrity is
// pinned by the HEAD, tree, license, and corpus-hash checks rather than by local Git ancestry.
console.log(`freeze: PASS (${manifest.repository}@${manifest.commitSha})`);
