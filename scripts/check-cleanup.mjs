import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';

const freeze = JSON.parse(readFileSync('research/target-freeze.json', 'utf8'));
const target = freeze.localCheckout;
assert.equal(
  execFileSync('git', ['-C', target, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  freeze.commitSha,
  'temporary target checkout is on the wrong commit',
);
assert.equal(
  execFileSync('git', ['-C', target, 'status', '--porcelain'], { encoding: 'utf8' }).trim(),
  '',
  'temporary target checkout is dirty',
);

// An orphan of this teardown is identified by its working directory, not by its command line. The
// runner spawns `corepack pnpm exec vitest run <relative path>` with cwd set to the target, so the
// target path never appears in the child's argv — matching argv text found nothing, and let this
// gate report "no matching orphan process" on every run whatever was actually still alive.
// lsof reports resolved paths (/private/var/... on macOS), so the comparison must be made in the
// same terms or a symlinked checkout silently matches nothing.
const targetPath = realpathSync(resolve(target));
let orphanScan = `orphan scan unsupported on ${process.platform}`;
if (process.platform !== 'win32') {
  const workingDirectoryOf = (pid) =>
    execFileSync('lsof', ['-a', '-d', 'cwd', '-p', String(pid), '-Fn'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split('\n')
      .filter((line) => line.startsWith('n'))
      .map((line) => line.slice(1))
      .at(-1);

  // Prove the mechanism on this process before trusting it about any other: if lsof is missing or
  // its output cannot be parsed, this gate must fail rather than report a clean machine.
  let selfDirectory;
  try {
    selfDirectory = workingDirectoryOf(process.pid);
  } catch (error) {
    assert.fail(`cannot read a process working directory, so orphans cannot be detected: ${error.message}`);
  }
  assert.equal(selfDirectory, process.cwd(), 'working-directory probe disagrees with this process');

  const listing = execFileSync('ps', ['-axo', 'pid=,command='], { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  assert.ok(listing.length > 0, 'process listing is empty, so orphans cannot be detected');

  // One batched lsof over every listed pid: per-process calls cost about fourteen seconds here.
  // A pid that has exited by now simply produces no record, which is the desired state.
  const byPid = new Map(
    listing.map((line) => [Number(line.split(/\s+/)[0]), line]).filter(([pid]) => pid && pid !== process.pid),
  );
  let batch = '';
  try {
    batch = execFileSync('lsof', ['-a', '-d', 'cwd', '-p', [...byPid.keys()].join(','), '-Fpn'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (error) {
    // lsof exits non-zero when some of the listed pids are already gone, but still prints the rest.
    batch = error.stdout ?? '';
    assert.ok(batch.length > 0, `working-directory scan produced nothing: ${error.message}`);
  }
  const orphans = [];
  let current = 0;
  for (const line of batch.split('\n')) {
    if (line.startsWith('p')) current = Number(line.slice(1));
    if (!line.startsWith('n')) continue;
    const directory = line.slice(1);
    if (directory === targetPath || directory.startsWith(`${targetPath}/`)) {
      orphans.push(byPid.get(current) ?? `pid ${current}`);
    }
  }
  for (const line of byPid.values()) {
    if (line.includes(targetPath) && !orphans.includes(line)) orphans.push(line);
  }
  assert.deepEqual(orphans, [], `orphan target processes remain:\n${orphans.join('\n')}`);
  orphanScan = `${listing.length} processes scanned by working directory`;
}

console.log(`cleanup: PASS (target clean at frozen commit; ${orphanScan})`);
