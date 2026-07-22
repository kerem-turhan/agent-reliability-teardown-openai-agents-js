// The transformation that turns a locally recorded run into the evidence this repository publishes.
//
// It used to exist only as an unpublished step: the tracked results.json files carried a
// `sanitizedForRelease` flag that no code in the repository produced, and their shape (no
// `runnerCommit`, no `rawArtifacts`, a two-field `environment`, a command written as the npm script
// rather than the underlying pnpm invocation) could not be derived from anything a reader could run.
// A repository whose subject is reproducibility cannot ship a hand-made artifact, so the step is
// here, is applied by `scripts/sanitize-evidence.mjs`, and is asserted to be exactly the shape of
// the published files by `tests/evidence.test.mjs`.
//
// What it removes and why:
// - `runnerCommit`: links published evidence to the private working repository it was produced in.
// - `rawArtifacts`: hashes of files under ignored `.work/`, which no reader can hold, so publishing
//   them advertises a check nobody can perform.
// - `environment.node` / `.platform` / `.architecture`: a host fingerprint. What matters for the
//   claim is the network and API-key policy, and those are kept.
// - `command`: the recorded pnpm invocation embeds absolute paths from the machine that ran it; the
//   npm script name is what a reader actually types.
//
// Order is preserved so the output is byte-stable, and the run's substance — totals, case statuses,
// target commit, corpus hash, patch identity, limitations — is never touched.
export const RELEASE_COMMANDS = {
  baseline: 'npm run teardown:baseline',
  remediation: 'npm run teardown:verify-fix',
};

const DROPPED_KEYS = ['runnerCommit', 'rawArtifacts'];
const KEPT_ENVIRONMENT_KEYS = ['networkPolicy', 'apiKeyPresent'];

export const sanitizeForRelease = (result) => {
  const command = RELEASE_COMMANDS[result.runKind];
  if (!command) throw new Error(`no release command is declared for runKind ${result.runKind}`);

  const sanitized = {};
  for (const [key, value] of Object.entries(result)) {
    if (DROPPED_KEYS.includes(key)) continue;
    if (key === 'command') {
      sanitized.command = command;
      continue;
    }
    if (key === 'environment') {
      sanitized.environment = Object.fromEntries(
        KEPT_ENVIRONMENT_KEYS.filter((name) => name in value).map((name) => [name, value[name]]),
      );
      continue;
    }
    sanitized[key] = value;
    // The flag sits immediately after evidenceLevel in the published files; emitting it here keeps
    // key order identical to what is already tracked.
    if (key === 'evidenceLevel') sanitized.sanitizedForRelease = true;
  }
  return sanitized;
};
