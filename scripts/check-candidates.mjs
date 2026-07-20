import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const file = JSON.parse(await readFile('research/candidates.json', 'utf8'));
const expectedWeights = {
  customerRelevance: 25,
  noSecretReproducibility: 25,
  measurableFailureSurface: 20,
  maintenanceAdoption: 15,
  licenseClarity: 10,
  overnightScopeability: 5,
};
const permissive = new Set(['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC']);
const cutoff = Date.parse('2025-07-20T00:00:00Z');

assert.equal(file.schemaVersion, 1);
assert.deepEqual(file.rubric.weights, expectedWeights, 'rubric weights changed');
assert.equal(file.rubric.minimumTotal, 70);
assert.equal(file.rubric.minimumCustomerRelevance, 18);
assert.ok(file.candidates.length >= 3 && file.candidates.length <= 5);

const ids = new Set();
for (const candidate of file.candidates) {
  assert.ok(!ids.has(candidate.id), `duplicate candidate: ${candidate.id}`);
  ids.add(candidate.id);
  assert.match(candidate.repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
  assert.match(candidate.commitSha, /^[0-9a-f]{40}$/);
  assert.equal(candidate.archived, false, `${candidate.id} is archived`);
  assert.ok(Date.parse(candidate.latestMaintainerActivityAt) >= cutoff, `${candidate.id} is stale`);
  assert.equal(candidate.latestActivityActorType, 'User', `${candidate.id} activity is bot-only`);
  assert.ok(candidate.sources.length >= 4, `${candidate.id} lacks source coverage`);
  for (const source of candidate.sources) {
    assert.match(source, /^https:\/\/github\.com\//, `${candidate.id} has a non-GitHub source`);
  }
  let total = 0;
  for (const [dimension, maximum] of Object.entries(expectedWeights)) {
    const score = candidate.scores[dimension];
    assert.ok(Number.isInteger(score) && score >= 0 && score <= maximum, `${candidate.id}.${dimension}`);
    assert.ok(candidate.rationales[dimension]?.length > 20, `${candidate.id}.${dimension} rationale missing`);
    total += score;
  }
  assert.equal(candidate.total, total, `${candidate.id} total mismatch`);
  const computedEligible =
    candidate.applicationOrFirstPartyExample &&
    candidate.measuredPathNeedsPaidApiOrSecret === false &&
    permissive.has(candidate.license) &&
    candidate.total >= file.rubric.minimumTotal &&
    candidate.scores.customerRelevance >= file.rubric.minimumCustomerRelevance;
  assert.equal(candidate.eligible, computedEligible, `${candidate.id} eligibility mismatch`);
}

const dimensions = [
  'noSecretReproducibility',
  'measurableFailureSurface',
  'customerRelevance',
];
const ranked = file.candidates.filter((item) => item.eligible).sort((a, b) => {
  if (b.total !== a.total) return b.total - a.total;
  for (const dimension of dimensions) {
    if (b.scores[dimension] !== a.scores[dimension]) {
      return b.scores[dimension] - a.scores[dimension];
    }
  }
  if (a.language === 'TypeScript' && b.language !== 'TypeScript') return -1;
  if (b.language === 'TypeScript' && a.language !== 'TypeScript') return 1;
  return b.scores.overnightScopeability - a.scores.overnightScopeability;
});

assert.ok(ranked.length > 0, 'no eligible candidate');
assert.equal(file.selectedCandidateId, ranked[0].id, 'selected candidate does not win fixed ranking');
console.log(`candidates: PASS (${file.candidates.length} scored; selected ${ranked[0].id} at ${ranked[0].total}/100)`);

