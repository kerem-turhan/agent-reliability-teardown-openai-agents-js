import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const map = JSON.parse(await readFile('evaluation/failure-modes.json', 'utf8'));
const required = new Set([
  'tool_selection_arguments',
  'malformed_tool_result',
  'timeout_retry',
  'state_memory_leakage',
  'multi_turn_consistency',
  'structured_output',
  'graceful_failure',
]);
assert.equal(map.schemaVersion, 1);
assert.equal(map.evidenceBoundary, 'synthetic-orchestration');
assert.equal(map.surfaces.length, required.size);
for (const surface of map.surfaces) {
  assert.ok(required.delete(surface.id), `duplicate or unknown surface: ${surface.id}`);
  assert.ok(['applicable', 'not_applicable', 'blocked'].includes(surface.status));
  assert.ok(surface.reason.length > 40, `${surface.id} lacks rationale`);
  assert.ok(surface.sourcePaths.length > 0, `${surface.id} lacks source path`);
}
assert.equal(required.size, 0, `missing surfaces: ${[...required].join(', ')}`);
console.log(`failure-map: PASS (${map.surfaces.length} surfaces classified)`);

