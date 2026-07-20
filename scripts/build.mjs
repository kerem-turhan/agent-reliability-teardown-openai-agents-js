import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const inputs = [
  'TEARDOWN.md',
  'claims/claims.json',
  'findings/findings.json',
  'evidence/runs/baseline-002/results.json',
  'evidence/runs/remediation-001/results.json',
];
const artifacts = inputs.map((path) => ({
  path,
  sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
}));
mkdirSync('dist', { recursive: true });
writeFileSync(
  'dist/release-manifest.json',
  `${JSON.stringify({ schemaVersion: 1, artifacts }, null, 2)}\n`,
);
console.log(`build: PASS (${artifacts.length} release artifacts hashed)`);
