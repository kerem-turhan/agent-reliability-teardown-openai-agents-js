import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

const freeze = JSON.parse(readFileSync('research/target-freeze.json', 'utf8'));
const checkout = freeze.localCheckout;
if (!existsSync(`${checkout}/.git`)) {
  mkdirSync(dirname(checkout), { recursive: true });
  execFileSync(
    'git',
    ['clone', '--filter=blob:none', '--no-checkout', freeze.repositoryUrl, checkout],
    { stdio: 'inherit' },
  );
  execFileSync('git', ['-C', checkout, 'checkout', '--detach', freeze.commitSha], {
    stdio: 'inherit',
  });
}
assert.equal(
  execFileSync('git', ['-C', checkout, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  freeze.commitSha,
  'target checkout is on the wrong commit',
);
execFileSync(process.execPath, ['scripts/check-freeze.mjs'], { stdio: 'inherit' });
console.log('target-checkout: PASS');
