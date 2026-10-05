"use strict";

const {
  runProtectedPeakProviderTimedCadence
} = require(
  "../research/runPolygonV4ProtectedPeakProviderTimedCadence"
);

const {
  runPreparedExecutionLifecycleComposition
} = require(
  "./polygonV4PreparedExecutionLifecycleComposition"
);

function requireFunction(
  value,
  label
) {
  if (typeof value !== "function") {
    throw new Error(
      `${label} function required`
    );
  }

  return value;
}

async function runProtectedPreparedExecutionLifecycleComposition({
  provider,

  count,
  minimumBlockGap,
  maxAttempts,
  maxCycles,
  waitMs,
  amounts,

  startToken,
  entryToken,
  exitToken,

  slippageBps,
  maxSlippageBps,
  maxAgeBlocks,
  deadlineSeconds,

  minimumNetProfitWei,
  safetyReserveWei,

  forkProvider,
  executor,
  forkProvenance,

  executeExactPlanFn,
  executeExactQualifiedPlanFn,

  runTimedCadenceFn =
    runProtectedPeakProviderTimedCadence,

  runPreparedExecutionLifecycleCompositionFn =
    runPreparedExecutionLifecycleComposition
}) {
  const runTimedCadence =
    requireFunction(
      runTimedCadenceFn,
      "runTimedCadenceFn"
    );

  const runPreparedLifecycle =
    requireFunction(
      runPreparedExecutionLifecycleCompositionFn,
      "runPreparedExecutionLifecycleCompositionFn"
    );

  const operationalResult =
    await runTimedCadence({
      provider,
      count,
      minimumBlockGap,
      maxAttempts,
      maxCycles,
      waitMs,
      ...(amounts === undefined
        ? {}
        : { amounts })
    });

  if (
    !operationalResult ||
    typeof operationalResult !== "object"
  ) {
    throw new Error(
      "Operational result required"
    );
  }

  return runPreparedLifecycle({
    provider,
    operationalResult,

    startToken,
    entryToken,
    exitToken,

    slippageBps,
    maxSlippageBps,
    maxAgeBlocks,
    deadlineSeconds,

    minimumNetProfitWei,
    safetyReserveWei,

    forkProvider,
    executor,
    forkProvenance,

    executeExactPlanFn,
    executeExactQualifiedPlanFn
  });
}

module.exports = {
  runProtectedPreparedExecutionLifecycleComposition
};
