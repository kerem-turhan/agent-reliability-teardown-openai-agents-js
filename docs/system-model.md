# Frozen target system model

## Measured target

The frozen target is the `examples/financial-research-agent` first-party example in
`openai/openai-agents-js` at commit `710cccfd8fd26b395f8e3470419852d76de80967`. Exact provenance
is in [`../research/target-freeze.json`](../research/target-freeze.json).

## Execution path

The manager implements this pipeline:

```text
query
  -> planner returns structured search plan
  -> searches run concurrently and failures become null
  -> null search results are removed, preserving plan order
  -> writer creates a structured report from retained summaries
  -> verifier returns { verified, issues }
  -> writer revises and verifier retries at most twice
  -> manager prints the report and final verification object
```

Frozen source anchors:

- Manager pipeline and terminal output: [`manager.ts` lines 43–69](https://github.com/openai/openai-agents-js/blob/710cccfd8fd26b395f8e3470419852d76de80967/examples/financial-research-agent/manager.ts#L43-L69)
- Parallel search aggregation and exception conversion: [`manager.ts` lines 80–108](https://github.com/openai/openai-agents-js/blob/710cccfd8fd26b395f8e3470419852d76de80967/examples/financial-research-agent/manager.ts#L80-L108)
- Structured planner and verifier schemas: [`agents.ts` lines 21–52 and 78–100](https://github.com/openai/openai-agents-js/blob/710cccfd8fd26b395f8e3470419852d76de80967/examples/financial-research-agent/agents.ts#L21-L100)
- Writer schema and specialist agent tools: [`agents.ts` lines 102–125](https://github.com/openai/openai-agents-js/blob/710cccfd8fd26b395f8e3470419852d76de80967/examples/financial-research-agent/agents.ts#L102-L125) and [`manager.ts` lines 21–41](https://github.com/openai/openai-agents-js/blob/710cccfd8fd26b395f8e3470419852d76de80967/examples/financial-research-agent/manager.ts#L21-L41)
- Official deterministic manager seam: [`manager.test.ts` lines 21–90](https://github.com/openai/openai-agents-js/blob/710cccfd8fd26b395f8e3470419852d76de80967/examples/financial-research-agent/manager.test.ts#L21-L90)

## Measurement boundary

The harness executes the real `FinancialResearchManager.run()` and/or `performSearches()` methods.
Subclasses replace planner, individual search agent, writer, reviser, and verifier calls with
deterministic fixtures. This is `synthetic-orchestration` evidence: it measures how the real manager
aggregates failures, enforces revision bounds, and decides whether to emit a report. It does not
measure GPT-5.4, web search, specialist tool choice, source accuracy, financial correctness, or the
Agents SDK as a whole.

The canonical applicability record is [`../evaluation/failure-modes.json`](../evaluation/failure-modes.json).

