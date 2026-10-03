"use strict";

function requireObject(value, label) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      `${label} must be an object`
    );
  }

  return value;
}

function requirePositiveSafeInteger(
  value,
  label
) {
  if (
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `${label} must be a positive safe integer`
    );
  }

  return value;
}

function selectProtectedPeakHandoff(
  operational
) {
  requireObject(
    operational,
    "operational result"
  );

  if (operational.complete !== true) {
    throw new Error(
      "operational result must be complete"
    );
  }

  if (
    !Array.isArray(
      operational.cycles
    ) ||
    operational.cycles.length === 0
  ) {
    throw new Error(
      "operational result requires cycles"
    );
  }

  const latest =
    operational.cycles[
      operational.cycles.length - 1
    ];

  requireObject(
    latest,
    "latest operational cycle"
  );

  const result =
    requireObject(
      latest.result,
      "latest cycle result"
    );

  const acquisition =
    requireObject(
      result.acquisition,
      "latest acquisition"
    );

  if (acquisition.complete !== true) {
    throw new Error(
      "latest acquisition must be complete"
    );
  }

  const stability =
    requireObject(
      result.stability,
      "latest stability"
    );

  if (
    !Array.isArray(
      stability.snapshots
    ) ||
    stability.snapshots.length === 0
  ) {
    throw new Error(
      "stability requires snapshots"
    );
  }

  const summary =
    requireObject(
      stability.summary,
      "stability summary"
    );

  const snapshotCount =
    requirePositiveSafeInteger(
      summary.snapshotCount,
      "summary snapshotCount"
    );

  if (
    snapshotCount !==
    stability.snapshots.length
  ) {
    throw new Error(
      "stability snapshot count mismatch"
    );
  }

  if (
    summary.snapshotsWithPeak !==
    snapshotCount
  ) {
    throw new Error(
      "every stability snapshot must contain a protected peak"
    );
  }

  if (
    summary.interiorPeakCount !==
    snapshotCount
  ) {
    throw new Error(
      "every protected peak must be interior"
    );
  }

  if (
    summary.lowerBoundaryPeakCount !== 0 ||
    summary.upperBoundaryPeakCount !== 0
  ) {
    throw new Error(
      "boundary protected peaks are not handoff eligible"
    );
  }

  if (
    !Array.isArray(
      summary.distinctBestAmounts
    ) ||
    summary.distinctBestAmounts.length !==
      1
  ) {
    throw new Error(
      "protected peak amount must be stable across snapshots"
    );
  }

  const stableAmount =
    String(
      summary.distinctBestAmounts[0]
    );

  if (
    stableAmount.length === 0
  ) {
    throw new Error(
      "stable protected amount required"
    );
  }

  let previousBlockTag = null;

  for (
    const row of
    stability.snapshots
  ) {
    requireObject(
      row,
      "stability snapshot"
    );

    if (
      row.peakPosition !==
      "INTERIOR"
    ) {
      throw new Error(
        "stability snapshot peak must be interior"
      );
    }

    const snapshot =
      requireObject(
        row.snapshot,
        "stability snapshot metadata"
      );

    const blockTag =
      requirePositiveSafeInteger(
        snapshot.blockTag,
        "stability snapshot blockTag"
      );

    if (
      previousBlockTag !== null &&
      blockTag <= previousBlockTag
    ) {
      throw new Error(
        "stability snapshot blocks must be strictly increasing"
      );
    }

    previousBlockTag =
      blockTag;

    const bestProtected =
      requireObject(
        row.bestProtected,
        "stability bestProtected"
      );

    if (
      bestProtected.status !==
      "QUOTE_OK"
    ) {
      throw new Error(
        "protected handoff requires QUOTE_OK evidence"
      );
    }

    if (
      String(
        bestProtected.startAmount
      ) !== stableAmount
    ) {
      throw new Error(
        "bestProtected amount does not match stable protected amount"
      );
    }

    if (
      bestProtected.blockTag !==
        blockTag
    ) {
      throw new Error(
        "bestProtected blockTag does not match stability snapshot"
      );
    }
  }

  const selected =
    stability.snapshots[
      stability.snapshots.length - 1
    ];

  return {
    cycle:
      latest.cycle,
    stableAmount,
    snapshot:
      selected.snapshot,
    observation:
      selected.bestProtected
  };
}

module.exports = {
  selectProtectedPeakHandoff
};
