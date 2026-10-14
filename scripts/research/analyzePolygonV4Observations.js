"use strict";

const fs =
  require("node:fs");

const path =
  require("node:path");

const {
  ethers
} = require("ethers");

const {
  POLICY_GAS_UNITS,
  SAFETY_RESERVE,
  MINIMUM_NET_PROFIT
} = require(
  "./runPolygonV4LiveQualification"
);

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

const QUALIFICATION_GAS_UNITS =
  BigInt(
    POLICY_GAS_UNITS.toString()
  );

function economicEnvelope(
  gasBudgetWei,
  gasPriceWei,
  gasUnits =
    QUALIFICATION_GAS_UNITS
) {
  const budget =
    bigIntValue(
      gasBudgetWei
    );

  const gas =
    bigIntValue(
      gasPriceWei
    );

  const units =
    bigIntValue(
      gasUnits
    );

  if (
    budget === null ||
    gas === null ||
    units === null ||
    budget < 0n ||
    gas <= 0n ||
    units <= 0n
  ) {
    return null;
  }

  const observedGasCostWei =
    gas * units;

  const additionalProtectedBudgetRequiredWei =
    observedGasCostWei >
      budget
      ? observedGasCostWei -
        budget
      : 0n;

  const coveragePpm =
    observedGasCostWei > 0n
      ? (
          budget *
          1000000n
        ) /
        observedGasCostWei
      : null;

  const budgetUpliftRequiredPpm =
    additionalProtectedBudgetRequiredWei >
      0n
      ? budget > 0n
        ? (
            additionalProtectedBudgetRequiredWei *
            1000000n
          ) /
          budget
        : null
      : 0n;

  return {
    gasBudgetWei:
      budget,
    gasPriceWei:
      gas,
    gasUnits:
      units,
    observedGasCostWei,
    additionalProtectedBudgetRequiredWei,
    coveragePpm,
    budgetUpliftRequiredPpm,
    qualifiesAtObservedGas:
      budget >=
      observedGasCostWei
  };
}

function economicWaterfall({
  amountInWei,
  finalAmountWei,
  protectedFinalOutputWei,
  premiumBps,
  gasBudgetWei,
  safetyReserveWei,
  minimumNetProfitWei,
  gasPriceWei,
  gasUnits =
    QUALIFICATION_GAS_UNITS
}) {
  const amountIn =
    bigIntValue(amountInWei);
  const finalAmount =
    bigIntValue(finalAmountWei);
  const protectedFinalOutput =
    bigIntValue(
      protectedFinalOutputWei
    );
  const premiumRate =
    bigIntValue(premiumBps);
  const persistedGasBudget =
    bigIntValue(gasBudgetWei);
  const safetyReserve =
    bigIntValue(safetyReserveWei);
  const minimumNetProfit =
    bigIntValue(minimumNetProfitWei);
  const gasPrice =
    bigIntValue(gasPriceWei);
  const units =
    bigIntValue(gasUnits);

  if (
    amountIn === null ||
    finalAmount === null ||
    protectedFinalOutput === null ||
    premiumRate === null ||
    persistedGasBudget === null ||
    safetyReserve === null ||
    minimumNetProfit === null ||
    gasPrice === null ||
    units === null ||
    amountIn < 0n ||
    finalAmount < amountIn ||
    protectedFinalOutput < 0n ||
    protectedFinalOutput > finalAmount ||
    premiumRate < 0n ||
    premiumRate >= 10000n ||
    persistedGasBudget < 0n ||
    safetyReserve < 0n ||
    minimumNetProfit < 0n ||
    gasPrice <= 0n ||
    units <= 0n
  ) {
    return null;
  }

  const grossDeltaWei =
    finalAmount - amountIn;

  const protectionHaircutWei =
    finalAmount -
    protectedFinalOutput;

  // Mirror the live V4 watcher/preflight exactly:
  // amountIn.mul(premiumBps).div(10000).
  const premiumWei =
    amountIn *
    premiumRate /
    10000n;

  const reconstructedGasBudgetWei =
    protectedFinalOutput -
    amountIn -
    premiumWei -
    safetyReserve -
    minimumNetProfit;

  const gasBudgetDifferenceWei =
    reconstructedGasBudgetWei -
    persistedGasBudget;

  const observedGasCostWei =
    gasPrice * units;

  const economicDeficitWei =
    observedGasCostWei >
      persistedGasBudget
      ? observedGasCostWei -
        persistedGasBudget
      : 0n;

  return {
    amountInWei: amountIn,
    finalAmountWei: finalAmount,
    grossDeltaWei,
    protectedFinalOutputWei:
      protectedFinalOutput,
    protectionHaircutWei,
    premiumBps: premiumRate,
    premiumWei,
    safetyReserveWei:
      safetyReserve,
    minimumNetProfitWei:
      minimumNetProfit,
    persistedGasBudgetWei:
      persistedGasBudget,
    reconstructedGasBudgetWei,
    gasBudgetDifferenceWei,
    gasBudgetMatches:
      gasBudgetDifferenceWei === 0n,
    gasPriceWei: gasPrice,
    gasUnits: units,
    observedGasCostWei,
    economicDeficitWei
  };
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

  let smallestProtectedBudgetShortfall =
    null;
  let bestProtectedBudgetCoverage =
    null;

  let economicWaterfallEligible = 0;
  let economicWaterfallExactMatches = 0;
  let economicWaterfallMismatches = 0;

  const economicWaterfallTotals = {
    grossDeltaWei: 0n,
    protectionHaircutWei: 0n,
    premiumWei: 0n,
    safetyReserveWei: 0n,
    minimumNetProfitWei: 0n,
    protectedGasBudgetWei: 0n,
    observedGasCostWei: 0n,
    economicDeficitWei: 0n
  };

  let bestProtectedBudgetWaterfall =
    null;

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

      const envelope =
        economicEnvelope(
          row.gasBudget,
          row.gasPriceWei ??
            observation
              .policySnapshot
              ?.gasPriceWei
        );

      if (envelope) {
        const economicRow = {
          index,
          capturedAt:
            observation
              .capturedAt,
          quoteBlock:
            observation
              .quoteBlock,
          candidateId:
            row.id,
          ...envelope
        };

        if (
          !smallestProtectedBudgetShortfall ||
          envelope
            .additionalProtectedBudgetRequiredWei <
            smallestProtectedBudgetShortfall
              .additionalProtectedBudgetRequiredWei
        ) {
          smallestProtectedBudgetShortfall =
            economicRow;
        }

        if (
          envelope.coveragePpm !==
            null &&
          (
            !bestProtectedBudgetCoverage ||
            envelope.coveragePpm >
              bestProtectedBudgetCoverage
                .coveragePpm
          )
        ) {
          bestProtectedBudgetCoverage =
            economicRow;

          // Do not retain a waterfall from an older
          // best-coverage row if this row lacks the
          // additional persisted economics required
          // for waterfall reconstruction.
          bestProtectedBudgetWaterfall =
            null;
        }

        const waterfall =
          economicWaterfall({
            amountInWei:
              row.amountIn,
            finalAmountWei:
              row.finalAmount,
            protectedFinalOutputWei:
              row.protectedFinalOutput,
            premiumBps:
              row.premiumBps ??
              observation
                .policySnapshot
                ?.premiumBps,
            gasBudgetWei:
              row.gasBudget,
            safetyReserveWei:
              SAFETY_RESERVE,
            minimumNetProfitWei:
              MINIMUM_NET_PROFIT,
            gasPriceWei:
              row.gasPriceWei ??
              observation
                .policySnapshot
                ?.gasPriceWei
          });

        if (waterfall) {
          economicWaterfallEligible +=
            1;

          if (
            waterfall
              .gasBudgetMatches
          ) {
            economicWaterfallExactMatches +=
              1;
          } else {
            economicWaterfallMismatches +=
              1;
          }

          economicWaterfallTotals
            .grossDeltaWei +=
              waterfall
                .grossDeltaWei;

          economicWaterfallTotals
            .protectionHaircutWei +=
              waterfall
                .protectionHaircutWei;

          economicWaterfallTotals
            .premiumWei +=
              waterfall
                .premiumWei;

          economicWaterfallTotals
            .safetyReserveWei +=
              waterfall
                .safetyReserveWei;

          economicWaterfallTotals
            .minimumNetProfitWei +=
              waterfall
                .minimumNetProfitWei;

          economicWaterfallTotals
            .protectedGasBudgetWei +=
              waterfall
                .persistedGasBudgetWei;

          economicWaterfallTotals
            .observedGasCostWei +=
              waterfall
                .observedGasCostWei;

          economicWaterfallTotals
            .economicDeficitWei +=
              waterfall
                .economicDeficitWei;

          if (
            bestProtectedBudgetCoverage ===
              economicRow
          ) {
            bestProtectedBudgetWaterfall = {
              ...economicRow,
              ...waterfall
            };
          }
        }
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
    smallestProtectedBudgetShortfall,
    bestProtectedBudgetCoverage,
    economicWaterfall: {
      eligible:
        economicWaterfallEligible,
      exactMatches:
        economicWaterfallExactMatches,
      mismatches:
        economicWaterfallMismatches,
      totals:
        economicWaterfallTotals
    },
    bestProtectedBudgetWaterfall,
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
    analysis
      .smallestProtectedBudgetShortfall
  ) {
    const row =
      analysis
        .smallestProtectedBudgetShortfall;

    console.log("");
    console.log(
      "SMALLEST_PROTECTED_BUDGET_SHORTFALL"
    );
    console.log(
      `capturedAt=${row.capturedAt}`
    );
    console.log(
      `block=${row.quoteBlock}`
    );
    console.log(
      `candidate=${row.candidateId}`
    );
    console.log(
      `protectedGasBudget=${formatWpol(row.gasBudgetWei)} WPOL`
    );
    console.log(
      `observedGasCost=${formatWpol(row.observedGasCostWei)} WPOL`
    );
    console.log(
      `additionalProtectedBudgetRequired=${formatWpol(row.additionalProtectedBudgetRequiredWei)} WPOL`
    );
    console.log(
      `budgetCoverage=${formatPercentFromPpm(row.coveragePpm)}`
    );
    console.log(
      `budgetUpliftRequired=${formatPercentFromPpm(row.budgetUpliftRequiredPpm)}`
    );
  }

  if (
    analysis
      .bestProtectedBudgetCoverage
  ) {
    const row =
      analysis
        .bestProtectedBudgetCoverage;

    console.log("");
    console.log(
      "BEST_PROTECTED_BUDGET_COVERAGE"
    );
    console.log(
      `capturedAt=${row.capturedAt}`
    );
    console.log(
      `block=${row.quoteBlock}`
    );
    console.log(
      `candidate=${row.candidateId}`
    );
    console.log(
      `protectedGasBudget=${formatWpol(row.gasBudgetWei)} WPOL`
    );
    console.log(
      `observedGasCost=${formatWpol(row.observedGasCostWei)} WPOL`
    );
    console.log(
      `additionalProtectedBudgetRequired=${formatWpol(row.additionalProtectedBudgetRequiredWei)} WPOL`
    );
    console.log(
      `budgetCoverage=${formatPercentFromPpm(row.coveragePpm)}`
    );
    console.log(
      `budgetUpliftRequired=${formatPercentFromPpm(row.budgetUpliftRequiredPpm)}`
    );
  }

  if (
    analysis.economicWaterfall
  ) {
    const waterfall =
      analysis.economicWaterfall;

    console.log("");
    console.log(
      "ECONOMIC_WATERFALL_INTEGRITY"
    );
    console.log(
      `eligible=${waterfall.eligible}`
    );
    console.log(
      `exactMatches=${waterfall.exactMatches}`
    );
    console.log(
      `mismatches=${waterfall.mismatches}`
    );

    const totals =
      waterfall.totals;

    console.log(
      `totalGrossDelta=${formatWpol(totals.grossDeltaWei)} WPOL`
    );
    console.log(
      `totalProtectionHaircut=${formatWpol(totals.protectionHaircutWei)} WPOL`
    );
    console.log(
      `totalPremium=${formatWpol(totals.premiumWei)} WPOL`
    );
    console.log(
      `totalSafetyReserve=${formatWpol(totals.safetyReserveWei)} WPOL`
    );
    console.log(
      `totalMinimumNetProfit=${formatWpol(totals.minimumNetProfitWei)} WPOL`
    );
    console.log(
      `totalProtectedGasBudget=${formatWpol(totals.protectedGasBudgetWei)} WPOL`
    );
    console.log(
      `totalObservedGasCost=${formatWpol(totals.observedGasCostWei)} WPOL`
    );
    console.log(
      `totalEconomicDeficit=${formatWpol(totals.economicDeficitWei)} WPOL`
    );
  }

  if (
    analysis.bestProtectedBudgetWaterfall
  ) {
    const row =
      analysis
        .bestProtectedBudgetWaterfall;

    console.log("");
    console.log(
      "BEST_PROTECTED_BUDGET_WATERFALL"
    );
    console.log(
      `capturedAt=${row.capturedAt}`
    );
    console.log(
      `block=${row.quoteBlock}`
    );
    console.log(
      `candidate=${row.candidateId}`
    );
    console.log(
      `grossDelta=${formatWpol(row.grossDeltaWei)} WPOL`
    );
    console.log(
      `protectionHaircut=${formatWpol(row.protectionHaircutWei)} WPOL`
    );
    console.log(
      `aavePremium=${formatWpol(row.premiumWei)} WPOL`
    );
    console.log(
      `safetyReserve=${formatWpol(row.safetyReserveWei)} WPOL`
    );
    console.log(
      `minimumNetProfit=${formatWpol(row.minimumNetProfitWei)} WPOL`
    );
    console.log(
      `protectedGasBudget=${formatWpol(row.persistedGasBudgetWei)} WPOL`
    );
    console.log(
      `reconstructedGasBudget=${formatWpol(row.reconstructedGasBudgetWei)} WPOL`
    );
    console.log(
      `gasBudgetDifferenceWei=${row.gasBudgetDifferenceWei}`
    );
    console.log(
      `gasBudgetMatches=${row.gasBudgetMatches}`
    );
    console.log(
      `observedGasCost=${formatWpol(row.observedGasCostWei)} WPOL`
    );
    console.log(
      `economicDeficit=${formatWpol(row.economicDeficitWei)} WPOL`
    );
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
  QUALIFICATION_GAS_UNITS,
  economicEnvelope,
  economicWaterfall,
  validateObservation,
  analyzeObservations,
  formatDuration
};
