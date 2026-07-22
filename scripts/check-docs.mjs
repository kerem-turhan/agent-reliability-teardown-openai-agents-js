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
// rename or typo can never ship a dead link. Section anchors are checked too — a link to a heading
// that no longer exists lands the reader in the wrong place while every path in it still resolves,
// which is exactly the kind of breakage a path-only check reports as fine.
const trackedMarkdown = execFileSync('git', ['ls-files', '*.md'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);
const headingSlugs = (text) =>
  new Set(
    [...text.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)].map(([, title]) =>
      title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-'),
    ),
  );
let relativeLinkCount = 0;
let anchorCount = 0;
for (const file of trackedMarkdown) {
  const content = readFileSync(file, 'utf8');
  for (const [, rawTarget] of content.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
    if (/^(?:https?:|mailto:)/.test(rawTarget)) continue;
    const [rawPath, fragment] = rawTarget.split('#');
    const target = rawPath === '' ? file : normalize(join(dirname(file), rawPath));
    if (rawPath !== '') {
      relativeLinkCount += 1;
      assert.ok(existsSync(target), `broken relative link in ${file}: ${rawTarget}`);
    }
    if (!fragment) continue;
    anchorCount += 1;
    assert.ok(
      target.endsWith('.md') && headingSlugs(readFileSync(target, 'utf8')).has(fragment),
      `broken section anchor in ${file}: ${rawTarget}`,
    );
  }
}

// A headline number must never travel without the evidence boundary that bounds it. Any tracked
// Markdown file stating a ratio or percentage must name `synthetic-orchestration` at or before the
// first such number, so the qualifier is visible where the number is rather than one scroll below
// it. The repository's own About text is checked the same way: it is the surface most readers meet
// first (search results, link previews) and until now no gate read it at all.
// Checking only the first number per file would leave every later one unscoped — a document could
// open in policy and then state anything below the fold. So each number is checked twice: the
// boundary must be stated before the first number in the document, and it must also be stated
// inside the same `##` section as every individual number, which is what stops an unlabeled figure
// from being appended to the end of an otherwise compliant page.
// A number must carry the boundary that actually bounds it, which is not always the project's
// headline one: a rubric score is official-source-metadata, a patch hash is static-analysis. The
// accepted markers are therefore the evidence levels the claim record itself declares, so this gate
// cannot drift from the vocabulary the claims use, plus the prose form used in the About text.
const evidenceLevels = [
  ...new Set(JSON.parse(readFileSync('claims/claims.json', 'utf8')).claims.map((claim) => claim.evidenceLevel)),
];
const SCOPE_MARKER = new RegExp(
  [...evidenceLevels, String.raw`synthetic(?:ally)?[- ]orchestrat(?:ed|ion)`].join('|'),
  'gi',
);
const HEADLINE_NUMBER = /(?<![\w./-])\d{1,3}\s*\/\s*\d{1,3}(?![\w./-])|\b\d{1,3}(?:\.\d+)?\s*%/g;
const firstIndex = (text, pattern) => {
  const match = new RegExp(pattern.source, pattern.flags.replace('g', '')).exec(text);
  return match ? match.index : -1;
};
let scopedNumberCount = 0;
const assertScopedNumbers = (label, text) => {
  const documentMarker = firstIndex(text, SCOPE_MARKER);
  const documentNumber = firstIndex(text, HEADLINE_NUMBER);
  if (documentNumber < 0) return;
  assert.ok(
    documentMarker >= 0 && documentMarker < documentNumber,
    `${label}: headline number appears before the synthetic-orchestration boundary`,
  );
  // Index 0 is everything above the first heading, which is its own section for this purpose.
  const sections = text.split(/^## /m);
  for (const [index, section] of sections.entries()) {
    const numbers = [...section.matchAll(HEADLINE_NUMBER)];
    if (numbers.length === 0) continue;
    const heading = index === 0 ? 'preamble' : section.split('\n', 1)[0];
    assert.ok(
      firstIndex(section, SCOPE_MARKER) >= 0,
      `${label} (${heading}): "${numbers[0][0].trim()}" is stated with no synthetic-orchestration boundary in its section`,
    );
    scopedNumberCount += numbers.length;
  }
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
  `docs: PASS (${required.length} teardown sections, ${relativeLinkCount} relative links, ${anchorCount} anchors, ` +
    `${scopedNumberCount} scoped numbers)`,
);
