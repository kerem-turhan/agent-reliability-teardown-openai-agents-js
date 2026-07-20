import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const files = execFileSync('git', ['ls-files', 'evidence'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);
const patterns = [
  { name: 'absolute macOS home path', regex: /\/Users\/[A-Za-z0-9._-]+\// },
  { name: 'GitHub token', regex: /gh[opsu]_[A-Za-z0-9_]{20,}/ },
  { name: 'API key', regex: /sk-[A-Za-z0-9_-]{16,}/ },
  { name: 'email address', regex: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
];
for (const file of files) {
  const content = readFileSync(file, 'utf8');
  for (const pattern of patterns) {
    assert.ok(!pattern.regex.test(content), `${pattern.name} found in ${file}`);
  }
}
console.log(`leak-scan: PASS (${files.length} tracked evidence files)`);

