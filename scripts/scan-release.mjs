import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);
// Private-operations material must never be tracked here, under any path.
const forbiddenBasenames = [
  'OFFER.md',
  'OUTREACH-TEMPLATES.md',
  'PAYMENT-LEGAL.md',
  'LEADS.md',
  'lead-list.md',
  'pipeline.md',
  'outreach-drafts.md',
];
for (const file of tracked) {
  const base = file.split('/').pop();
  assert.ok(!forbiddenBasenames.includes(base), `${file} is private operations material`);
}
assert.ok(!tracked.some((file) => /(^|\/)(?:\.work|node_modules|dist|coverage)(\/|$)/.test(file)));

// Tracked files must exactly equal the release-manifest allowlist (no drift in either direction).
// Without this, RELEASE_PLAN.md's "only paths enumerated in release-manifest.json may be tracked"
// is a promise nothing enforces: any newly committed file ships as long as its content is clean.
const manifest = JSON.parse(readFileSync('release-manifest.json', 'utf8'));
assert.equal(manifest.policy, 'allowlist');
const allowed = new Set(manifest.files);
const trackedSet = new Set(tracked);
for (const file of tracked) {
  assert.ok(allowed.has(file), `tracked file missing from release-manifest.json: ${file}`);
}
for (const file of allowed) {
  assert.ok(trackedSet.has(file), `release-manifest.json lists untracked file: ${file}`);
}

const patterns = [
  { name: 'absolute macOS home path', regex: /\/Users\/[A-Za-z0-9._-]+\// },
  { name: 'GitHub token', regex: /gh[opsu]_[A-Za-z0-9_]{20,}/ },
  { name: 'API key', regex: /sk-[A-Za-z0-9_-]{16,}/ },
  { name: 'private key', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'email address', regex: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
];
// Employer-internal and personal-brand names that must never appear anywhere in this sterile
// release. The terms are assembled from fragments so this scanner's own source (and therefore the
// release history) never contains the literal tokens — no scan exclusion is needed. Matching is
// whole-token (letter/digit boundaries), case-insensitive, so unrelated words that merely embed a
// term as a substring do not fire; a future legitimate whole-token use (for example a third-party
// product name) would fire and must be consciously reviewed rather than silently allowed.
const forbiddenNamePatterns = [
  ['mind', 'mons'],
  ['at', 'las'],
  ['still', 'pass'],
  ['road', 'to100k'],
].map((fragments) => {
  const term = fragments.join('');
  return { name: `forbidden project/brand name "${term}"`, regex: new RegExp(`(?<![a-z0-9])${term}(?![a-z0-9])`, 'i') };
});
patterns.push(...forbiddenNamePatterns);
for (const file of tracked) {
  const content = readFileSync(file, 'utf8');
  for (const pattern of patterns) {
    assert.ok(!pattern.regex.test(file), `${pattern.name} found in tracked path ${file}`);
    assert.ok(!pattern.regex.test(content), `${pattern.name} found in ${file}`);
  }
}
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });

// Historical sanitizer fixtures are known synthetic values, not credentials. New tracked files
// construct them dynamically so ordinary secret scanners do not produce the same false positive.
// The neutralization is anchored at a token boundary: a plain substring replacement would also
// blind the scanner to a real credential that merely starts with a fixture, which is the same
// silent-pass failure this file exists to prevent.
const knownSyntheticFixtures = [
  ['ghp', '_', 'abcdefghijklmnopqrstuvwxyz'].join(''),
  ['sk', '-', 'abcdefghijklmnop'].join(''),
];
const neutralizeKnownFixtures = (text) =>
  knownSyntheticFixtures.reduce(
    (current, fixture) => current.replace(new RegExp(`${fixture}(?![A-Za-z0-9_-])`, 'g'), '<KNOWN_SYNTHETIC_FIXTURE>'),
    text,
  );

// Git history is three surfaces, not one, and each needs its own policy.
//
// 1. Diffs. Every pattern applies, including the email pattern that an earlier `patterns.slice(0, 4)`
//    silently dropped — a lead or client address committed and later deleted would have passed.
// 2. Commit and tag identities. `git log --format=` strips exactly the headers that carry them, so
//    author and committer identity were never scanned at all. They are emails by construction, so
//    an allowlist is the right shape here rather than a prohibition: only GitHub noreply addresses
//    may appear, which is what a personal address committed by mistake would fail.
// 3. Message and ref text. Subjects, bodies, tag messages and ref names, scanned with every pattern.
const diffHistory = neutralizeKnownFixtures(git('log', '-p', '--all', '--format='));
for (const pattern of patterns) {
  assert.ok(!pattern.regex.test(diffHistory), `${pattern.name} found in Git history`);
}

const releaseIdentity = /^[A-Za-z0-9._+-]+@users\.noreply\.github\.com$/;
const identities = [
  ...git('log', '--all', '--format=%ae%n%ce').split('\n'),
  ...git('for-each-ref', '--format=%(taggeremail)').split('\n'),
]
  .map((line) => line.trim().replace(/^<|>$/g, ''))
  .filter(Boolean);
for (const identity of new Set(identities)) {
  assert.ok(
    releaseIdentity.test(identity),
    `commit or tag identity ${identity} is not a GitHub noreply release identity`,
  );
}

const messageHistory = neutralizeKnownFixtures(
  git('log', '--all', '--format=%an%n%cn%n%s%n%b') + git('for-each-ref', '--format=%(refname)%n%(contents)'),
);
for (const pattern of patterns) {
  assert.ok(!pattern.regex.test(messageHistory), `${pattern.name} found in Git commit or tag metadata`);
}
assert.equal(
  execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(),
  '',
  'worktree is not clean',
);
console.log(`release-scan: PASS (${tracked.length} tracked files + Git history)`);
