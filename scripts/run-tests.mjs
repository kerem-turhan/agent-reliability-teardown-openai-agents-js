import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';

// `node --test "tests/**/*.test.mjs"` exits 0 when the glob matches nothing, so a renamed directory
// or a typo in the pattern turns the whole suite into a silent pass. The file list is taken from Git
// instead, and an empty list is a failure rather than a clean run.
const files = execFileSync('git', ['ls-files', 'tests/*.test.mjs'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);
assert.ok(files.length > 0, 'no tracked test files found; the suite would have passed vacuously');

const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
