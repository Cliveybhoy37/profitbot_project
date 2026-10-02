"use strict";

const fs =
  require("node:fs");

const path =
  require("node:path");

const {
  ethers
} = require("ethers");

const DEFAULT_OBSERVATION_LOG =
  path.join(
    "research",
    "runtime",
    "polygon-v4",
    "live-opportunities",
    "observations.jsonl"
  );

function parseObservationLines(
  text
) {
  return text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(
      (line, index) => {
        try {
          return JSON.parse(
            line
          );
        } catch (error) {
          throw new Error(
            `Invalid JSONL at line ${index + 1}: ${error.message}`
          );
        }
      }
    );
}

function bigIntValue(
  value
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  return BigInt(
    value.toString()
  );
}

function minBigInt(
  values
) {
  if (!values.length) {
    return null;
  }

  return values.reduce(
    (best, value) =>
      value < best
        ? value
        : best
  );
}

function maxBigInt(
  values
) {
  if (!values.length) {
    return null;
  }

  return values.reduce(
    (best, value) =>
      value > best
        ? value
        : best
  );
}

function averageBigInt(
  values
) {
  if (!values.length) {
    return null;
  }

  const total =
    values.reduce(
      (sum, value) =>
        sum + value,
      0n
    );

  return (
    total /
    BigInt(values.length)
  );
}

function bestDiagnostic(
  observation
) {
  const diagnostics =
    observation.diagnostics ||
    [];

  if (!diagnostics.length) {
    return null;
  }

  return diagnostics.reduce(
    (best, row) => {
      if (!best) {
        return row;
      }

      return (
        bigIntValue(
          row.grossDelta
        ) >
        bigIntValue(
          best.grossDelta
        )
      )
        ? row
        : best;
    },
    null
  );
}

function ratioPpm(
  ceilingWei,
  gasPriceWei
) {
  const ceiling =
    bigIntValue(
      ceilingWei
    );

  const gas =
    bigIntValue(
      gasPriceWei
    );

  if (
    ceiling === null ||
    gas === null ||
    gas <= 0n
  ) {
    return null;
  }

  return (
    ceiling *
    1000000n /
    gas
  );
}

function qualificationEnvelope(
  ceilingWei,
  gasPriceWei
) {
  const ceiling =
    bigIntValue(
      ceilingWei
    );

  const gas =
    bigIntValue(
      gasPriceWei
    );

  if (
    ceiling === null ||
    gas === null ||
    ceiling < 0n ||
    gas <= 0n
  ) {
    return null;
  }

  const coveragePpm =
    ratioPpm(
      ceiling,
      gas
    );

  const gasPriceDeficitWei =
    gas > ceiling
      ? gas - ceiling
      : 0n;

  const gasReductionRequiredPpm =
    gas > ceiling
      ? (
          gasPriceDeficitWei *
          1000000n
        ) / gas
      : 0n;

  return {
    gasPriceWei:
      gas,
    maxGasPriceWei:
      ceiling,
    coveragePpm,
    gasPriceDeficitWei,
    gasReductionRequiredPpm,
    qualifiesAtObservedGas:
      gas <= ceiling
  };
}

function validateObservation(
  observation,
  index
) {
  if (
    !observation ||
    typeof observation !==
      "object"
  ) {
    throw new Error(
      `Invalid observation at index ${index}`
    );
  }

  if (
    !Array.isArray(
      observation.diagnostics
    )
  ) {
    throw new Error(
      `Observation ${index} has no diagnostics array`
    );
  }

  if (
    !observation.policySnapshot ||
    observation.policySnapshot
      .gasPriceWei ===
      undefined ||
    observation.policySnapshot
      .gasPriceWei ===
      null
  ) {
    throw new Error(
      `Observation ${index} has no gas price`
    );
  }

  try {
    bigIntValue(
      observation
        .policySnapshot
        .gasPriceWei
    );
  } catch (error) {
    throw new Error(
      `Observation ${index} has invalid gas price`
    );
  }

  for (
    const row of
      observation.diagnostics
  ) {
    if (
      !row ||
      typeof row !==
        "object" ||
      !row.id
    ) {
      throw new Error(
        `Observation ${index} has invalid diagnostic`
      );
    }

    try {
      bigIntValue(
        row.grossDelta
      );

      bigIntValue(
        row.maxGasPriceWei
      );
    } catch (error) {
      throw new Error(
        `Observation ${index} has invalid diagnostic economics`
      );
    }
  }
}

function analyzeObservations(
  observations
) {
  if (
    !Array.isArray(
      observations
    ) ||
    !observations.length
  ) {
    throw new Error(
      "No observations supplied"
    );
  }

  const gasPrices = [];
  const grossDeltas = [];
  const ceilings = [];

  const candidateWins = {};
  const failureReasons = {};

  const candidateChanges = [];
  const qualificationChanges = [];
  const economicsTrendPeriods = [];

  let previousBestId = null;
  let previousState = null;
  let previousEconomicsRatio = null;
  let activeTrend = null;

  let closest = null;
  let bestHistorical = null;

  let liveReadyEvents = 0;

  for (
    let index = 0;
    index < observations.length;
    index += 1
  ) {
    const observation =
      observations[index];

    validateObservation(
      observation,
      index
    );

    const gasPrice =
      bigIntValue(
        observation
          .policySnapshot
          ?.gasPriceWei
      );

    if (gasPrice !== null) {
      gasPrices.push(
        gasPrice
      );
    }

    const best =
      bestDiagnostic(
        observation
      );

    if (best) {
      const gross =
        bigIntValue(
          best.grossDelta
        );

      const ceiling =
        bigIntValue(
          best.maxGasPriceWei
        );

      if (gross !== null) {
        grossDeltas.push(
          gross
        );
      }

      if (ceiling !== null) {
        ceilings.push(
          ceiling
        );
      }

      candidateWins[
        best.id
      ] =
        (
          candidateWins[
            best.id
          ] || 0
        ) + 1;

      if (
        previousBestId !== null &&
        previousBestId !==
          best.id
      ) {
        candidateChanges.push({
          index,
          capturedAt:
            observation
              .capturedAt,
          quoteBlock:
            observation
              .quoteBlock,
          from:
            previousBestId,
          to:
            best.id
        });
      }

      previousBestId =
        best.id;

      if (
        !bestHistorical ||
        gross >
          bigIntValue(
            bestHistorical
              .diagnostic
              .grossDelta
          )
      ) {
        bestHistorical = {
          index,
          capturedAt:
            observation
              .capturedAt,
          quoteBlock:
            observation
              .quoteBlock,
          gasPriceWei:
            observation
              .policySnapshot
              ?.gasPriceWei,
          diagnostic:
            best
        };
      }

      const ratio =
        ratioPpm(
          best.maxGasPriceWei,
          observation
            .policySnapshot
            ?.gasPriceWei
        );

      if (
        ratio !== null &&
        (
          !closest ||
          ratio >
            closest.ratioPpm
        )
      ) {
        closest = {
          index,
          capturedAt:
            observation
              .capturedAt,
          quoteBlock:
            observation
              .quoteBlock,
          candidateId:
            best.id,
          gasPriceWei:
            observation
              .policySnapshot
              ?.gasPriceWei,
          maxGasPriceWei:
            best.maxGasPriceWei,
          ratioPpm:
            ratio
        };
      }

      if (
        ratio !== null &&
        previousEconomicsRatio !==
          null
      ) {
        const direction =
          ratio >
          previousEconomicsRatio
            ? "IMPROVING"
            : ratio <
              previousEconomicsRatio
              ? "DETERIORATING"
              : "FLAT";

        if (
          !activeTrend ||
          activeTrend.direction !==
            direction
        ) {
          if (activeTrend) {
            economicsTrendPeriods.push(
              activeTrend
            );
          }

          activeTrend = {
            direction,
            startIndex:
              index - 1,
            endIndex:
              index,
            startCapturedAt:
              observations[
                index - 1
              ].capturedAt,
            endCapturedAt:
              observation
                .capturedAt,
            startQuoteBlock:
              observations[
                index - 1
              ].quoteBlock,
            endQuoteBlock:
              observation
                .quoteBlock,
            startRatioPpm:
              previousEconomicsRatio,
            endRatioPpm:
              ratio,
            transitions:
              1
          };
        } else {
          activeTrend.endIndex =
            index;

          activeTrend.endCapturedAt =
            observation
              .capturedAt;

          activeTrend.endQuoteBlock =
            observation
              .quoteBlock;

          activeTrend.endRatioPpm =
            ratio;

          activeTrend.transitions +=
            1;
        }
      }

      if (ratio !== null) {
        previousEconomicsRatio =
          ratio;
      }
    }

    const liveReadyIds =
      observation
        .liveReadyIds ||
      [];

    if (
      liveReadyIds.length > 0
    ) {
      liveReadyEvents += 1;
    }

    const diagnostics =
      observation
        .diagnostics ||
      [];

    for (
      const row of diagnostics
    ) {
      if (row.reason) {
        failureReasons[
          row.reason
        ] =
          (
            failureReasons[
              row.reason
            ] || 0
          ) + 1;
      }
    }

    const state =
      JSON.stringify(
        diagnostics.map(
          row => ({
            id: row.id,
            stage:
              row.stage,
            reason:
              row.reason,
            liveReady:
              Boolean(
                row.liveReady
              )
          })
        )
      );

    if (
      previousState !== null &&
      previousState !== state
    ) {
      qualificationChanges.push({
        index,
        capturedAt:
          observation
            .capturedAt,
        quoteBlock:
          observation
            .quoteBlock
      });
    }

    previousState =
      state;
  }

  if (activeTrend) {
    economicsTrendPeriods.push(
      activeTrend
    );
  }

  const first =
    observations[0];

  const last =
    observations[
      observations.length - 1
    ];

  const firstTime =
    Date.parse(
      first.capturedAt
    );

  const lastTime =
    Date.parse(
      last.capturedAt
    );

  const durationMs =
    Number.isFinite(firstTime) &&
    Number.isFinite(lastTime)
      ? Math.max(
          0,
          lastTime - firstTime
        )
      : null;

  return {
    observationCount:
      observations.length,
    firstCapturedAt:
      first.capturedAt,
    lastCapturedAt:
      last.capturedAt,
    firstQuoteBlock:
      first.quoteBlock,
    lastQuoteBlock:
      last.quoteBlock,
    durationMs,
    gasPriceWei: {
      min:
        minBigInt(
          gasPrices
        ),
      average:
        averageBigInt(
          gasPrices
        ),
      max:
        maxBigInt(
          gasPrices
        )
    },
    bestGrossDeltaWei: {
      min:
        minBigInt(
          grossDeltas
        ),
      average:
        averageBigInt(
          grossDeltas
        ),
      max:
        maxBigInt(
          grossDeltas
        )
    },
    bestGasCeilingWei: {
      min:
        minBigInt(
          ceilings
        ),
      average:
        averageBigInt(
          ceilings
        ),
      max:
        maxBigInt(
          ceilings
        )
    },
    candidateWins,
    candidateChanges,
    qualificationChanges,
    economicsTrendPeriods,
    liveReadyEvents,
    failureReasons,
    closestGasToCeiling:
      closest,
    closestQualificationEnvelope:
      closest
        ? qualificationEnvelope(
            closest.maxGasPriceWei,
            closest.gasPriceWei
          )
        : null,
    bestHistorical
  };
}

function formatGwei(
  value
) {
  if (value === null) {
    return "n/a";
  }

  return ethers.utils
    .formatUnits(
      value.toString(),
      "gwei"
    );
}

function formatWpol(
  value
) {
  if (value === null) {
    return "n/a";
  }

  return ethers.utils
    .formatEther(
      value.toString()
    );
}

function formatDuration(
  durationMs
) {
  if (durationMs === null) {
    return "n/a";
  }

  const totalSeconds =
    Math.floor(
      durationMs / 1000
    );

  const hours =
    Math.floor(
      totalSeconds / 3600
    );

  const minutes =
    Math.floor(
      (
        totalSeconds % 3600
      ) / 60
    );

  const seconds =
    totalSeconds % 60;

  return (
    `${hours}h ${minutes}m ${seconds}s`
  );
}

function formatPercentFromPpm(
  value
) {
  if (value === null) {
    return "n/a";
  }

  return (
    (
      Number(value) /
      10000
    ).toFixed(4) +
    "%"
  );
}

function printAnalysis(
  analysis
) {
  console.log(
    "POLYGON_V4_OBSERVATION_ANALYSIS"
  );

  console.log(
    `observations=${analysis.observationCount}`
  );

  console.log(
    `period=${analysis.firstCapturedAt} -> ${analysis.lastCapturedAt}`
  );

  console.log(
    `blocks=${analysis.firstQuoteBlock} -> ${analysis.lastQuoteBlock}`
  );

  console.log(
    `duration=${formatDuration(analysis.durationMs)}`
  );

  console.log("");

  console.log(
    "GAS_GWEI"
  );

  console.log(
    `min=${formatGwei(analysis.gasPriceWei.min)}`
  );

  console.log(
    `average=${formatGwei(analysis.gasPriceWei.average)}`
  );

  console.log(
    `max=${formatGwei(analysis.gasPriceWei.max)}`
  );

  console.log("");

  console.log(
    "BEST_GROSS_WPOL"
  );

  console.log(
    `min=${formatWpol(analysis.bestGrossDeltaWei.min)}`
  );

  console.log(
    `average=${formatWpol(analysis.bestGrossDeltaWei.average)}`
  );

  console.log(
    `max=${formatWpol(analysis.bestGrossDeltaWei.max)}`
  );

  console.log("");

  console.log(
    "BEST_GAS_CEILING_GWEI"
  );

  console.log(
    `min=${formatGwei(analysis.bestGasCeilingWei.min)}`
  );

  console.log(
    `average=${formatGwei(analysis.bestGasCeilingWei.average)}`
  );

  console.log(
    `max=${formatGwei(analysis.bestGasCeilingWei.max)}`
  );

  console.log("");

  console.log(
    "CANDIDATE_WINS"
  );

  for (
    const [
      id,
      count
    ] of Object.entries(
      analysis.candidateWins
    )
  ) {
    console.log(
      `${id}=${count}`
    );
  }

  console.log(
    `candidateChanges=${analysis.candidateChanges.length}`
  );

  console.log(
    `qualificationChanges=${analysis.qualificationChanges.length}`
  );

  console.log(
    `liveReadyEvents=${analysis.liveReadyEvents}`
  );

  console.log("");

  console.log(
    "ECONOMICS_TRENDS"
  );

  const trendCounts = {
    IMPROVING: 0,
    DETERIORATING: 0,
    FLAT: 0
  };

  for (
    const period of
      analysis.economicsTrendPeriods
  ) {
    trendCounts[
      period.direction
    ] += 1;
  }

  console.log(
    `periods=${analysis.economicsTrendPeriods.length}`
  );

  console.log(
    `improving=${trendCounts.IMPROVING}`
  );

  console.log(
    `deteriorating=${trendCounts.DETERIORATING}`
  );

  console.log(
    `flat=${trendCounts.FLAT}`
  );

  console.log("");

  console.log(
    "FAILURE_REASONS"
  );

  for (
    const [
      reason,
      count
    ] of Object.entries(
      analysis.failureReasons
    )
  ) {
    console.log(
      `${reason}=${count}`
    );
  }

  if (
    analysis
      .closestGasToCeiling
  ) {
    const closest =
      analysis
        .closestGasToCeiling;

    console.log("");

    console.log(
      "CLOSEST_GAS_TO_CEILING"
    );

    console.log(
      `capturedAt=${closest.capturedAt}`
    );

    console.log(
      `block=${closest.quoteBlock}`
    );

    console.log(
      `candidate=${closest.candidateId}`
    );

    console.log(
      `gas=${formatGwei(closest.gasPriceWei)} gwei`
    );

    console.log(
      `ceiling=${formatGwei(closest.maxGasPriceWei)} gwei`
    );

    console.log(
      `ceilingToGas=${formatPercentFromPpm(closest.ratioPpm)}`
    );

    const envelope =
      analysis
        .closestQualificationEnvelope;

    if (envelope) {
      console.log(
        `gasDeficit=${formatGwei(envelope.gasPriceDeficitWei)} gwei`
      );

      console.log(
        `gasReductionRequired=${formatPercentFromPpm(envelope.gasReductionRequiredPpm)}`
      );

      console.log(
        `qualifiesAtObservedGas=${envelope.qualifiesAtObservedGas}`
      );
    }
  }

  if (
    analysis.bestHistorical
  ) {
    const best =
      analysis.bestHistorical;

    console.log("");

    console.log(
      "BEST_HISTORICAL_OBSERVATION"
    );

    console.log(
      `capturedAt=${best.capturedAt}`
    );

    console.log(
      `block=${best.quoteBlock}`
    );

    console.log(
      `candidate=${best.diagnostic.id}`
    );

    console.log(
      `gross=${formatWpol(best.diagnostic.grossDelta)} WPOL`
    );

    console.log(
      `gas=${formatGwei(best.gasPriceWei)} gwei`
    );

    console.log(
      `ceiling=${formatGwei(best.diagnostic.maxGasPriceWei)} gwei`
    );

    console.log(
      `stage=${best.diagnostic.stage}`
    );

    console.log(
      `reason=${best.diagnostic.reason}`
    );
  }
}

function main() {
  const observationLog =
    process.argv[2] ||
    DEFAULT_OBSERVATION_LOG;

  if (
    !fs.existsSync(
      observationLog
    )
  ) {
    throw new Error(
      `Observation log not found: ${observationLog}`
    );
  }

  const observations =
    parseObservationLines(
      fs.readFileSync(
        observationLog,
        "utf8"
      )
    );

  const analysis =
    analyzeObservations(
      observations
    );

  printAnalysis(
    analysis
  );
}

if (
  require.main === module
) {
  try {
    main();
  } catch (error) {
    console.error(
      "ANALYSIS_FAILED"
    );

    console.error(
      error.message
    );

    process.exitCode = 1;
  }
}

module.exports = {
  DEFAULT_OBSERVATION_LOG,
  parseObservationLines,
  bestDiagnostic,
  ratioPpm,
  qualificationEnvelope,
  validateObservation,
  analyzeObservations,
  formatDuration
};
