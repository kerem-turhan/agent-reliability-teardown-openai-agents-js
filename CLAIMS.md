# Claim → evidence index

| ID | Claim | Evidence path | Reproduction / validation command |
|---|---|---|---|
| C-001 | Frozen target, commit, and MIT license | `research/target-freeze.json`; `THIRD_PARTY_NOTICES.md` | `npm run freeze:check` |
| C-002 | Five candidates; selected score 100/100 | `research/candidates.json`; `research/candidates.md` | `npm run candidates:check` |
| C-003 | Six-case frozen synthetic corpus | `evaluation/corpus/` | `npm run corpus:validate && npm run corpus:hash -- --check` |
| C-004 | Baseline 4 pass / 2 fail / 0 harness errors | `evidence/runs/baseline-002/results.json` | `npm run evidence:validate` |
| C-005 | All-search-failed path calls writer and emits | baseline FR-003; `findings/F-001.md` | `npm run teardown:baseline` |
| C-006 | Retry exhaustion still emits report | baseline FR-006; `findings/F-002.md` | `npm run teardown:baseline` |
| C-007 | Patched corpus 6/6 | `evidence/runs/remediation-001/results.json` | `npm run teardown:verify-fix` |
| C-008 | One-file patch and declared SHA-256 | `patches/manifest.json` | `npm run patch:check` |
| C-009 | Patched upstream tests 2/2 and example typecheck | `evidence/remediation-summary.md` | `npm run teardown:verify-fix` |

Machine-readable scopes, evidence levels, and limitations are in [`claims/claims.json`](claims/claims.json).
