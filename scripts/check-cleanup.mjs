import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const freeze = JSON.parse(readFileSync('research/target-freeze.json', 'utf8'));
const target = freeze.localCheckout;
assert.equal(
  execFileSync('git', ['-C', target, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  freeze.commitSha,
  'temporary target checkout is on the wrong commit',
);
assert.equal(
  execFileSync('git', ['-C', target, 'status', '--porcelain'], { encoding: 'utf8' }).trim(),
  '',
  'temporary target checkout is dirty',
);

if (process.platform !== 'win32') {
  const targetPath = resolve(target);
  const processes = execFileSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8' })
    .split('\n')
    .filter((line) => line.includes(targetPath) && !line.includes('check-cleanup.mjs'));
  assert.deepEqual(processes, [], `orphan target processes remain:\n${processes.join('\n')}`);
}

console.log('cleanup: PASS (target clean at frozen commit; no matching orphan process)');
