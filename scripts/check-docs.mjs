import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const teardown = readFileSync('TEARDOWN.md', 'utf8');
const required = [
  'Executive summary',
  'Target, commit, and license',
  'System model',
  'Method',
  'Corpus',
  'Baseline',
  'Findings',
  'Root cause',
  'Remediation',
  'Before and after',
  'Reproduce',
  'Limitations',
  'Actionable checklist for agent teams',
  'Claim-to-evidence index',
];
for (const heading of required) {
  assert.ok(teardown.includes(`## ${heading}`), `missing teardown section: ${heading}`);
}
for (const phrase of ['synthetic-orchestration', 'npm run verify', '4/6', '6/6']) {
  assert.ok(teardown.includes(phrase), `teardown missing required phrase: ${phrase}`);
}
const readme = readFileSync('README.md', 'utf8');
assert.ok(readme.includes('npm ci\nnpm run verify'));
assert.ok(readme.includes('No model API key'));

// Every relative Markdown link in tracked documentation must resolve to an existing path, so a
// rename or typo can never ship a dead link. External (http/https/mailto) and pure-anchor links
// are out of scope.
const trackedMarkdown = execFileSync('git', ['ls-files', '*.md'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);
let relativeLinkCount = 0;
for (const file of trackedMarkdown) {
  const links = readFileSync(file, 'utf8').matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g);
  for (const [, rawTarget] of links) {
    if (/^(?:https?:|mailto:|#)/.test(rawTarget)) continue;
    const target = normalize(join(dirname(file), rawTarget.split('#')[0]));
    relativeLinkCount += 1;
    assert.ok(existsSync(target), `broken relative link in ${file}: ${rawTarget}`);
  }
}

console.log(`docs: PASS (${required.length} teardown sections, ${relativeLinkCount} relative links)`);
