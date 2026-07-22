import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// What the fail-closed patch does to the example's command line, measured rather than assumed.
//
// The patch replaces silent report emission with `throw`. The teardown claimed only that "CLI
// presentation of that error was not evaluated". This measures it: in the frozen entrypoint shape
// the throw is raised inside an async `rl.question` callback whose promise nobody owns, and
// `main().catch(...)` has already settled by then — so the intended `console.error` + `exit(1)`
// never runs and Node terminates on an unhandled rejection instead.
//
// Both directions are asserted. If the frozen shape ever stops producing an unhandled rejection, or
// the one-line entrypoint fix ever stops producing a clean exit, this gate fails rather than
// quietly agreeing with whatever it sees.
const here = dirname(fileURLToPath(import.meta.url));
const entrypoint = join(here, 'entrypoint.mjs');

const run = (mode) =>
  spawnSync(process.execPath, [entrypoint, mode], {
    input: 'a query\n',
    encoding: 'utf8',
  });

const frozen = run('frozen');
assert.notEqual(frozen.status, 0, 'the frozen entrypoint shape must not exit cleanly on a throw');
assert.match(
  frozen.stderr,
  /ERR_UNHANDLED_REJECTION|Financial research stopped/,
  'the throw must surface as an unhandled rejection',
);
assert.doesNotMatch(frozen.stderr, /main\(\)\.catch/, 'main().catch cannot see it: it settled first');

const handled = run('handled');
assert.equal(handled.status, 1, 'routing the callback promise must produce the intended exit code');
assert.match(handled.stderr, /handled: Financial research stopped/);

console.log(
  `cli-error-path: PASS (frozen shape exits ${frozen.status} via unhandled rejection; ` +
    `routed shape exits ${handled.status} with the intended message)`,
);
