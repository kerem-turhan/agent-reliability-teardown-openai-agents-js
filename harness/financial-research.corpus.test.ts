import { appendFileSync, readFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, test, vi } from 'vitest';
import type {
  FinancialReportData,
  FinancialSearchItem,
  FinancialSearchPlan,
  VerificationResult,
} from './agents';
import { FinancialResearchManager } from './manager';

type SearchOutcome =
  | { kind: 'success'; value: string; delayMs: number }
  | { kind: 'failure'; message: string; delayMs: number };

type CorpusCase = {
  id: string;
  title: string;
  entrypoint: 'performSearches' | 'run';
  setup: {
    searchPlan?: string[];
    searchOutcomes?: Record<string, SearchOutcome>;
    fixedSearchResults?: string[];
    verificationSequence?: VerificationResult[];
  };
  oracle: Record<string, unknown>;
};

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Harness environment is missing ${name}.`);
  return value;
}

const corpusPath = requiredEnvironment('AGENT_RELIABILITY_CORPUS');
const observedPath = requiredEnvironment('AGENT_RELIABILITY_OBSERVED');

const corpus = JSON.parse(readFileSync(corpusPath, 'utf8')) as {
  evidenceBoundary: string;
  cases: CorpusCase[];
};
if (corpus.evidenceBoundary !== 'synthetic-orchestration') {
  throw new Error('Corpus evidence boundary is not synthetic-orchestration.');
}

const initialReport: FinancialReportData = {
  short_summary: 'Synthetic initial summary',
  markdown_report: 'Synthetic initial report',
  follow_up_questions: [],
};

const originalFetch = globalThis.fetch;
beforeAll(() => {
  globalThis.fetch = async () => {
    throw new Error('Network denied by reliability harness');
  };
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

function makePlan(queries: string[]): FinancialSearchPlan {
  return {
    searches: queries.map((query) => ({ query, reason: `Synthetic reason for ${query}` })),
  };
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

class SearchBoundaryManager extends FinancialResearchManager {
  constructor(private readonly outcomes: Record<string, SearchOutcome>) {
    super();
  }

  override async search(item: FinancialSearchItem): Promise<string | null> {
    const outcome = this.outcomes[item.query];
    if (!outcome) throw new Error(`Missing synthetic outcome for ${item.query}`);
    await sleep(outcome.delayMs);
    return outcome.kind === 'success' ? outcome.value : null;
  }
}

class RunBoundaryManager extends SearchBoundaryManager {
  writerCalls = 0;
  revisionCalls = 0;
  verificationCalls = 0;

  constructor(private readonly corpusCase: CorpusCase) {
    super(corpusCase.setup.searchOutcomes ?? {});
  }

  override async planSearches(): Promise<FinancialSearchPlan> {
    return makePlan(this.corpusCase.setup.searchPlan ?? []);
  }

  override async performSearches(plan: FinancialSearchPlan): Promise<string[]> {
    if (this.corpusCase.setup.fixedSearchResults) {
      return this.corpusCase.setup.fixedSearchResults;
    }
    return super.performSearches(plan);
  }

  override async writeReport(): Promise<FinancialReportData> {
    this.writerCalls++;
    return initialReport;
  }

  override async verifyReport(): Promise<VerificationResult> {
    const sequence = this.corpusCase.setup.verificationSequence ?? [];
    const value = sequence[Math.min(this.verificationCalls, sequence.length - 1)];
    this.verificationCalls++;
    if (!value) throw new Error('Synthetic verification sequence is empty');
    return value;
  }

  override async reviseReport(): Promise<FinancialReportData> {
    this.revisionCalls++;
    return {
      ...initialReport,
      short_summary: `Synthetic revised summary ${this.revisionCalls}`,
    };
  }
}

function record(caseId: string, observed: Record<string, unknown>): void {
  appendFileSync(observedPath, `${JSON.stringify({ caseId, observed })}\n`);
}

for (const corpusCase of corpus.cases) {
  test(`${corpusCase.id} ${corpusCase.title} [synthetic-orchestration]`, async () => {
    if (corpusCase.entrypoint === 'performSearches') {
      const manager = new SearchBoundaryManager(corpusCase.setup.searchOutcomes ?? {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      let returnedSearchResults: string[];
      try {
        returnedSearchResults = await manager.performSearches(
          makePlan(corpusCase.setup.searchPlan ?? []),
        );
      } finally {
        logSpy.mockRestore();
      }
      const observed = { outcome: 'success', returnedSearchResults };
      record(corpusCase.id, observed);
      expect(observed).toEqual(corpusCase.oracle);
      return;
    }

    const manager = new RunBoundaryManager(corpusCase);
    const logs: string[] = [];
    const logSpy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    });
    let outcome = 'success';
    let errorName: string | undefined;
    try {
      await manager.run('Synthetic financial research query');
    } catch (error) {
      outcome = 'controlled_error';
      errorName = error instanceof Error ? error.name : 'UnknownError';
    } finally {
      logSpy.mockRestore();
    }

    const observed: Record<string, unknown> = {
      outcome,
      writerCalls: manager.writerCalls,
      verificationCalls: manager.verificationCalls,
      revisionCalls: manager.revisionCalls,
      terminalReportEmitted: logs.some((line) => line.startsWith('Report summary')),
    };
    if (errorName) observed.errorName = errorName;

    const projected = Object.fromEntries(
      Object.keys(corpusCase.oracle).map((key) => [key, observed[key]]),
    );
    record(corpusCase.id, observed);
    expect(projected).toEqual(corpusCase.oracle);
  });
}
