# Release plan

## Goal

Produce a sterile, independently reproducible release repository for the frozen OpenAI Agents JS
financial-research teardown while keeping the GitHub repository private until a human explicitly
decides to publish it.

## Included

- The public teardown, claim map, methodology, system model, findings, frozen corpus, deterministic
  harness, sanitized canonical evidence, remediation patch, attribution, and required verification
  code.
- Only paths enumerated in `release-manifest.json` may be tracked.

## Excluded

- Private operations, commercial, legal, outreach, status, decision, progress, and development-log
  material.
- Raw evidence, temporary upstream checkouts, credentials, personal data, absolute user paths,
  machine-local identifiers, and source-repository Git history.
- Upstream issues, pull requests, messages, or any other external publication action.

## Evidence and claim boundary

Every runtime result is `synthetic-orchestration`: deterministic planner, search, writer, and verifier
boundaries exercise the frozen manager control flow. The release makes no claim about security,
production frequency, financial correctness, model quality, or the Agents SDK as a whole.

## Acceptance and verification

1. Initialize a new repository on `main` with only allowlisted files and a fresh history.
2. Run `npm ci && npm run verify` twice consecutively from a clean tracked worktree.
3. Require both runs to exit zero, restore the temporary upstream checkout to the frozen commit with
   no changes, and leave no matching child process running.
4. Scan tracked files and the complete release history for secrets, personal paths/data, forbidden
   material, and allowlist drift.
5. Push `main` to a private GitHub repository and confirm the local and remote commits match.

The only post-build human decision is whether to change GitHub visibility from private to public.
