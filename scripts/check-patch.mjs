import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('patches/manifest.json', 'utf8'));
const target = '.work/targets/openai-agents-js';
const patchFromTarget = `../../../${manifest.patchPath}`;
const hash = createHash('sha256').update(readFileSync(manifest.patchPath)).digest('hex');
assert.equal(hash, manifest.patchSha256);
assert.equal(
  execFileSync('git', ['-C', target, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  manifest.targetCommit,
);
const dirty = execFileSync('git', ['-C', target, 'status', '--porcelain'], { encoding: 'utf8' })
  .trimEnd()
  .split('\n')
  .filter(Boolean)
  .map((line) => line.slice(3));
if (dirty.length === 0) {
  execFileSync('git', ['-C', target, 'apply', '--check', patchFromTarget]);
} else {
  assert.deepEqual(dirty, manifest.changedPaths);
  execFileSync('git', ['-C', target, 'apply', '--reverse', '--check', patchFromTarget]);
}
assert.equal(manifest.license, 'MIT');
assert.equal(manifest.upstreamContact, 'none');
console.log(`patch: PASS (${manifest.changedPaths.length} file, ${manifest.patchSha256})`);
