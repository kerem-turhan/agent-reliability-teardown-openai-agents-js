// The record-versus-compare decision for a teardown run, kept pure so it can be probed without a
// target checkout. One invariant governs it: a canonical artifact is only ever written when the
// operator asks for it in words. Inferring "record" from a missing file made the published baseline
// unverifiable — the file it keyed off is gitignored, so every fresh clone recorded instead of
// compared and exited 0 on any result at all.
export const resolveRunMode = ({ argv, hasBaselineOne, hasBaselineTwo, timestamp }) => {
  const confirmBaseline = argv.includes('--confirm-baseline');
  const patched = argv.includes('--patched');
  const record = argv.includes('--record');

  const recordBaseline = !patched && (record || confirmBaseline);
  const recordRemediation = patched && record;
  const recordResult = recordBaseline || recordRemediation;

  const trackedResultKey = recordRemediation
    ? 'remediationOne'
    : confirmBaseline
      ? 'baselineTwo'
      : 'baselineOne';
  const comparisonKey = patched ? 'remediationOne' : hasBaselineTwo ? 'baselineTwo' : 'baselineOne';

  const runId = patched
    ? recordRemediation
      ? 'remediation-001'
      : `remediation-reproduction-${timestamp}`
    : recordBaseline && !hasBaselineOne && !confirmBaseline
      ? 'baseline-001'
      : confirmBaseline
        ? 'baseline-002'
        : `reproduction-${timestamp}`;

  return {
    confirmBaseline,
    patched,
    record,
    recordBaseline,
    recordRemediation,
    recordResult,
    trackedResultKey,
    comparisonKey,
    runId,
    runKind: recordRemediation ? 'remediation' : recordBaseline ? 'baseline' : 'reproduction',
  };
};
