"use strict";

const {
  fineProtectedAmounts,
  runProtectedFineSurface
} = require(
  "./runPolygonV4ProtectedFineSurface"
);

function classifyPeakPosition(
  rows,
  bestProtected
) {
  if (!bestProtected) {
    return "NONE";
  }

  if (
    !Array.isArray(rows) ||
    rows.length === 0
  ) {
    throw new Error(
      "rows required when bestProtected exists"
    );
  }

  const index =
    rows.indexOf(bestProtected);

  if (index === -1) {
    throw new Error(
      "bestProtected must reference a row in rows"
    );
  }

  if (index === 0) {
    return "LOWER_BOUNDARY";
  }

  if (index === rows.length - 1) {
    return "UPPER_BOUNDARY";
  }

  return "INTERIOR";
}

function summarizePeakStability(
  snapshots
) {
  if (!Array.isArray(snapshots)) {
    throw new Error(
      "snapshots must be an array"
    );
  }

  const validPositions =
    new Set([
      "NONE",
      "LOWER_BOUNDARY",
      "INTERIOR",
      "UPPER_BOUNDARY"
    ]);

  for (const row of snapshots) {
    if (
      !row ||
      typeof row !== "object" ||
      !validPositions.has(
        row.peakPosition
      )
    ) {
      throw new Error(
        "invalid peakPosition"
      );
    }

    if (
      row.peakPosition !== "NONE" &&
      (
        !row.bestProtected ||
        row.bestProtected
          .startAmount == null
      )
    ) {
      throw new Error(
        "bestProtected startAmount required for peak"
      );
    }
  }

  const withPeak =
    snapshots.filter(
      row =>
        row.peakPosition !== "NONE"
    );

  const distinctBestAmounts =
    [
      ...new Set(
        withPeak.map(
          row =>
            row.bestProtected
              .startAmount
        )
      )
    ];

  return {
    snapshotCount:
      snapshots.length,
    snapshotsWithPeak:
      withPeak.length,
    distinctBestAmounts,
    interiorPeakCount:
      withPeak.filter(
        row =>
          row.peakPosition ===
          "INTERIOR"
      ).length,
    lowerBoundaryPeakCount:
      withPeak.filter(
        row =>
          row.peakPosition ===
          "LOWER_BOUNDARY"
      ).length,
    upperBoundaryPeakCount:
      withPeak.filter(
        row =>
          row.peakPosition ===
          "UPPER_BOUNDARY"
      ).length
  };
}

async function runProtectedPeakStability({
  provider,
  snapshots,
  amounts = fineProtectedAmounts(),
  runSurfaceFn =
    runProtectedFineSurface
}) {
  if (!provider) {
    throw new Error(
      "provider required"
    );
  }

  if (
    !Array.isArray(snapshots) ||
    snapshots.length === 0
  ) {
    throw new Error(
      "snapshots must be a non-empty array"
    );
  }

  const results = [];

  for (const snapshot of snapshots) {
    if (
      !snapshot ||
      typeof snapshot !== "object"
    ) {
      throw new Error(
        "snapshot must be an object"
      );
    }

    const surface =
      await runSurfaceFn({
        provider,
        blockTag:
          snapshot.blockTag,
        gasPriceWei:
          snapshot.gasPriceWei,
        premiumBps:
          snapshot.premiumBps,
        amounts
      });

    if (
      !surface ||
      typeof surface !== "object" ||
      !surface.snapshot ||
      !Array.isArray(surface.rows)
    ) {
      throw new Error(
        "surface must include snapshot and rows"
      );
    }

    const rows =
      surface.rows;

    const bestProtected =
      surface.bestProtected || null;

    results.push({
      snapshot:
        surface.snapshot,
      quoteOkCount:
        rows.filter(
          row =>
            row.status === "QUOTE_OK"
        ).length,
      rowCount:
        rows.length,
      bestProtected,
      peakPosition:
        classifyPeakPosition(
          rows,
          bestProtected
        )
    });
  }

  return {
    snapshots:
      results,
    summary:
      summarizePeakStability(
        results
      )
  };
}

module.exports = {
  classifyPeakPosition,
  summarizePeakStability,
  runProtectedPeakStability
};
