# Baseline summary

**Canonical run:** `baseline-002`  
**Target:** `openai/openai-agents-js` at `710cccfd8fd26b395f8e3470419852d76de80967`  
**Corpus:** v1.0.0, SHA-256 `843f53f24466a2bf761d2cd73eacd205dd0c5527a986b775f9732044e5009dc8`  
**Evidence level:** `synthetic-orchestration`

The clean confirmation baseline completed all six frozen cases: **4 passed, 2 failed, and 0 had a
harness error**. The deterministic boundaries replace model and hosted web-search calls, while the
real `FinancialResearchManager` aggregation, retry, and terminal-output paths execute unchanged.

| Case | Result | Observed boundary behavior |
|---|---|---|
| FR-001 | PASS | Concurrent search completion preserved plan order. |
| FR-002 | PASS | One failed search was removed while one usable summary continued. |
| FR-003 | FAIL | After both searches failed, the writer was called once and a report was emitted. |
| FR-004 | PASS | An initially verified report completed with zero revisions. |
| FR-005 | PASS | Verification passed on the final allowed attempt after two revisions. |
| FR-006 | FAIL | After three negative verifier decisions, the manager emitted the still-unverified report. |

Canonical machine-readable evidence: [`runs/baseline-002/results.json`](runs/baseline-002/results.json).
Reproduce after target installation with `npm run teardown:baseline`; once a canonical baseline exists,
the command creates an ignored reproduction run and compares case statuses.

## Harness history

- `harness-error-001`: zero tests discovered; no target result counted.
- `baseline-001`: two valid target failures plus two console-guard harness errors; the immutable run is
  accompanied by a hash-bound adjudication.
- `baseline-002`: expected manager logs isolated; canonical `synthetic-orchestration` result of 4/6
  pass and 2/6 fail.

