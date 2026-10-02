"use strict";

const {
  validateSnapshotSequence
} = require(
  "./runPolygonV4ProtectedPeakAcquisition"
);

function validateMinimumBlockGap(
  minimumBlockGap
) {
  if (
    !Number.isSafeInteger(
      minimumBlockGap
    ) ||
    minimumBlockGap <= 0
  ) {
    throw new Error(
      "minimumBlockGap must be a positive safe integer"
    );
  }

  return minimumBlockGap;
}

function validateProtectedPeakBlockSeparation({
  snapshots,
  minimumBlockGap
}) {
  validateSnapshotSequence(
    snapshots
  );

  validateMinimumBlockGap(
    minimumBlockGap
  );

  for (
    let index = 1;
    index < snapshots.length;
    index += 1
  ) {
    const previousBlockTag =
      snapshots[index - 1].blockTag;

    const currentBlockTag =
      snapshots[index].blockTag;

    const blockGap =
      currentBlockTag -
      previousBlockTag;

    if (
      blockGap <
      minimumBlockGap
    ) {
      throw new Error(
        "snapshot block gap is below minimumBlockGap"
      );
    }
  }

  return snapshots;
}

module.exports = {
  validateMinimumBlockGap,
  validateProtectedPeakBlockSeparation
};
