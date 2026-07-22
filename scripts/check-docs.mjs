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

// A headline number must never travel without the evidence boundary that bounds it. Any tracked
// Markdown file stating a ratio or percentage must name `synthetic-orchestration` at or before the
// first such number, so the qualifier is visible where the number is rather than one scroll below
// it. The repository's own About text is checked the same way: it is the surface most readers meet
// first (search results, link previews) and until now no gate read it at all.
const SCOPE_MARKER = /synthetic(?:ally)?[- ]orchestrat(?:ed|ion)/i;
const HEADLINE_NUMBER = /(?<![\w./-])\d{1,3}\s*\/\s*\d{1,3}(?![\w./-])|\b\d{1,3}(?:\.\d+)?\s*%/;
let scopedSurfaceCount = 0;
const assertScopedNumbers = (label, text) => {
  const number = text.match(HEADLINE_NUMBER);
  if (!number) return;
  const marker = text.match(SCOPE_MARKER);
  assert.ok(
    marker && marker.index < number.index,
    `${label}: headline number "${number[0].trim()}" appears before the synthetic-orchestration boundary`,
  );
  scopedSurfaceCount += 1;
};
for (const file of trackedMarkdown) assertScopedNumbers(file, readFileSync(file, 'utf8'));

// Published repository metadata is declared here and diffed against GitHub by `metadata:check`,
// which needs the network. This offline half asserts the declared text is in-policy, so the two
// halves together make an unlabeled About line impossible to ship rather than merely unlikely.
const metadata = JSON.parse(readFileSync('release-metadata.json', 'utf8'));
assert.match(metadata.repository, /^[\w.-]+\/[\w.-]+$/);
assert.ok(metadata.description.length > 40 && metadata.description.length <= 350);
assert.ok(Array.isArray(metadata.topics) && metadata.topics.length > 0);
assertScopedNumbers('release-metadata.json description', metadata.description);

console.log(
  `docs: PASS (${required.length} teardown sections, ${relativeLinkCount} relative links, ` +
    `${scopedSurfaceCount} scoped number surfaces)`,
);
