"use strict";

const {
  validateSnapshotSequence
} = require(
  "./runPolygonV4ProtectedPeakAcquisition"
);

const {
  validateMinimumBlockGap,
  validateProtectedPeakBlockSeparation
} = require(
  "./runPolygonV4ProtectedPeakBlockSeparation"
);

const {
  validateMaxAttempts,
  observeProtectedPeakBlockAdvancement
} = require(
  "./runPolygonV4ProtectedPeakBlockAdvancement"
);

function validateCount(count) {
  if (
    !Number.isSafeInteger(count) ||
    count <= 0
  ) {
    throw new Error(
      "count must be a positive safe integer"
    );
  }

  return count;
}

async function collectGatedProtectedPeakSnapshots({
  count,
  minimumBlockGap,
  maxAttempts,
  acquireSnapshotFn,
  observeBlockFn,
  observeAdvancementFn =
    observeProtectedPeakBlockAdvancement
}) {
  validateCount(count);
  validateMinimumBlockGap(
    minimumBlockGap
  );
  validateMaxAttempts(
    maxAttempts
  );

  if (
    typeof acquireSnapshotFn !==
    "function"
  ) {
    throw new Error(
      "acquireSnapshotFn must be a function"
    );
  }

  if (
    typeof observeBlockFn !==
    "function"
  ) {
    throw new Error(
      "observeBlockFn must be a function"
    );
  }

  if (
    typeof observeAdvancementFn !==
    "function"
  ) {
    throw new Error(
      "observeAdvancementFn must be a function"
    );
  }

  const snapshots = [];
  const advancements = [];

  const firstSnapshot =
    await acquireSnapshotFn();

  validateSnapshotSequence([
    firstSnapshot
  ]);

  snapshots.push(
    firstSnapshot
  );

  while (
    snapshots.length < count
  ) {
    const previousSnapshot =
      snapshots[
        snapshots.length - 1
      ];

    const advancement =
      await observeAdvancementFn({
        previousBlockTag:
          previousSnapshot.blockTag,
        minimumBlockGap,
        maxAttempts,
        observeBlockFn
      });

    if (
      !advancement ||
      typeof advancement !==
        "object" ||
      typeof advancement.advanced !==
        "boolean"
    ) {
      throw new Error(
        "advancement result must contain boolean advanced"
      );
    }

    if (
      advancement.previousBlockTag !==
        previousSnapshot.blockTag ||
      advancement.minimumBlockGap !==
        minimumBlockGap ||
      advancement.maxAttempts !==
        maxAttempts
    ) {
      throw new Error(
        "advancement result policy provenance mismatch"
      );
    }

    if (
      advancement.advanced &&
      (
        !Number.isSafeInteger(
          advancement.observedBlockTag
        ) ||
        advancement.observedBlockTag <
          previousSnapshot.blockTag +
            minimumBlockGap
      )
    ) {
      throw new Error(
        "successful advancement result does not satisfy required block gap"
      );
    }

    advancements.push(
      advancement
    );

    if (!advancement.advanced) {
      return {
        complete: false,
        requestedCount: count,
        acquiredCount:
          snapshots.length,
        minimumBlockGap,
        maxAttempts,
        snapshots,
        advancements,
        stopReason:
          "BLOCK_ADVANCEMENT_EXHAUSTED"
      };
    }

    const nextSnapshot =
      await acquireSnapshotFn();

    const candidateSnapshots = [
      ...snapshots,
      nextSnapshot
    ];

    validateProtectedPeakBlockSeparation({
      snapshots:
        candidateSnapshots,
      minimumBlockGap
    });

    snapshots.push(
      nextSnapshot
    );
  }

  validateProtectedPeakBlockSeparation({
    snapshots,
    minimumBlockGap
  });

  return {
    complete: true,
    requestedCount: count,
    acquiredCount:
      snapshots.length,
    minimumBlockGap,
    maxAttempts,
    snapshots,
    advancements,
    stopReason: null
  };
}

module.exports = {
  validateCount,
  collectGatedProtectedPeakSnapshots
};
