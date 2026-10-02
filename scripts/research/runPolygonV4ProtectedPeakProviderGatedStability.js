"use strict";

const {
  acquireProtectedPeakSnapshot
} = require(
  "./runPolygonV4ProtectedPeakSnapshot"
);

const {
  createProtectedPeakProviderObserver
} = require(
  "./runPolygonV4ProtectedPeakProviderObserver"
);

const {
  runGatedProtectedPeakStability
} = require(
  "./runPolygonV4ProtectedPeakGatedStability"
);

async function runProviderGatedProtectedPeakStability({
  provider,
  count,
  minimumBlockGap,
  maxAttempts,
  amounts,
  acquireProviderSnapshotFn =
    acquireProtectedPeakSnapshot,
  createProviderObserverFn =
    createProtectedPeakProviderObserver,
  runGatedStabilityFn =
    runGatedProtectedPeakStability
}) {
  if (
    typeof acquireProviderSnapshotFn !==
      "function"
  ) {
    throw new Error(
      "acquireProviderSnapshotFn must be a function"
    );
  }

  if (
    typeof createProviderObserverFn !==
      "function"
  ) {
    throw new Error(
      "createProviderObserverFn must be a function"
    );
  }

  if (
    typeof runGatedStabilityFn !==
      "function"
  ) {
    throw new Error(
      "runGatedStabilityFn must be a function"
    );
  }

  const observeBlockFn =
    createProviderObserverFn({
      provider
    });

  if (
    typeof observeBlockFn !==
      "function"
  ) {
    throw new Error(
      "createProviderObserverFn must return a function"
    );
  }

  const acquireSnapshotFn =
    async () =>
      acquireProviderSnapshotFn({
        provider
      });

  return runGatedStabilityFn({
    provider,
    count,
    minimumBlockGap,
    maxAttempts,
    acquireSnapshotFn,
    observeBlockFn,
    ...(amounts === undefined
      ? {}
      : { amounts })
  });
}

module.exports = {
  runProviderGatedProtectedPeakStability
};
