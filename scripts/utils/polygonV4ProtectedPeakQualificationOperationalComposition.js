"use strict";

const {
  runProtectedPeakProviderTimedCadence
} = require(
  "../research/runPolygonV4ProtectedPeakProviderTimedCadence"
);

const {
  qualifyWithExecutionContext
} = require(
  "./polygonV4QualificationExecutionComposition"
);

function requireFunction(
  value,
  label
) {
  if (typeof value !== "function") {
    throw new Error(
      `${label} must be a function`
    );
  }

  return value;
}

async function runProtectedPeakQualificationOperationalComposition({
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

  gasEvidence,
  safetyReserveWei,
  minimumNetProfitWei,

  runTimedCadenceFn =
    runProtectedPeakProviderTimedCadence,

  qualifyWithExecutionContextFn =
    qualifyWithExecutionContext
}) {
  const runTimedCadence =
    requireFunction(
      runTimedCadenceFn,
      "runTimedCadenceFn"
    );

  const qualify =
    requireFunction(
      qualifyWithExecutionContextFn,
      "qualifyWithExecutionContextFn"
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
    typeof operationalResult !==
      "object"
  ) {
    throw new Error(
      "Operational result required"
    );
  }

  return qualify({
    provider,
    operationalResult,

    startToken,
    entryToken,
    exitToken,

    slippageBps,
    maxSlippageBps,
    maxAgeBlocks,
    deadlineSeconds,

    gasEvidence,
    safetyReserveWei,
    minimumNetProfitWei
  });
}

module.exports = {
  runProtectedPeakQualificationOperationalComposition
};
