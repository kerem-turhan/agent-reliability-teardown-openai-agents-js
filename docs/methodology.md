# Methodology

## 1. Research boundary

Candidate and target facts may come only from official GitHub repositories and their first-party
documentation, license files, issues, releases, commit history, and GitHub API metadata. Search
results are discovery aids, not evidence. Each retained fact records a direct URL and retrieval date.
No private systems, customer material, third-party commentary, or employer-internal or otherwise
NDA-covered material is used.

## 2. Candidate scoring protocol

Score 3–5 candidates without running teardown cases. Record the full scoring sheet before selecting
the target. The maximum is 100:

| Dimension | Max | Precommitted anchors |
|---|---:|---|
| Target-customer relevance | 25 | 0: no agent behavior; 10: framework/library only; 18: real example workflow; 25: known runnable agent application with multi-step/tool behavior |
| No-secret/no-payment reproducibility | 25 | 0: paid hosted dependency required; 10: substantial core path unavailable offline; 18: fake provider can exercise a documented core path; 25: relevant runtime path is fully local and deterministic |
| Measurable failure surface | 20 | 0: no observable oracle; 8: logs/manual judgment only; 14: one automatable surface; 20: multiple automatable orchestration surfaces with explicit expected outcomes |
| Maintenance/adoption signal | 15 | 0: archived/stale; 5: recent commits only; 10: recent commits plus releases/issues; 15: recent maintenance plus strong use signal visible on GitHub |
| License/attribution clarity | 10 | 0: missing/non-permissive/ambiguous; 5: permissive but dependency or attribution ambiguity; 10: clear OSI-style permissive license and attribution path |
| Overnight scopeability | 5 | 0: relevant slice cannot be isolated; 3: isolated with material setup; 5: small documented slice with bounded setup |

Rules:

1. Scores are integers and each score has a source-backed rationale.
2. Eligibility requires a non-archived repository with a maintainer-authored commit or official
   release in the 12 months before 2026-07-20. Bot-only activity does not establish active status.
3. The measured target must be a runnable agent application or first-party example system. A
   framework/library without a concrete multi-step or tool-using example is disqualified regardless
   of its total score.
4. A missing or non-permissive license disqualifies the candidate regardless of total.
5. A candidate requiring paid API use or a secret for the measured path is disqualified.
6. Minimum selection score is 70 and target-customer relevance must be at least 18.
7. Tie-break order is reproducibility, measurable failure surface, customer relevance, TypeScript
   implementation preference, then lower setup cost. Stars never break a tie by themselves.
8. Freeze the highest eligible candidate. Record repository, full commit SHA, license SPDX/name,
   license-file hash, and source archive/tree hash before any corpus execution.
9. If no candidate reaches every eligibility threshold, stop and ask one scope-changing question;
   do not alter the rubric.

## 3. System model and failure-mode applicability

Before corpus construction, model the frozen agent as: input → model decision → tool dispatch → tool
result → state transition → next turn → output/failure. Assess these surfaces individually:

- tool selection and argument validation;
- malformed or throwing tool results;
- timeout and retry behavior;
- state or memory leakage;
- multi-turn consistency;
- structured-output handling;
- graceful failure.

For each surface record `applicable`, `not_applicable`, or `blocked`, with a code path and reason.
Only applicable surfaces enter the corpus. `Blocked` is a limitation, never a synthetic pass.

## 4. Corpus rules

- Version the corpus schema and every case ID.
- Each case defines the measured boundary, setup, deterministic stimulus, oracle, expected outcome,
  allowed variance, and evidence outputs.
- Cases are frozen before baseline execution by hashing the corpus manifest.
- Do not edit an executed case to make it pass. Corrections create a new corpus version and preserve
  the prior result.
- Use fake time, seeded data, isolated temporary directories, and local fake tools where needed.
- No network, paid API, secret, personal data, or hidden user-machine dependency in verification.

## 5. Evidence and sanitization

Every run receives an immutable run ID and records environment, target SHA, corpus hash, command,
exit code, timestamps, per-case outcome, and artifact hashes. Unsanitized raw evidence is retained
locally in an ignored `.work/evidence-raw/` path and is never committed. A deterministic sanitizer
produces tracked evidence with absolute home paths, tokens, credentials, email addresses, and
incidental machine identifiers removed. Sanitization must preserve semantic fields needed to
reproduce the claim. Raw and sanitized hashes are cross-recorded, and a leak scanner gates
publication readiness.

Evidence levels:

- `observed-runtime`: executed against the frozen target runtime path;
- `synthetic-orchestration`: executed with a deterministic fake model/tool at a real orchestration
  boundary;
- `static-analysis`: derived from source inspection without runtime execution;
- `limitation`: relevant behavior could not be executed or observed.

## 6. Finding and remediation rules

A finding is meaningful only when it is reproducible, user-observable at the measured boundary,
traceable to a root-cause code path, and not merely a preference. Severity describes demonstrated
impact within the harness, not production prevalence or security impact. Security language is
forbidden unless the evidence directly establishes a security property.

For remediation:

1. preserve the baseline evidence;
2. add a local test that fails for the observed behavior (`RED`);
3. record the non-zero result;
4. apply the smallest license-compatible patch in a temporary checkout;
5. rerun the focused test and complete corpus (`GREEN`);
6. store patch, hashes, commands, and before/after counts;
7. state what remains unproved.

## 7. Claim policy

The final teardown contains a `claim → evidence path/command` table. Quantitative claims must point
to machine-readable results and the exact reproduction command. Repository activity and license
claims point to frozen official metadata. Interpretive prose is explicitly framed as an inference.
No claim may generalize beyond the frozen commit, corpus, adapter boundary, or observed runtime.
