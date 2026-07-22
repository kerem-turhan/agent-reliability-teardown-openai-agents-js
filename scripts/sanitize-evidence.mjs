import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { sanitizeForRelease } from './lib/release-evidence.mjs';

// Convert a recorded run into the published shape, in place. Recording keeps the full local detail
// (runner commit, raw artifact hashes, host); publishing keeps only what a reader can act on.
const [path] = process.argv.slice(2);
assert.ok(path, 'usage: node scripts/sanitize-evidence.mjs <path to results.json>');

const recorded = JSON.parse(readFileSync(path, 'utf8'));
const sanitized = sanitizeForRelease(recorded);
writeFileSync(path, `${JSON.stringify(sanitized, null, 2)}\n`);
console.log(`sanitize-evidence: ${path} (${recorded.runKind}, ${sanitized.command})`);
