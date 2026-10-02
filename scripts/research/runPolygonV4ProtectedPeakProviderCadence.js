"use strict";

const {
  runProviderGatedProtectedPeakStability
} = require(
  "./runPolygonV4ProtectedPeakProviderGatedStability"
);

function validateMaxCycles(
  maxCycles
) {
  if (
    !Number.isSafeInteger(maxCycles) ||
    maxCycles <= 0
  ) {
    throw new Error(
      "maxCycles must be a positive safe integer"
    );
  }

  return maxCycles;
}

function validateWaitMs(
  waitMs
) {
  if (
    !Number.isSafeInteger(waitMs) ||
    waitMs < 0
  ) {
    throw new Error(
      "waitMs must be a non-negative safe integer"
    );
  }

  return waitMs;
}

async function runProtectedPeakProviderCadence({
  provider,
  count,
  minimumBlockGap,
  maxAttempts,
  maxCycles,
  waitMs,
  amounts,
  runProviderGatedStabilityFn =
    runProviderGatedProtectedPeakStability,
  waitFn
}) {
  validateMaxCycles(
    maxCycles
  );

  validateWaitMs(
    waitMs
  );

  if (
    typeof runProviderGatedStabilityFn !==
      "function"
  ) {
    throw new Error(
      "runProviderGatedStabilityFn must be a function"
    );
  }

  if (
    typeof waitFn !== "function"
  ) {
    throw new Error(
      "waitFn must be a function"
    );
  }

  const cycles = [];

  for (
    let cycle = 1;
    cycle <= maxCycles;
    cycle += 1
  ) {
    const result =
      await runProviderGatedStabilityFn({
        provider,
        count,
        minimumBlockGap,
        maxAttempts,
        ...(amounts === undefined
          ? {}
          : { amounts })
      });

    cycles.push({
      cycle,
      result
    });

    if (cycle < maxCycles) {
      await waitFn(
        waitMs
      );
    }
  }

  return {
    complete: true,
    maxCycles,
    completedCycles:
      cycles.length,
    waitMs,
    cycles
  };
}

module.exports = {
  validateMaxCycles,
  validateWaitMs,
  runProtectedPeakProviderCadence
};
