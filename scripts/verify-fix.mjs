import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';

const target = '.work/targets/openai-agents-js';
const patchFromTarget = '../../../patches/openai-agents-js-financial-research-fail-closed.patch';
execFileSync(process.execPath, ['scripts/check-freeze.mjs'], { stdio: 'inherit' });
execFileSync('git', ['-C', target, 'apply', '--check', patchFromTarget]);
execFileSync('git', ['-C', target, 'apply', patchFromTarget]);
try {
  const result = spawnSync(process.execPath, ['scripts/run-teardown.mjs', '--patched'], {
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, 'patched reproduction runner failed');
  execFileSync(
    'corepack',
    ['pnpm', 'exec', 'vitest', 'run', 'examples/financial-research-agent/manager.test.ts'],
    { cwd: target, stdio: 'inherit' },
  );
  execFileSync('corepack', ['pnpm', '-F', 'financial-research-agent', 'build-check'], {
    cwd: target,
    stdio: 'inherit',
  });
} finally {
  execFileSync('git', ['-C', target, 'apply', '--reverse', patchFromTarget]);
}
execFileSync(process.execPath, ['scripts/check-freeze.mjs'], { stdio: 'inherit' });
console.log('verify-fix: PASS');
