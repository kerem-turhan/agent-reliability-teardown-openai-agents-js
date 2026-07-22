import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const document = JSON.parse(readFileSync('claims/claims.json', 'utf8'));
const packageDocument = JSON.parse(readFileSync('package.json', 'utf8'));
assert.equal(document.schemaVersion, 1);
assert.ok(document.claims.length >= 8);
const ids = new Set();
for (const claim of document.claims) {
  assert.match(claim.id, /^C-\d{3}$/);
  assert.ok(!ids.has(claim.id), `duplicate claim ${claim.id}`);
  ids.add(claim.id);
  assert.ok(claim.claim.length > 30 && claim.scope.length > 10 && claim.limitation.length > 20);
  assert.ok(claim.evidencePaths.length > 0);
  for (const path of claim.evidencePaths) assert.ok(existsSync(path), `${claim.id} missing ${path}`);
  const commands = [...claim.command.matchAll(/npm run ([A-Za-z0-9:_-]+)/g)].map((match) => match[1]);
  assert.ok(commands.length > 0, `${claim.id} has no npm validation command`);
  for (const command of commands) {
    assert.ok(packageDocument.scripts[command], `${claim.id} references missing npm script ${command}`);
  }
}
// Structure is not content. Until now this gate proved only that each claim pointed at files that
// exist and named an npm script that exists — so a claim could state any number at all and still
// pass. Every number a claim asserts must now be checked against the artifact it cites.
let verifiedNumbers = 0;
for (const claim of document.claims) {
  const evidence = claim.evidencePaths.map((path) => ({ path, text: readFileSync(path, 'utf8') }));
  const results = evidence
    .filter(({ path }) => path.endsWith('results.json'))
    .map(({ text }) => JSON.parse(text));

  // Recorded run totals, stated in prose, must equal the totals in the recorded run.
  for (const { totals } of results) {
    for (const [pattern, actual] of [
      [/(\d+) pass/i, totals.pass],
      [/(\d+) fail/i, totals.fail],
      [/(\d+) harness error/i, totals.harnessError],
    ]) {
      const stated = claim.claim.match(pattern);
      if (!stated) continue;
      assert.equal(Number(stated[1]), actual, `${claim.id} states "${stated[0]}" but the run recorded ${actual}`);
      verifiedNumbers += 1;
    }
  }

  // Every ratio and every hash a claim quotes must be findable in the evidence it points at — either
  // as the recorded pass/case totals, or literally somewhere in a cited file.
  const scored = evidence
    .filter(({ path }) => path.endsWith('candidates.json'))
    .map(({ text }) => JSON.parse(text));
  for (const [token, left, right] of claim.claim.matchAll(/(?<![\w./-])(\d{1,3})\/(\d{1,3})(?![\w./-])/g)) {
    const matchesTotals = results.some(
      ({ totals }) => Number(left) === totals.pass && Number(right) === totals.cases,
    );
    // A rubric score is a ratio against the sum of the precommitted weights, never a literal string.
    const matchesRubric = scored.some((document_) => {
      const maximum = Object.values(document_.rubric.weights).reduce((sum, weight) => sum + weight, 0);
      const selected = document_.candidates.find(({ id }) => id === document_.selectedCandidateId);
      return Number(right) === maximum && Number(left) === selected?.total;
    });
    const quotedInEvidence = evidence.some(({ text }) => text.includes(token));
    assert.ok(
      matchesTotals || matchesRubric || quotedInEvidence,
      `${claim.id} states ${token}, which no cited evidence supports`,
    );
    verifiedNumbers += 1;
  }
  for (const [hash] of claim.claim.matchAll(/\b[0-9a-f]{40,64}\b/g)) {
    assert.ok(
      evidence.some(({ text }) => text.includes(hash)),
      `${claim.id} quotes ${hash.slice(0, 12)}…, which no cited evidence contains`,
    );
    verifiedNumbers += 1;
  }
}

// The human-readable table is what a reader actually reads, so it may not drift from the record.
const table = readFileSync('CLAIMS.md', 'utf8');
const rows = [...table.matchAll(/^\| (C-\d{3}) \|(.+)$/gm)];
assert.equal(rows.length, document.claims.length, 'CLAIMS.md lists a different number of claims than claims.json');
for (const claim of document.claims) {
  const row = rows.find(([, id]) => id === claim.id);
  assert.ok(row, `${claim.id} absent from claim table`);
  assert.ok(
    row[2].includes(`\`${claim.evidenceLevel}\``),
    `${claim.id} row does not state its evidence level ${claim.evidenceLevel}`,
  );
}
console.log(`claims: PASS (${document.claims.length} claims mapped, ${verifiedNumbers} stated numbers verified)`);
