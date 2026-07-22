# Claim → evidence index

Scope: every runtime result in this teardown is `synthetic-orchestration` — real orchestration
control flow driven through deterministic fake model and web-search boundaries. The Evidence level
column states what backs each individual row. Nothing here is a model-quality, financial-accuracy,
security, or production-frequency claim.

| ID | Claim | Evidence level | Evidence path | Reproduction / validation command |
|---|---|---|---|---|
| C-001 | Frozen target, commit, and MIT license | `official-source-metadata` | `research/target-freeze.json`; `THIRD_PARTY_NOTICES.md` | `npm run freeze:check` |
| C-002 | Five candidates; selected score 100/100 | `official-source-metadata` | `research/candidates.json`; `research/candidates.md` | `npm run candidates:check` |
| C-003 | Six-case frozen synthetic corpus | `synthetic-orchestration` | `evaluation/corpus/` | `npm run corpus:validate && npm run corpus:hash -- --check` |
| C-004 | Baseline 4 pass / 2 fail / 0 harness errors | `synthetic-orchestration` | `evidence/runs/baseline-002/results.json` | `npm run evidence:validate` |
| C-005 | All-search-failed path calls writer and emits | `synthetic-orchestration` | baseline FR-003; `findings/F-001.md` | `npm run teardown:baseline` |
| C-006 | Retry exhaustion still emits report | `synthetic-orchestration` | baseline FR-006; `findings/F-002.md` | `npm run teardown:baseline` |
| C-007 | Patched corpus 6/6 | `synthetic-orchestration` | `evidence/runs/remediation-001/results.json` | `npm run teardown:verify-fix` |
| C-008 | One-file patch and declared SHA-256 | `static-analysis` | `patches/manifest.json` | `npm run patch:check` |
| C-009 | Patched upstream tests 2/2 and example typecheck | `observed-runtime` | `evidence/remediation-summary.md` | `npm run teardown:verify-fix` |

FR-004 and FR-005 reproduce the example's own two shipped tests, so two of C-004's four passes were
expected; see [TEARDOWN.md](TEARDOWN.md#overlap-with-the-examples-own-tests).

Machine-readable scopes, evidence levels, and limitations are in [`claims/claims.json`](claims/claims.json).
