# Remediation summary

**Canonical run:** `remediation-001`  
**Evidence level:** `synthetic-orchestration`

The minimal patch changes one upstream file with two fail-closed guards. The target commit and corpus
remain unchanged; the remediation run records the declared patch SHA separately.

| Metric | Baseline (`baseline-002`) | Remediation (`remediation-001`) |
|---|---:|---:|
| Corpus cases | 6 | 6 |
| Pass | 4 | 6 |
| Fail | 2 | 0 |
| Harness error | 0 | 0 |
| Vitest exit | 1 | 0 |

The upstream example's existing focused tests also passed **2/2** with the patch applied. The example
TypeScript check initially failed because workspace packages had not been built; after building the
official `@openai/agents` workspace dependency chain, the same `build-check` command passed. These
commands validate compatibility but are not added to the six-case corpus score.

- Canonical GREEN evidence: [`runs/remediation-001/results.json`](runs/remediation-001/results.json)
- Patch and hash: [`../patches/manifest.json`](../patches/manifest.json)
- Reproduce: `npm run teardown:verify-fix`

