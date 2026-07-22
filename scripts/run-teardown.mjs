import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { resolveRunMode } from './lib/run-mode.mjs';
import { sanitizeText, sanitizeValue } from './lib/sanitize.mjs';

const repo = process.cwd();
const targetRelative = '.work/targets/openai-agents-js';
const target = resolve(targetRelative);
const corpus = resolve('evaluation/corpus/corpus.v1.json');
const upstreamHarnessRelative = 'examples/financial-research-agent/manager.test.ts';
const upstreamHarness = resolve(target, upstreamHarnessRelative);
const baselineOne = resolve('evidence/runs/baseline-001/results.json');
const baselineTwo = resolve('evidence/runs/baseline-002/results.json');
const remediationOne = resolve('evidence/runs/remediation-001/results.json');
const runPaths = { baselineOne, baselineTwo, remediationOne };
const {
  confirmBaseline,
  patched,
  recordResult,
  trackedResultKey,
  comparisonKey,
  runId,
  runKind,
} = resolveRunMode({
  argv: process.argv,
  hasBaselineOne: existsSync(baselineOne),
  hasBaselineTwo: existsSync(baselineTwo),
  timestamp: new Date().toISOString().replace(/[:.]/g, '-'),
});
const trackedResult = runPaths[trackedResultKey];
assert.ok(!(confirmBaseline && patched), 'baseline confirmation and patched run are mutually exclusive');
if (confirmBaseline) {
  assert.ok(existsSync(baselineOne), 'baseline-001 must exist before confirmation');
  assert.ok(!existsSync(baselineTwo), 'baseline-002 already exists');
}
const rawDirectory = resolve('.work/evidence-raw', runId);
const observedFile = resolve(rawDirectory, 'observed.jsonl');
const vitestFile = resolve(rawDirectory, 'vitest.json');
const stdoutFile = resolve(rawDirectory, 'stdout.log');
const stderrFile = resolve(rawDirectory, 'stderr.log');

execFileSync(
  process.execPath,
  ['scripts/check-freeze.mjs', ...(patched ? ['--allow-patch'] : [])],
  { stdio: 'inherit' },
);
execFileSync(process.execPath, ['scripts/hash-corpus.mjs', '--check'], { stdio: 'inherit' });
assert.equal(
  execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim(),
  '',
  'tracked worktree changes must be committed before a run',
);
assert.ok(!existsSync(rawDirectory), `raw run already exists: ${runId}`);
mkdirSync(rawDirectory, { recursive: true });
mkdirSync(dirname(upstreamHarness), { recursive: true });
const originalUpstreamTest = readFileSync(upstreamHarness);
writeFileSync(upstreamHarness, readFileSync('harness/financial-research.corpus.test.ts'));
writeFileSync(observedFile, '');

const startedAt = new Date().toISOString();
const commandArgs = [
  'pnpm',
  'exec',
  'vitest',
  'run',
  upstreamHarnessRelative,
  '--reporter=json',
  `--outputFile=${vitestFile}`,
];
let execution;
try {
  execution = spawnSync('corepack', commandArgs, {
    cwd: target,
    encoding: 'utf8',
    env: {
      ...process.env,
      AGENT_RELIABILITY_CORPUS: corpus,
      AGENT_RELIABILITY_OBSERVED: observedFile,
      CI: '1',
      OPENAI_API_KEY: '',
    },
  });
} finally {
  writeFileSync(upstreamHarness, originalUpstreamTest);
}
if (execution.error) throw execution.error;
writeFileSync(stdoutFile, execution.stdout ?? '');
writeFileSync(stderrFile, execution.stderr ?? '');
assert.ok(existsSync(vitestFile), 'Vitest did not produce JSON evidence');

const corpusDocument = JSON.parse(readFileSync(corpus, 'utf8'));
const vitest = JSON.parse(readFileSync(vitestFile, 'utf8'));
const observedLines = readFileSync(observedFile, 'utf8')
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const observedById = new Map(observedLines.map((item) => [item.caseId, item.observed]));
const assertions = vitest.testResults.flatMap((suite) => suite.assertionResults ?? []);
assert.ok(assertions.length > 0, 'Vitest discovered zero corpus tests');
const assertionById = new Map();
for (const assertion of assertions) {
  const match = `${assertion.fullName ?? ''} ${assertion.title ?? ''}`.match(/FR-\d{3}/);
  if (match) assertionById.set(match[0], assertion);
}

const replacements = [
  [target, '<TARGET_CHECKOUT>'],
  [repo, '<REPOSITORY>'],
  [process.env.HOME ?? '', '<HOME>'],
];
const cases = corpusDocument.cases.map((item) => {
  const assertionResult = assertionById.get(item.id);
  const observed = observedById.get(item.id);
  assert.ok(assertionResult, `missing Vitest result for ${item.id}`);
  assert.ok(observed, `missing observed result for ${item.id}`);
  // Vitest reports more than passed and failed: pending, todo and skipped all mean the case never
  // ran. Folding them into 'fail' made the harnessError total below a bucket nothing could land in,
  // so "0 harness errors" was true by construction — and a case that never ran was published as a
  // defect in the target.
  const status =
    assertionResult.status === 'passed'
      ? 'pass'
      : assertionResult.status === 'failed'
        ? 'fail'
        : 'harness_error';
  return {
    id: item.id,
    title: item.title,
    status,
    evidenceLevel: item.evidenceLevel,
    oracle: item.oracle,
    observed,
    failureMessages: sanitizeValue(assertionResult.failureMessages ?? [], replacements),
  };
});

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

const rawArtifacts = [observedFile, vitestFile, stdoutFile, stderrFile].map((file) => ({
  name: file.slice(rawDirectory.length + 1),
  sha256: sha256(file),
}));
const totals = {
  cases: cases.length,
  pass: cases.filter((item) => item.status === 'pass').length,
  fail: cases.filter((item) => item.status === 'fail').length,
  harnessError: cases.filter((item) => !['pass', 'fail'].includes(item.status)).length,
};
// Infrastructure failures must not masquerade as target results, in either direction: a run that
// could not measure every case is not evidence and may not be recorded or compared against.
assert.equal(
  totals.harnessError,
  0,
  `harness errors are not target evidence: ${cases.filter((item) => item.status === 'harness_error').map((item) => item.id).join(', ')}`,
);
const result = sanitizeValue(
  {
    schemaVersion: 1,
    runId,
    runKind,
    startedAt,
    completedAt: new Date().toISOString(),
    evidenceLevel: 'synthetic-orchestration',
    target: {
      repository: 'openai/openai-agents-js',
      slice: 'examples/financial-research-agent',
      commitSha: execFileSync('git', ['-C', target, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    },
    corpus: {
      version: corpusDocument.corpusVersion,
      // Hash the corpus bytes this run actually read. Copying freeze.json's claim here made
      // validate-evidence compare freeze.json against itself.
      sha256: createHash('sha256').update(readFileSync(corpus)).digest('hex'),
    },
    runnerCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    command: `corepack ${commandArgs.join(' ')}`,
    environment: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      networkPolicy: 'denied by fake boundaries and fetch guard',
      apiKeyPresent: false,
    },
    processExitCode: execution.status,
    patch: patched
      ? {
          path: 'patches/openai-agents-js-financial-research-fail-closed.patch',
          sha256: createHash('sha256')
            .update(readFileSync('patches/openai-agents-js-financial-research-fail-closed.patch'))
            .digest('hex'),
        }
      : null,
    totals,
    cases,
    rawArtifacts,
    limitations: [
      'Deterministic agent boundaries replace hosted model and web-search calls.',
      'This run measures the frozen example manager orchestration only, not model or financial-analysis quality.',
    ],
  },
  replacements,
);

if (recordResult) {
  mkdirSync(dirname(trackedResult), { recursive: true });
  writeFileSync(trackedResult, `${JSON.stringify(result, null, 2)}\n`);
} else {
  const comparisonPath = runPaths[comparisonKey];
  assert.ok(
    existsSync(comparisonPath),
    `no canonical run to compare against at ${comparisonPath}; re-record deliberately with --record`,
  );
  const baseline = JSON.parse(readFileSync(comparisonPath, 'utf8'));
  assert.deepEqual(
    cases.map(({ id, status }) => ({ id, status })),
    baseline.cases.map(({ id, status }) => ({ id, status })),
    'reproduction outcomes differ from recorded baseline',
  );
}

console.log(
  `${result.runKind}: COMPLETE (${totals.pass} pass, ${totals.fail} fail, ${totals.harnessError} harness errors; process ${execution.status})`,
);
