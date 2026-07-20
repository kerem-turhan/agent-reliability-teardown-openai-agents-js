import { execFileSync, spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

execFileSync(process.execPath, ['scripts/checkout-target.mjs'], { stdio: 'inherit' });
const target = '.work/targets/openai-agents-js';
const result = spawnSync('corepack', ['pnpm', 'install', '--frozen-lockfile'], {
  cwd: target,
  stdio: 'inherit',
  env: { ...process.env, CI: '1', HUSKY: '0' },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
execFileSync('corepack', ['pnpm', '-F', '@openai/agents...', 'build'], {
  cwd: target,
  stdio: 'inherit',
  env: { ...process.env, CI: '1', HUSKY: '0' },
});
assert.equal(
  execFileSync('git', ['-C', target, 'status', '--porcelain'], { encoding: 'utf8' }).trim(),
  '',
  'target checkout changed during install',
);
console.log('target-install: PASS');
