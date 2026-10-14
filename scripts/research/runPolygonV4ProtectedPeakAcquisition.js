"use strict";

const {
  acquireProtectedPeakSnapshot
} = require(
  "./runPolygonV4ProtectedPeakSnapshot"
);

const {
  runProtectedPeakStability
} = require(
  "./runPolygonV4ProtectedPeakStability"
);

function validateSnapshotSequence(
  snapshots
) {
  if (
    !Array.isArray(snapshots) ||
    snapshots.length === 0
  ) {
    throw new Error(
      "snapshots must be a non-empty array"
    );
  }

  let previousBlockTag = null;

  for (const snapshot of snapshots) {
    if (
      !snapshot ||
      typeof snapshot !== "object"
    ) {
      throw new Error(
        "snapshot must be an object"
      );
    }

    if (
      !Number.isSafeInteger(
        snapshot.blockTag
      ) ||
      snapshot.blockTag <= 0
    ) {
      throw new Error(
        "snapshot blockTag must be a positive safe integer"
      );
    }

    if (
      previousBlockTag !== null &&
      snapshot.blockTag <=
        previousBlockTag
    ) {
      throw new Error(
        "snapshot blockTags must be strictly increasing"
      );
    }

    previousBlockTag =
      snapshot.blockTag;
  }

  return snapshots;
}

async function collectProtectedPeakSnapshots({
  provider,
  count,
  acquireSnapshotFn =
    acquireProtectedPeakSnapshot
}) {
  if (!provider) {
    throw new Error(
      "provider required"
    );
  }

  if (
    !Number.isSafeInteger(count) ||
    count <= 0
  ) {
    throw new Error(
      "count must be a positive safe integer"
    );
  }

  if (
    typeof acquireSnapshotFn !==
      "function"
  ) {
    throw new Error(
      "acquireSnapshotFn must be a function"
    );
  }

  const snapshots = [];

  for (
    let index = 0;
    index < count;
    index += 1
  ) {
    const snapshot =
      await acquireSnapshotFn({
        provider
      });

    validateSnapshotSequence([
      ...snapshots,
      snapshot
    ]);

    snapshots.push(snapshot);
  }

  return snapshots;
}

async function runAcquiredProtectedPeakStability({
  provider,
  count,
  amounts,
  acquireSnapshotFn =
    acquireProtectedPeakSnapshot,
  runStabilityFn =
    runProtectedPeakStability
}) {
  if (
    typeof runStabilityFn !==
      "function"
  ) {
    throw new Error(
      "runStabilityFn must be a function"
    );
  }

  const snapshots =
    await collectProtectedPeakSnapshots({
      provider,
      count,
      acquireSnapshotFn
    });

  const stability =
    await runStabilityFn({
      provider,
      snapshots,
      ...(amounts === undefined
        ? {}
        : { amounts })
    });

  return {
    acquiredSnapshots:
      snapshots,
    stability
  };
}

module.exports = {
  validateSnapshotSequence,
  collectProtectedPeakSnapshots,
  runAcquiredProtectedPeakStability
};
