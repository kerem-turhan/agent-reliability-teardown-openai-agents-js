import test from 'node:test';
import { execFileSync } from 'node:child_process';

test('failure map covers all requested surfaces', () => {
  execFileSync(process.execPath, ['scripts/check-failure-map.mjs'], { stdio: 'pipe' });
});

test('synthetic-label corpus contract is enforced', () => {
  execFileSync(process.execPath, ['scripts/validate-corpus.mjs'], { stdio: 'pipe' });
});

