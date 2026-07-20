# Candidate Selection

**Evidence cutoff:** 2026-07-20  
**Source boundary:** official GitHub repositories, files, commits, releases, and GitHub metadata only  
**Result boundary:** no teardown corpus or baseline was executed during selection

The scoring anchors, eligibility rules, and tie-break order were fixed in
[`docs/methodology.md`](../docs/methodology.md) before this research. The machine-readable
record and rationales are in [`candidates.json`](candidates.json).

| Rank | Candidate and measured slice | Rel. /25 | Repro. /25 | Failure /20 | Maint. /15 | License /10 | Scope /5 | Total |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | `openai/openai-agents-js` — financial research example | 25 | 25 | 20 | 15 | 10 | 5 | **100** |
| 2 | `elizaOS/eliza` — local agent runtime | 25 | 18 | 20 | 15 | 10 | 1 | **89** |
| 3 | `bytedance/UI-TARS-desktop` — Agent TARS snapshots | 25 | 10 | 20 | 15 | 10 | 3 | **83** |
| 4 | `langchain-ai/open-swe` — coding-agent middleware | 25 | 10 | 20 | 15 | 10 | 1 | **81** |
| 5 | `simstudioai/sim` — workflow agent block | 25 | 10 | 20 | 15 | 10 | 1 | **81** |

## Frozen selection rationale

The selected slice is OpenAI's first-party TypeScript financial research example. It is a runnable
multi-agent system, not an eval library: a planner creates searches, search agents run in parallel,
a writer produces structured output, specialist agents are exposed as tools, and a verifier drives a
bounded revision loop. Its official test already demonstrates a deterministic subclass seam around
the manager, allowing orchestration behavior to be measured without a key or paid call.

The other four are eligible and active, but their credible runtime slices require substantially more
infrastructure (large monorepos, databases, cloud sandboxes, multimodal models, or recorded-only
boundaries). The selected example therefore wins both the fixed total and the intended overnight
scope constraint. Popularity did not break a tie.

The target commit, license hash, and Git tree are owned by [`target-freeze.json`](target-freeze.json).

