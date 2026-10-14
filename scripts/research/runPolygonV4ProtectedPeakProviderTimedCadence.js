"use strict";

const {
  runProtectedPeakProviderCadence
} = require(
  "./runPolygonV4ProtectedPeakProviderCadence"
);

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(
      resolve,
      ms
    );
  });
}

async function runProtectedPeakProviderTimedCadence({
  provider,
  count,
  minimumBlockGap,
  maxAttempts,
  maxCycles,
  waitMs,
  amounts,
  runCadenceFn =
    runProtectedPeakProviderCadence,
  waitFn =
    sleep
}) {
  if (
    typeof runCadenceFn !==
      "function"
  ) {
    throw new Error(
      "runCadenceFn must be a function"
    );
  }

  if (
    typeof waitFn !==
      "function"
  ) {
    throw new Error(
      "waitFn must be a function"
    );
  }

  return runCadenceFn({
    provider,
    count,
    minimumBlockGap,
    maxAttempts,
    maxCycles,
    waitMs,
    ...(amounts === undefined
      ? {}
      : { amounts }),
    waitFn
  });
}

module.exports = {
  sleep,
  runProtectedPeakProviderTimedCadence
};
