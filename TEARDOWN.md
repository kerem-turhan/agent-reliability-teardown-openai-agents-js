# A fail-open report path in an open-source multi-agent research example

## Executive summary

I evaluated the first-party financial research example in OpenAI's JavaScript/TypeScript Agents SDK.
The target was frozen before results at commit
[`710cccfd8fd26b395f8e3470419852d76de80967`](https://github.com/openai/openai-agents-js/commit/710cccfd8fd26b395f8e3470419852d76de80967),
under the MIT license.

A six-case `synthetic-orchestration` corpus exercised the real `FinancialResearchManager` orchestration while
replacing hosted model and web-search calls with fixed boundaries. The baseline passed 4/6 cases.
Two of those passes replicate the example's own two shipped tests, so the result over the four cases
this teardown designed is 2 pass, 2 fail; the overlap is itemized under [Corpus](#corpus).
Two cases showed fail-open terminal behavior:

1. when every search failed, the manager still called the writer and emitted a report;
2. when verification remained negative after both permitted revisions, the manager still emitted the
   report.

A one-file patch added two fail-closed guards. The unchanged corpus then passed 6/6, the upstream
example's existing focused tests passed 2/2, and its TypeScript check passed after the required
workspace packages were built.

This is `synthetic-orchestration` evidence, not a model-quality benchmark, a financial-accuracy study,
a security finding, or evidence about production frequency.

## Target, commit, and license

| Field | Frozen value |
|---|---|
| Repository | [`openai/openai-agents-js`](https://github.com/openai/openai-agents-js) |
| Slice | `examples/financial-research-agent` |
| Commit | `710cccfd8fd26b395f8e3470419852d76de80967` |
| Git tree | `be99e83816cd30e4cf6cea9e4d521033d25a36bb` |
| License | MIT; license SHA-256 `969d1c8178ad9a1ae2ff1e67534151d4cc58a2626274b272f918995bccd3a6ad` |

Five active candidates were scored with a rubric frozen before selection. This is
`official-source-metadata`, not a measurement: the chosen example scored 100/100 because it is a
bounded TypeScript multi-agent workflow with a documented deterministic test seam. Full selection rationales and official GitHub sources are in
[`research/candidates.md`](research/candidates.md).

## System model

The example plans web searches, runs search agents concurrently, removes failed results, writes a
structured report, asks a verifier for `{ verified, issues }`, revises at most twice, and then emits
terminal output. The writer can also call specialist agents as tools.

The measured path was:

```text
fixed query
  -> deterministic plan/search boundary
  -> real parallel aggregation
  -> deterministic writer/verifier boundary
  -> real bounded revision loop
  -> real terminal-output decision
```

The detailed path and frozen source anchors are in [`docs/system-model.md`](docs/system-model.md).

## Method

The research boundary, scoring protocol, corpus rules, evidence levels, and claim policy were fixed
in [`docs/methodology.md`](docs/methodology.md) before selection and execution. The target
repository, full SHA, Git tree, license, and license hash were committed before case
execution. All seven requested reliability surfaces were classified before corpus construction:

- applicable: failed tool/search results, retry exhaustion, structured verifier output, graceful
  failure;
- not applicable to this single-query example: persistent state/memory leakage and user-facing
  multi-turn consistency;
- blocked at the no-secret boundary: real model tool selection and argument quality.

Every case declared its stimulus and oracle before baseline execution. The harness copies its test into
the upstream example's existing Vitest project only for the run, restores the original bytes in
`finally`, disables `fetch`, supplies no API key, and stores unsanitized output only under ignored
`.work/`. Tracked evidence is sanitized and hash-linked to the raw local artifacts.

## Corpus

| Case | Surface | Frozen oracle |
|---|---|---|
| FR-001 | Search aggregation | Concurrent completion preserves plan order. |
| FR-002 | Partial search failure | Continue with the usable summary. |
| FR-003 | Complete search failure | Stop before writer or terminal report. |
| FR-004 | Structured verification | An accepted initial report needs no revision. |
| FR-005 | Retry boundary | A report may pass on the final permitted attempt. |
| FR-006 | Retry exhaustion | Stop before emitting a still-rejected report. |

Corpus v1.0.0 contains six `synthetic-orchestration` cases and is frozen at SHA-256
`843f53f24466a2bf761d2cd73eacd205dd0c5527a986b775f9732044e5009dc8`.

### Overlap with the example's own tests

The frozen example ships exactly two focused tests, and this corpus reproduces both of them:

| Case | Upstream test in [`manager.test.ts`](https://github.com/openai/openai-agents-js/blob/710cccfd8fd26b395f8e3470419852d76de80967/examples/financial-research-agent/manager.test.ts#L73-L90) | Shared oracle |
|---|---|---|
| FR-004 | `does not revise a report that passes verification` | `verificationCalls = 1`, `revisionCalls = 0` |
| FR-005 | `revises and re-verifies until the report passes verification` | `verificationCalls = 3`, `revisionCalls = 2` |

Both cases were therefore expected to pass before the baseline ran: they restate behavior the target
already tests and already satisfies. They are kept because the remediation must not break them, and
because `teardown:verify-fix` re-runs the upstream tests directly. They are not independent evidence.

**Of the four cases this teardown designed, two passed (FR-001, FR-002) and two failed (FR-003,
FR-006). The headline 4/6 includes the two replicated cases.**

## Baseline

Canonical `baseline-002` completed all cases with **4 pass, 2 fail, 0 harness errors**.

| Case | Result | Relevant observation |
|---|---|---|
| FR-001 | PASS | Returned `Alpha source`, then `Beta source`, despite reverse completion order. |
| FR-002 | PASS | Returned only `Usable source` after the other search failed. |
| FR-003 | FAIL | `writerCalls=1`; `terminalReportEmitted=true`; outcome reported success. |
| FR-004 | PASS | One verification, zero revisions, terminal report emitted. |
| FR-005 | PASS | Three verifications, two revisions, then success. |
| FR-006 | FAIL | Three negative verifications, two revisions, terminal report still emitted. |

Two of the four passes — FR-004 and FR-005 — replicate the example's own shipped tests and were
expected to pass; over the four cases this teardown designed the baseline was **2 pass, 2 fail**.
See [Overlap with the example's own tests](#overlap-with-the-examples-own-tests).

The earlier run history is retained: one zero-test harness error and one baseline contaminated by an
upstream console guard. Neither was hidden or counted as canonical target evidence; see
[`evidence/baseline-summary.md`](evidence/baseline-summary.md).

## Findings

### F-001 — Complete search failure does not stop writing

`search()` converts exceptions to `null`; `performSearches()` filters those values; `run()` does not
check whether anything remains before calling `writeReport()`. In FR-003, both searches fail, yet the
writer is called and a report is emitted. This demonstrates an unguarded no-evidence path at the
manager boundary. It does not demonstrate hallucination by a real model.

### F-002 — Negative verification does not gate terminal output

The loop correctly limits revisions to two, but output is unconditional after the loop. In FR-006,
the verifier rejects the initial report and both revisions, yet the manager emits the report. This
demonstrates that verification is advisory after retry exhaustion in the frozen example. It does not
validate whether a real verifier's judgment is correct.

## Root cause

Both findings share one control-flow pattern: a negative prerequisite is represented in state, but no
guard connects that state to the terminal report path. Search failure becomes an empty array and final
verification remains `false`; both values flow into unconditional downstream work or output.

## Remediation

The patch changes only `examples/financial-research-agent/manager.ts`:

1. throw a descriptive error before the writer when zero usable search summaries remain;
2. throw a descriptive error before terminal output when verification remains negative after the
   bounded revision loop.

The patch SHA-256 is `129fc9c3fb37456fd9463ea856a7043a71df834f24b9f3e7ea1588ef17428997`.
It is stored in [`patches/openai-agents-js-financial-research-fail-closed.patch`](patches/openai-agents-js-financial-research-fail-closed.patch)
with MIT attribution. No upstream issue or pull request was created.

### What the patch does to the command line

Stopping by throwing is fail-closed at the manager boundary, but it is not yet a clean stop at the
example's command line, and this teardown owes the reader that distinction. The frozen entrypoint
raises the throw inside an `async` callback passed to `rl.question`, and `main().catch(...)` has
already settled by the time that callback runs, so nothing owns the rejection. Measured rather than
assumed, in [`experiments/cli-error-path/`](experiments/cli-error-path) and gated by
`npm run cli-error:repro`: the frozen shape terminates on an unhandled rejection and never reaches
the entrypoint's intended `console.error` plus `process.exit(1)`, while routing the callback's
promise — a one-line change in `main.ts` — produces the intended message and exit code.

The patch is deliberately left as it is. It is scoped to `manager.ts`, and the recorded remediation
run, its declared SHA-256, and every claim that cites it are frozen against that exact content. A
maintainer adopting this would want the entrypoint change alongside it; the experiment shows both
shapes so the difference is checkable rather than asserted.

## Before and after

Every figure in this table is `synthetic-orchestration`: real manager control flow, deterministic
fake model and web-search boundaries. Two of the four baseline passes replicate the example's own
shipped tests, as itemized under [Corpus](#overlap-with-the-examples-own-tests).

| Metric | Baseline | Patched |
|---|---:|---:|
| Frozen corpus pass | 4/6 | 6/6 |
| Frozen corpus fail | 2/6 | 0/6 |
| Harness error | 0 | 0 |
| Test-process exit | 1 | 0 |
| Upstream files changed | 0 | 1 |

FR-003 changed from writer invocation plus report emission to a controlled error before the writer.
FR-006 retained the same three verifier calls and two revisions but changed from report emission to a
controlled error. The other four cases stayed green.

## Reproduce

Prerequisites are Git, Node.js 22+, Corepack, and network access only for cloning GitHub and installing
locked npm packages. No model API key, paid API, database, or customer data is used.

```bash
npm ci
npm run verify
```

`npm run verify` checks provenance and frozen hashes, sets up the detached target checkout, validates
format/typecheck/lint/tests/build/docs/claims/attribution, reproduces the canonical `synthetic-orchestration`
baseline (4/6), applies the patch temporarily, reproduces 6/6 plus upstream compatibility checks, reverses the patch, and scans the
release. Individual commands are documented in [`README.md`](README.md).

## Limitations

- Fake planner/search/writer/verifier boundaries make every result synthetic orchestration evidence.
- No GPT-5.4 request, hosted web search, specialist tool decision, or financial fact was evaluated.
- The real end-to-end runtime could not be exercised without an API key; this remains a limitation,
  not a synthetic success.
- Tool selection/argument quality, source accuracy, financial correctness, latency, timeout behavior,
  production incidence, and user impact are unmeasured.
- The corpus covers one example at one commit. Results do not generalize to the Agents SDK, OpenAI
  products, other agents, or production systems.
- Throwing a descriptive manager error is verified. Its presentation at the example's command line
  was measured separately and is not clean in the frozen entrypoint shape: the error surfaces as an
  unhandled rejection rather than the intended `console.error` and exit code. See
  [What the patch does to the command line](#what-the-patch-does-to-the-command-line).

## Actionable checklist for agent teams

- Define the minimum usable evidence required before synthesis and enforce it in code.
- Treat verifier retry exhaustion as a terminal state, not an automatic fall-through to success.
- Separate partial degradation from total evidence loss with explicit policies.
- Test boundary sequences such as all tools fail, some tools fail, final retry passes, and retry budget
  exhausts.
- Assert both returned state and side effects: downstream calls, final emission, persistence, and user
  notifications.
- Make harness errors a separate outcome so infrastructure failures cannot masquerade as target bugs.
- Freeze target, corpus, and oracles before results; preserve negative and contaminated runs.
- Label fake-model results at the case, evidence, and prose levels.

## Claim-to-evidence index

Every external or quantitative claim above is mapped in [`CLAIMS.md`](CLAIMS.md) and validated from
[`claims/claims.json`](claims/claims.json).
