# Security and limitations

This repository documents a bounded reliability observation, not a security vulnerability. Please do
not interpret the findings, severity labels, or patch as a security advisory.

All results are `synthetic-orchestration`: deterministic test doubles replace hosted model and web
search calls while the frozen example manager's aggregation, retry, and terminal-output decisions run.
The evidence does not measure model quality, financial correctness, source accuracy, user harm,
production frequency, exploitability, or the OpenAI Agents SDK as a whole.

The repository intentionally contains no credentials and requires no model API key. If you discover a
credential or personal-data exposure in this repository, use GitHub's private vulnerability reporting
feature rather than opening a public issue. For security issues in the upstream project, follow the
upstream repository's current security policy.
