import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

// A guard is only a guard if it can be shown to fail. Each probe below builds a throwaway fixture
// repository from the current working tree, plants exactly one violation, runs the real shipped
// script, and requires both a non-zero exit and the specific assertion message — so a probe can
// never pass because something unrelated broke. Every probe is paired with a control run on the
// unmodified fixture, which must exit 0.
//
// The fixture is assembled file by file from `git ls-files` rather than copied wholesale: the
// working tree carries an ignored multi-gigabyte target checkout in `.work/`.

const repositoryRoot = process.cwd();
const fixtures = [];

const buildFixture = () => {
  const directory = mkdtempSync(join(tmpdir(), 'release-guard-'));
  fixtures.push(directory);
  const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).trim().split('\n');
  for (const file of tracked) {
    mkdirSync(join(directory, dirname(file)), { recursive: true });
    copyFileSync(join(repositoryRoot, file), join(directory, file));
  }
  const git = (...args) => execFileSync('git', args, { cwd: directory, stdio: 'ignore' });
  git('init', '--quiet', '--initial-branch=main');
  git('config', 'user.name', 'probe');
  // Assembled from fragments so this file never contains a literal email address: `scan-release`
  // treats any email-shaped string in tracked content as leakage, and it is right to. The value is
  // a GitHub noreply address because the release identity allowlist accepts nothing else.
  git('config', 'user.email', ['probe', '@', 'users.noreply.github.com'].join(''));
  git('add', '--all');
  git('-c', 'commit.gpgsign=false', 'commit', '--quiet', '--message', 'fixture');
  return directory;
};

const runGuard = (directory, script) =>
  spawnSync(process.execPath, [join(directory, 'scripts', script)], {
    cwd: directory,
    encoding: 'utf8',
  });

const commitAll = (directory) => {
  execFileSync('git', ['add', '--all'], { cwd: directory, stdio: 'ignore' });
  execFileSync('git', ['-c', 'commit.gpgsign=false', 'commit', '--quiet', '--message', 'violation'], {
    cwd: directory,
    stdio: 'ignore',
  });
};

test.after(() => {
  for (const directory of fixtures) rmSync(directory, { recursive: true, force: true });
});

test('the fixture itself is clean, so every probe below fails for its own reason', () => {
  const directory = buildFixture();
  for (const script of ['scan-release.mjs', 'check-docs.mjs']) {
    const control = runGuard(directory, script);
    assert.equal(control.status, 0, `${script} must pass on an unmodified fixture: ${control.stderr}`);
  }
});

test('release scan rejects a tracked file that the allowlist does not enumerate', () => {
  const directory = buildFixture();
  writeFileSync(join(directory, 'INTERNAL-PRICING.md'), '# internal\n');
  commitAll(directory);
  const result = runGuard(directory, 'scan-release.mjs');
  assert.notEqual(result.status, 0, 'a non-allowlisted tracked file must fail the release scan');
  assert.match(result.stderr, /tracked file missing from release-manifest\.json: INTERNAL-PRICING\.md/);
});

test('release scan rejects an allowlist entry that is no longer tracked', () => {
  const directory = buildFixture();
  const manifestPath = join(directory, 'release-manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.files = [...manifest.files, 'zz-removed-file.md'].sort();
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  commitAll(directory);
  const result = runGuard(directory, 'scan-release.mjs');
  assert.notEqual(result.status, 0, 'allowlist drift must fail in both directions');
  assert.match(result.stderr, /release-manifest\.json lists untracked file: zz-removed-file\.md/);
});

test('release scan rejects private operations material under any path, not just the root', () => {
  const directory = buildFixture();
  mkdirSync(join(directory, 'docs', 'internal'), { recursive: true });
  writeFileSync(join(directory, 'docs', 'internal', 'pipeline.md'), '# leads\n');
  commitAll(directory);
  const result = runGuard(directory, 'scan-release.mjs');
  assert.notEqual(result.status, 0, 'private operations material must fail wherever it is placed');
  assert.match(result.stderr, /docs\/internal\/pipeline\.md is private operations material/);
});

test('docs check rejects a headline number stated before the evidence boundary', () => {
  const directory = buildFixture();
  const readmePath = join(directory, 'README.md');
  const readme = readFileSync(readmePath, 'utf8');
  writeFileSync(readmePath, readme.replace(/synthetic-orchestration/g, 'deterministic'));
  const result = runGuard(directory, 'check-docs.mjs');
  assert.notEqual(result.status, 0, 'an unlabeled headline number must fail the docs check');
  assert.match(result.stderr, /README\.md: headline number appears before the synthetic-orchestration boundary/);
});

test('docs check rejects an unscoped number appended below a compliant opening', () => {
  const directory = buildFixture();
  const readmePath = join(directory, 'README.md');
  writeFileSync(
    readmePath,
    `${readFileSync(readmePath, 'utf8')}\n## Results at a glance\n\nReliability went from 67% to 100%.\n`,
  );
  const result = runGuard(directory, 'check-docs.mjs');
  assert.notEqual(result.status, 0, 'checking only the first number per file would miss this');
  assert.match(result.stderr, /README\.md \(Results at a glance\): "67%" is stated with no synthetic-orchestration boundary/);
});

test('cleanup check sees an orphan whose command line never mentions the target', () => {
  const directory = buildFixture();
  const targetDirectory = mkdtempSync(join(tmpdir(), 'release-guard-target-'));
  fixtures.push(targetDirectory);
  const targetGit = (...args) => execFileSync('git', args, { cwd: targetDirectory, stdio: 'ignore' });
  targetGit('init', '--quiet', '--initial-branch=main');
  targetGit('config', 'user.name', 'probe');
  targetGit('config', 'user.email', ['probe', '@', 'users.noreply.github.com'].join(''));
  writeFileSync(join(targetDirectory, 'file.txt'), 'target\n');
  targetGit('add', '--all');
  targetGit('-c', 'commit.gpgsign=false', 'commit', '--quiet', '--message', 'target');
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: targetDirectory, encoding: 'utf8' }).trim();
  const freezePath = join(directory, 'research', 'target-freeze.json');
  const freeze = JSON.parse(readFileSync(freezePath, 'utf8'));
  writeFileSync(freezePath, `${JSON.stringify({ ...freeze, localCheckout: targetDirectory, commitSha: head }, null, 2)}\n`);

  assert.equal(runGuard(directory, 'check-cleanup.mjs').status, 0, 'no orphan yet');

  // Relative argv, cwd inside the target — exactly what the runner spawns, and exactly what a
  // command-line match cannot see.
  const orphan = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 30000)'], {
    cwd: targetDirectory,
    stdio: 'ignore',
  });
  try {
    execFileSync('sleep', ['1']);
    const result = runGuard(directory, 'check-cleanup.mjs');
    assert.notEqual(result.status, 0, 'an orphan inside the target must fail the cleanup gate');
    assert.match(result.stderr, /orphan target processes remain/);
  } finally {
    orphan.kill('SIGKILL');
  }
});

// Probes that target history must not also add a tracked file: the allowlist check runs first and
// would fail the scan for the wrong reason. Amending an already-allowlisted file keeps the planted
// violation the only one.
const appendTrackedLine = (directory) => {
  const path = join(directory, 'docs', 'methodology.md');
  writeFileSync(path, `${readFileSync(path, 'utf8')}\n`);
  execFileSync('git', ['add', '--all'], { cwd: directory, stdio: 'ignore' });
};

test('release scan rejects an email that survives only in deleted history', () => {
  const directory = buildFixture();
  const leaked = ['contact', '@', 'example.com'].join('');
  writeFileSync(join(directory, 'docs', 'note.md'), `reach me at ${leaked}\n`);
  commitAll(directory);
  rmSync(join(directory, 'docs', 'note.md'));
  commitAll(directory);
  const result = runGuard(directory, 'scan-release.mjs');
  assert.notEqual(result.status, 0, 'deleting a leaked address does not unleak it');
  assert.match(result.stderr, /email address found in Git history/);
});

test('release scan rejects a commit identity that is not a release identity', () => {
  const directory = buildFixture();
  appendTrackedLine(directory);
  execFileSync(
    'git',
    [
      '-c',
      'commit.gpgsign=false',
      '-c',
      `user.email=${['someone', '@', 'gmail.com'].join('')}`,
      'commit',
      '--quiet',
      '--message',
      'personal identity',
    ],
    { cwd: directory, stdio: 'ignore' },
  );
  const result = runGuard(directory, 'scan-release.mjs');
  assert.notEqual(result.status, 0, 'a personal committer address must fail the release scan');
  assert.match(result.stderr, /is not a GitHub noreply release identity/);
});

test('release scan rejects a forbidden name that appears only in a commit subject', () => {
  const directory = buildFixture();
  appendTrackedLine(directory);
  execFileSync(
    'git',
    ['-c', 'commit.gpgsign=false', 'commit', '--quiet', '--message', `port from ${['still', 'pass'].join('')}`],
    { cwd: directory, stdio: 'ignore' },
  );
  const result = runGuard(directory, 'scan-release.mjs');
  assert.notEqual(result.status, 0, 'commit subjects are published text and must be scanned');
  assert.match(result.stderr, /forbidden project\/brand name .* found in Git commit or tag metadata/);
});

const rewriteClaim = (directory, id, mutate) => {
  const path = join(directory, 'claims', 'claims.json');
  const document = JSON.parse(readFileSync(path, 'utf8'));
  mutate(document.claims.find((claim) => claim.id === id));
  writeFileSync(path, `${JSON.stringify(document, null, 2)}\n`);
};

test('claims check rejects a run total that the recorded run does not support', () => {
  const directory = buildFixture();
  rewriteClaim(directory, 'C-004', (claim) => {
    claim.claim = 'Canonical baseline-002 completed 6 pass, 0 fail, and 0 harness errors.';
  });
  const result = runGuard(directory, 'check-claims.mjs');
  assert.notEqual(result.status, 0, 'a falsified run total must fail the claims gate');
  assert.match(result.stderr, /C-004 states "6 pass" but the run recorded 4/);
});

test('claims check rejects a ratio no cited evidence supports', () => {
  const directory = buildFixture();
  rewriteClaim(directory, 'C-007', (claim) => {
    claim.claim = 'The unchanged corpus passed 97/6 with the declared remediation patch.';
  });
  const result = runGuard(directory, 'check-claims.mjs');
  assert.notEqual(result.status, 0, 'an unsupported ratio must fail the claims gate');
  assert.match(result.stderr, /C-007 states 97\/6, which no cited evidence supports/);
});

test('claims check rejects a hash the evidence does not contain', () => {
  const directory = buildFixture();
  rewriteClaim(directory, 'C-008', (claim) => {
    claim.claim = claim.claim.replace(/[0-9a-f]{64}/, 'f'.repeat(64));
  });
  const result = runGuard(directory, 'check-claims.mjs');
  assert.notEqual(result.status, 0, 'a quoted hash must exist in the evidence it cites');
  assert.match(result.stderr, /C-008 quotes ffffffffffff…, which no cited evidence contains/);
});

test('claims check rejects a reader-facing table that drifts from the record', () => {
  const directory = buildFixture();
  const path = join(directory, 'CLAIMS.md');
  writeFileSync(path, readFileSync(path, 'utf8').replace('| `synthetic-orchestration` |', '| |'));
  const result = runGuard(directory, 'check-claims.mjs');
  assert.notEqual(result.status, 0, 'the table must state each claim evidence level');
  assert.match(result.stderr, /row does not state its evidence level synthetic-orchestration/);
});

test('metadata check fails closed when it cannot reach GitHub at all', () => {
  const directory = buildFixture();
  const result = spawnSync(process.execPath, [join(directory, 'scripts', 'check-metadata.mjs')], {
    cwd: directory,
    encoding: 'utf8',
    env: { ...process.env, PATH: '/nonexistent' },
  });
  assert.notEqual(result.status, 0, 'a check that cannot look must answer "no", never "yes"');
  assert.match(result.stderr, /cannot read live repository metadata .*fails closed/s);
});

test('docs check rejects a repository description that states a number without the boundary', () => {
  const directory = buildFixture();
  const metadataPath = join(directory, 'release-metadata.json');
  const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
  metadata.description = 'Clean-room reliability teardown of the openai-agents-js financial research example: 4/6 to 6/6.';
  writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
  const result = runGuard(directory, 'check-docs.mjs');
  assert.notEqual(result.status, 0, 'the published About text must carry the boundary too');
  assert.match(result.stderr, /release-metadata\.json description: headline number/);
});
