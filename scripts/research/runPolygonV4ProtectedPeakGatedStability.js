"use strict";

const {
  collectGatedProtectedPeakSnapshots
} = require(
  "./runPolygonV4ProtectedPeakGatedAcquisition"
);

const {
  runProtectedPeakStability
} = require(
  "./runPolygonV4ProtectedPeakStability"
);

async function runGatedProtectedPeakStability({
  count,
  minimumBlockGap,
  maxAttempts,
  amounts,
  acquireSnapshotFn,
  observeBlockFn,
  observeAdvancementFn,
  collectGatedFn =
    collectGatedProtectedPeakSnapshots,
  runStabilityFn =
    runProtectedPeakStability
}) {
  if (
    typeof collectGatedFn !==
      "function"
  ) {
    throw new Error(
      "collectGatedFn must be a function"
    );
  }

  if (
    typeof runStabilityFn !==
      "function"
  ) {
    throw new Error(
      "runStabilityFn must be a function"
    );
  }

  const acquisition =
    await collectGatedFn({
      count,
      minimumBlockGap,
      maxAttempts,
      acquireSnapshotFn,
      observeBlockFn,
      ...(observeAdvancementFn ===
        undefined
        ? {}
        : { observeAdvancementFn })
    });

  if (
    !acquisition ||
    typeof acquisition !== "object" ||
    typeof acquisition.complete !==
      "boolean" ||
    !Array.isArray(
      acquisition.snapshots
    )
  ) {
    throw new Error(
      "collectGatedFn returned malformed acquisition result"
    );
  }

  if (!acquisition.complete) {
    return {
      acquisition,
      stability: null
    };
  }

  if (
    acquisition.snapshots.length === 0
  ) {
    throw new Error(
      "complete acquisition must contain at least one snapshot"
    );
  }

  const stability =
    await runStabilityFn({
      snapshots:
        acquisition.snapshots,
      ...(amounts === undefined
        ? {}
        : { amounts })
    });

  return {
    acquisition,
    stability
  };
}

module.exports = {
  runGatedProtectedPeakStability
};
