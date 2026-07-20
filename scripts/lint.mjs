import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

execFileSync(process.execPath, ['scripts/check-format.mjs'], { stdio: 'inherit' });
const target = '.work/targets/openai-agents-js';
const upstreamTest = `${target}/examples/financial-research-agent/manager.test.ts`;
const original = readFileSync(upstreamTest);
writeFileSync(upstreamTest, readFileSync('harness/financial-research.corpus.test.ts'));
try {
  execFileSync('corepack', ['pnpm', 'exec', 'eslint', 'examples/financial-research-agent/manager.test.ts'], {
    cwd: target,
    stdio: 'inherit',
  });
} finally {
  writeFileSync(upstreamTest, original);
}
assert.equal(
  execFileSync('git', ['-C', target, 'status', '--porcelain'], { encoding: 'utf8' }).trim(),
  '',
);
console.log('lint: PASS (repository format + upstream ESLint harness)');
