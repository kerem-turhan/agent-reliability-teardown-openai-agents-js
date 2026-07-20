import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const corpus = JSON.parse(await readFile('evaluation/corpus/corpus.v1.json', 'utf8'));
assert.equal(corpus.schemaVersion, 1);
assert.match(corpus.corpusVersion, /^\d+\.\d+\.\d+$/);
assert.match(corpus.targetCommit, /^[0-9a-f]{40}$/);
assert.equal(corpus.evidenceBoundary, 'synthetic-orchestration');
assert.equal(corpus.networkPolicy, 'denied');
assert.ok(corpus.cases.length >= 4 && corpus.cases.length <= 12);

const ids = new Set();
for (const item of corpus.cases) {
  assert.match(item.id, /^FR-\d{3}$/);
  assert.ok(!ids.has(item.id), `duplicate case ${item.id}`);
  ids.add(item.id);
  assert.ok(item.title && item.surface && item.entrypoint);
  assert.ok(item.setup && item.oracle && item.allowedVariance && item.isolation);
  assert.equal(item.evidenceLevel, 'synthetic-orchestration', `${item.id} missing synthetic label`);
  assert.ok(['success', 'controlled_error'].includes(item.oracle.outcome));
  assert.match(item.isolation, /no network/);
}

const prohibited = /model quality|production incidence|all agents|product quality/i;
assert.ok(!prohibited.test(JSON.stringify(corpus)), 'corpus contains an out-of-bound claim');
console.log(`corpus: PASS (${corpus.cases.length} cases; all synthetic-orchestration)`);

