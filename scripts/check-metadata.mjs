import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// The published GitHub description and topics are the first — often the only — thing a reader sees:
// they render in search results and in link previews, and they carry headline numbers. `docs:check`
// asserts offline that the declared metadata is in policy; this script asserts that what GitHub
// actually serves equals what is declared.
//
// Fail-closed on purpose. If the GitHub CLI is missing, unauthenticated, rate-limited, or offline
// this exits non-zero instead of skipping. A check that cannot look must answer "no", never "yes";
// a skip here would silently re-open exactly the gap it exists to close. It is therefore kept out
// of `verify` (which must run for any reader, offline) and lives in `release:check` instead.
const declared = JSON.parse(readFileSync('release-metadata.json', 'utf8'));

let payload;
try {
  payload = execFileSync('gh', ['api', `repos/${declared.repository}`, '--jq', '{description,topics,visibility}'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (error) {
  assert.fail(
    `cannot read live repository metadata for ${declared.repository}, so this gate fails closed: ${
      error.stderr?.toString().trim() || error.message
    }`,
  );
}

const live = JSON.parse(payload);
assert.equal(
  live.description,
  declared.description,
  'published GitHub description differs from release-metadata.json',
);
assert.deepEqual(
  [...(live.topics ?? [])].sort(),
  [...declared.topics].sort(),
  'published GitHub topics differ from release-metadata.json',
);
console.log(`metadata: PASS (${declared.repository} is ${live.visibility}, description and ${declared.topics.length} topics match)`);
