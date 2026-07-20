# Open-source AI agent reliability teardown

A clean-room, reproducible teardown of the financial research example in
[`openai/openai-agents-js`](https://github.com/openai/openai-agents-js), frozen at commit
`710cccfd8fd26b395f8e3470419852d76de80967`.

The six-case deterministic baseline found two fail-open orchestration paths: the manager emitted a
report after all searches failed and after verification remained negative through its retry budget.
Baseline: **4/6**. A one-file fail-closed patch: **6/6**.

Read the full constructive analysis in [TEARDOWN.md](TEARDOWN.md).

## Reproduce everything

Prerequisites: Git, Node.js 22+, Corepack, and network access for the initial GitHub clone and locked
package installation. No model API key, paid API, database, or private data is required.

```bash
npm ci
npm run verify
```

The target is cloned into ignored `.work/`, checked out detached at the frozen SHA, and never vendored.
The patch is applied only for its verification run and is reversed automatically.

## Focused commands

| Command | Purpose |
|---|---|
| `npm run target:setup` | Clone, verify, install, and build the frozen target dependencies |
| `npm run teardown:baseline` | Reproduce and compare the canonical 4/6 baseline |
| `npm run teardown:verify-fix` | Apply patch, reproduce 6/6, run upstream compatibility checks, reverse patch |
| `npm run evidence:validate` | Validate target/corpus/run/raw hashes and counts |
| `npm run findings:validate` | Validate both RED → GREEN findings |
| `npm test` | Run local contract and sanitizer tests |
| `npm run verify` | Run the complete release gate |

## Evidence map

- Candidate selection: [`research/candidates.md`](research/candidates.md)
- Target freeze: [`research/target-freeze.json`](research/target-freeze.json)
- Methodology: [`docs/methodology.md`](docs/methodology.md)
- System model: [`docs/system-model.md`](docs/system-model.md)
- Corpus and failure map: [`evaluation/`](evaluation)
- Baseline and remediation: [`evidence/`](evidence)
- Findings: [`findings/`](findings)
- Minimal patch: [`patches/`](patches)
- Claim index: [`CLAIMS.md`](CLAIMS.md)

## Evidence boundary

All six cases are labeled `synthetic-orchestration`: real manager control flow, deterministic fake
agent boundaries. The project makes no claim about model quality, financial correctness, security,
production frequency, or the Agents SDK as a whole. See the limitations in [TEARDOWN.md](TEARDOWN.md).

## License and attribution

This teardown and harness are MIT licensed. The evaluated target is also MIT licensed and remains
copyright OpenAI; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

