import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter((file) => /\.(?:json|mjs|ts|md)$/.test(file));
for (const file of files) {
  const content = readFileSync(file, 'utf8');
  assert.ok(content.endsWith('\n'), `${file} lacks final newline`);
  if (file.endsWith('.json')) JSON.parse(content);
  if (!file.endsWith('.md')) {
    assert.ok(!/[ \t]+$/m.test(content), `${file} has trailing whitespace`);
  }
}
console.log(`format: PASS (${files.length} text artifacts)`);
