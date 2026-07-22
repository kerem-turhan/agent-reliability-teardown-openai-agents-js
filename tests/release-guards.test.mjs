import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
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
  // treats any email-shaped string in tracked content as leakage, and it is right to.
  git('config', 'user.email', ['probe', '@', 'example.invalid'].join(''));
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
  assert.match(result.stderr, /README\.md: headline number .* appears before the synthetic-orchestration boundary/);
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
