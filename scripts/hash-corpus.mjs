import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const bytes = await readFile('evaluation/corpus/corpus.v1.json');
const actual = createHash('sha256').update(bytes).digest('hex');
if (process.argv.includes('--check')) {
  const freeze = JSON.parse(await readFile('evaluation/corpus/freeze.json', 'utf8'));
  assert.equal(freeze.algorithm, 'sha256');
  assert.equal(freeze.corpusSha256, actual, 'corpus changed after freeze');
  assert.match(freeze.freezeCommit, /^[0-9a-f]{40}$/);
  // Sterile release repo with fresh history (see RELEASE_PLAN.md): the private-preparation freeze
  // commit is intentionally not an ancestor here. Corpus integrity is pinned by the SHA-256 match
  // above, not by local Git ancestry.
  console.log(`corpus-hash: PASS (${actual})`);
} else {
  console.log(actual);
}
