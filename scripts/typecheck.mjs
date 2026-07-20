import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const scripts = execFileSync('git', ['ls-files', '*.mjs'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);
for (const file of scripts) execFileSync(process.execPath, ['--check', file]);

const target = '.work/targets/openai-agents-js';
const upstreamTest = `${target}/examples/financial-research-agent/manager.test.ts`;
const original = readFileSync(upstreamTest);
writeFileSync(upstreamTest, readFileSync('harness/financial-research.corpus.test.ts'));
try {
  execFileSync('corepack', ['pnpm', '-F', 'financial-research-agent', 'build-check'], {
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
console.log(`typecheck: PASS (${scripts.length} Node scripts + TypeScript harness)`);
