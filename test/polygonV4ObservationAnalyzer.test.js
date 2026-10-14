"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
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
} = require(
  "../scripts/research/analyzePolygonV4Observations"
);

function observation({
  capturedAt,
  quoteBlock,
  gasPriceWei,
  firstGross,
  firstCeiling,
  secondGross,
  secondCeiling,
  firstGasBudget = null,
  secondGasBudget = null,
  liveReadyIds = []
}) {
  return {
    capturedAt,
    quoteBlock,
    policySnapshot: {
      currentBlock:
        quoteBlock,
      gasPriceWei:
        gasPriceWei.toString(),
      premiumBps:
        5
    },
    diagnostics: [
      {
        id:
          "FIRST",
        grossDelta:
          firstGross.toString(),
        maxGasPriceWei:
          firstCeiling.toString(),
        ...(firstGasBudget === null
          ? {}
          : {
              gasBudget:
                firstGasBudget.toString()
            }),
        liveReady:
          false,
        stage:
          "PREFLIGHT",
        reason:
          "Candidate has negative expected net profit"
      },
      {
        id:
          "SECOND",
        grossDelta:
          secondGross.toString(),
        maxGasPriceWei:
          secondCeiling.toString(),
        ...(secondGasBudget === null
          ? {}
          : {
              gasBudget:
                secondGasBudget.toString()
            }),
        liveReady:
          liveReadyIds.includes(
            "SECOND"
          ),
        stage:
          "PREFLIGHT",
        reason:
          liveReadyIds.includes(
            "SECOND"
          )
            ? null
            : "Candidate has negative expected net profit"
      }
    ],
    liveReadyIds,
    broadcast:
      false
  };
}

test(
  "JSONL parser ignores blank lines",
  () => {
    const rows =
      parseObservationLines(
        '{"quoteBlock":1}\n\n{"quoteBlock":2}\n'
      );

    assert.equal(
      rows.length,
      2
    );

    assert.equal(
      rows[1].quoteBlock,
      2
    );
  }
);

test(
  "JSONL parser identifies malformed line",
  () => {
    assert.throws(
      () =>
        parseObservationLines(
          '{"ok":true}\nnot-json\n'
        ),
      /line 2/
    );
  }
);

test(
  "best diagnostic selects highest gross delta",
  () => {
    const row =
      bestDiagnostic(
        observation({
          capturedAt:
            "2026-10-01T00:00:00.000Z",
          quoteBlock:
            1,
          gasPriceWei:
            100n,
          firstGross:
            10n,
          firstCeiling:
            5n,
          secondGross:
            20n,
          secondCeiling:
            6n
        })
      );

    assert.equal(
      row.id,
      "SECOND"
    );
  }
);

test(
  "gas-to-ceiling ratio is represented in ppm",
  () => {
    assert.equal(
      ratioPpm(
        "25",
        "100"
      ),
      250000n
    );
  }
);

test(
  "qualification envelope measures distance without changing policy",
  () => {
    const envelope =
      qualificationEnvelope(
        "13944000000",
        "279238000000"
      );

    assert.equal(
      envelope.maxGasPriceWei,
      13944000000n
    );

    assert.equal(
      envelope.gasPriceWei,
      279238000000n
    );

    assert.equal(
      envelope.gasPriceDeficitWei,
      265294000000n
    );

    assert.equal(
      envelope.coveragePpm,
      49935n
    );

    assert.equal(
      envelope.gasReductionRequiredPpm,
      950064n
    );

    assert.equal(
      envelope.qualifiesAtObservedGas,
      false
    );
  }
);

test(
  "qualification envelope reports no deficit inside protected ceiling",
  () => {
    const envelope =
      qualificationEnvelope(
        "100",
        "80"
      );

    assert.equal(
      envelope.gasPriceDeficitWei,
      0n
    );

    assert.equal(
      envelope.gasReductionRequiredPpm,
      0n
    );

    assert.equal(
      envelope.qualifiesAtObservedGas,
      true
    );
  }
);

test(
  "economic envelope measures protected budget shortfall without changing policy",
  () => {
    const envelope =
      economicEnvelope(
        "13211076541510153",
        "266300438750"
      );

    assert.equal(
      QUALIFICATION_GAS_UNITS,
      700000n
    );

    assert.equal(
      envelope.observedGasCostWei,
      186410307125000000n
    );

    assert.equal(
      envelope.additionalProtectedBudgetRequiredWei,
      173199230583489847n
    );

    assert.equal(
      envelope.coveragePpm,
      70870n
    );

    assert.equal(
      envelope.budgetUpliftRequiredPpm,
      13110152n
    );

    assert.equal(
      envelope.qualifiesAtObservedGas,
      false
    );
  }
);

test(
  "economic waterfall reconstructs protected gas budget exactly",
  () => {
    const waterfall =
      economicWaterfall({
        amountInWei:
          "125000000000000000",
        finalAmountWei:
          "144998569388452416",
        protectedFinalOutputWei:
          "144273576541510153",
        premiumBps:
          "5",
        gasBudgetWei:
          "13211076541510153",
        safetyReserveWei:
          "1000000000000000",
        minimumNetProfitWei:
          "5000000000000000",
        gasPriceWei:
          "266300438750"
      });

    assert.equal(
      waterfall.grossDeltaWei,
      19998569388452416n
    );

    assert.equal(
      waterfall.protectionHaircutWei,
      724992846942263n
    );

    assert.equal(
      waterfall.premiumWei,
      62500000000000n
    );

    assert.equal(
      waterfall.reconstructedGasBudgetWei,
      13211076541510153n
    );

    assert.equal(
      waterfall.gasBudgetDifferenceWei,
      0n
    );

    assert.equal(
      waterfall.gasBudgetMatches,
      true
    );

    assert.equal(
      waterfall.observedGasCostWei,
      186410307125000000n
    );

    assert.equal(
      waterfall.economicDeficitWei,
      173199230583489847n
    );
  }
);

test(
  "economic waterfall exposes a persisted budget mismatch",
  () => {
    const waterfall =
      economicWaterfall({
        amountInWei:
          "100000",
        finalAmountWei:
          "120000",
        protectedFinalOutputWei:
          "119000",
        premiumBps:
          "5",
        gasBudgetWei:
          "12849",
        safetyReserveWei:
          "1000",
        minimumNetProfitWei:
          "5000",
        gasPriceWei:
          "1",
        gasUnits:
          "100"
      });

    assert.equal(
      waterfall.premiumWei,
      50n
    );

    assert.equal(
      waterfall.reconstructedGasBudgetWei,
      12950n
    );

    assert.equal(
      waterfall.gasBudgetDifferenceWei,
      101n
    );

    assert.equal(
      waterfall.gasBudgetMatches,
      false
    );
  }
);

test(
  "economic envelope reports no shortfall when budget covers observed gas",
  () => {
    const envelope =
      economicEnvelope(
        "1000",
        "1",
        "500"
      );

    assert.equal(
      envelope.observedGasCostWei,
      500n
    );

    assert.equal(
      envelope.additionalProtectedBudgetRequiredWei,
      0n
    );

    assert.equal(
      envelope.coveragePpm,
      2000000n
    );

    assert.equal(
      envelope.budgetUpliftRequiredPpm,
      0n
    );

    assert.equal(
      envelope.qualifiesAtObservedGas,
      true
    );
  }
);

test(
  "analysis summarizes observations without changing readiness",
  () => {
    const rows = [
      observation({
        capturedAt:
          "2026-10-01T00:00:00.000Z",
        quoteBlock:
          100,
        gasPriceWei:
          100n,
        firstGross:
          30n,
        firstCeiling:
          10n,
        secondGross:
          20n,
        secondCeiling:
          8n,
        firstGasBudget:
          500n,
        secondGasBudget:
          400n
      }),
      observation({
        capturedAt:
          "2026-10-01T00:01:00.000Z",
        quoteBlock:
          101,
        gasPriceWei:
          80n,
        firstGross:
          25n,
        firstCeiling:
          10n,
        secondGross:
          40n,
        secondCeiling:
          20n,
        firstGasBudget:
          1000n,
        secondGasBudget:
          2000n,
        liveReadyIds: [
          "SECOND"
        ]
      })
    ];

    const result =
      analyzeObservations(
        rows
      );

    assert.equal(
      result.observationCount,
      2
    );

    assert.equal(
      result.durationMs,
      60000
    );

    assert.equal(
      result.gasPriceWei.min,
      80n
    );

    assert.equal(
      result.gasPriceWei.average,
      90n
    );

    assert.equal(
      result.gasPriceWei.max,
      100n
    );

    assert.equal(
      result.bestGrossDeltaWei.max,
      40n
    );

    assert.equal(
      result.bestGasCeilingWei.max,
      20n
    );

    assert.equal(
      result.candidateWins.FIRST,
      1
    );

    assert.equal(
      result.candidateWins.SECOND,
      1
    );

    assert.equal(
      result.candidateChanges.length,
      1
    );

    assert.equal(
      result.liveReadyEvents,
      1
    );

    assert.equal(
      result.closestGasToCeiling.candidateId,
      "SECOND"
    );

    assert.equal(
      result.closestGasToCeiling.ratioPpm,
      250000n
    );

    assert.equal(
      result.bestHistorical.diagnostic.id,
      "SECOND"
    );

    assert.equal(
      result
        .smallestProtectedBudgetShortfall
        .candidateId,
      "SECOND"
    );

    assert.equal(
      result
        .smallestProtectedBudgetShortfall
        .additionalProtectedBudgetRequiredWei,
      55998000n
    );

    assert.equal(
      result
        .bestProtectedBudgetCoverage
        .candidateId,
      "SECOND"
    );

    assert.equal(
      result
        .bestProtectedBudgetCoverage
        .coveragePpm,
      35n
    );
  }
);

test(
  "analysis aggregates exact economic waterfall reconstruction",
  () => {
    const rows = [
      {
        capturedAt:
          "2026-10-01T17:04:13.939Z",
        quoteBlock:
          94779407,
        policySnapshot: {
          currentBlock:
            94779407,
          gasPriceWei:
            "266300438750",
          premiumBps:
            5
        },
        diagnostics: [
          {
            id:
              "FIRST",
            amountIn:
              "125000000000000000",
            finalAmount:
              "144998569388452416",
            grossDelta:
              "19998569388452416",
            protectedFinalOutput:
              "144273576541510153",
            premiumBps:
              5,
            gasPriceWei:
              "266300438750",
            gasBudget:
              "13211076541510153",
            maxGasPriceWei:
              "18872966487",
            liveReady:
              false,
            stage:
              "PREFLIGHT",
            reason:
              "Candidate has negative expected net profit"
          },
          {
            id:
              "SECOND",
            amountIn:
              "75000000000000000",
            finalAmount:
              "91239253187209523",
            grossDelta:
              "16239253187209523",
            protectedFinalOutput:
              "90783056921273475",
            premiumBps:
              5,
            gasPriceWei:
              "266300438750",
            gasBudget:
              "9745556921273475",
            maxGasPriceWei:
              "13922224173",
            liveReady:
              false,
            stage:
              "PREFLIGHT",
            reason:
              "Candidate has negative expected net profit"
          }
        ],
        liveReadyIds: [],
        broadcast:
          false
      }
    ];

    const result =
      analyzeObservations(rows);

    assert.equal(
      result.economicWaterfall
        .eligible,
      2
    );

    assert.equal(
      result.economicWaterfall
        .exactMatches,
      2
    );

    assert.equal(
      result.economicWaterfall
        .mismatches,
      0
    );

    assert.equal(
      result.economicWaterfall
        .totals
        .grossDeltaWei,
      36237822575661939n
    );

    assert.equal(
      result.economicWaterfall
        .totals
        .protectionHaircutWei,
      1181189112878311n
    );

    assert.equal(
      result.economicWaterfall
        .totals
        .premiumWei,
      100000000000000n
    );

    assert.equal(
      result.economicWaterfall
        .totals
        .safetyReserveWei,
      2000000000000000n
    );

    assert.equal(
      result.economicWaterfall
        .totals
        .minimumNetProfitWei,
      10000000000000000n
    );

    assert.equal(
      result.economicWaterfall
        .totals
        .protectedGasBudgetWei,
      22956633462783628n
    );

    assert.equal(
      result.economicWaterfall
        .totals
        .observedGasCostWei,
      372820614250000000n
    );

    assert.equal(
      result.economicWaterfall
        .totals
        .economicDeficitWei,
      349863980787216372n
    );

    assert.equal(
      result
        .bestProtectedBudgetWaterfall
        .candidateId,
      "FIRST"
    );

    assert.equal(
      result
        .bestProtectedBudgetWaterfall
        .gasBudgetMatches,
      true
    );

    assert.equal(
      result
        .bestProtectedBudgetWaterfall
        .persistedGasBudgetWei,
      13211076541510153n
    );

    assert.equal(
      result
        .bestProtectedBudgetWaterfall
        .economicDeficitWei,
      173199230583489847n
    );
  }
);

test(
  "analysis does not retain stale waterfall when best coverage lacks waterfall fields",
  () => {
    const rows = [
      {
        capturedAt:
          "2026-10-01T00:00:00.000Z",
        quoteBlock:
          100,
        policySnapshot: {
          currentBlock:
            100,
          gasPriceWei:
            "100",
          premiumBps:
            5
        },
        diagnostics: [
          {
            id:
              "COMPLETE",
            amountIn:
              "100000",
            finalAmount:
              "120000",
            protectedFinalOutput:
              "119000",
            premiumBps:
              5,
            gasPriceWei:
              "100",
            gasBudget:
              "12950",
            maxGasPriceWei:
              "1",
            liveReady:
              false
          },
          {
            id:
              "ENVELOPE_ONLY",
            gasPriceWei:
              "100",
            gasBudget:
              "70000",
            maxGasPriceWei:
              "1",
            liveReady:
              false
          }
        ],
        liveReadyIds: [],
        broadcast:
          false
      }
    ];

    const result =
      analyzeObservations(rows);

    assert.equal(
      result.bestProtectedBudgetCoverage
        .candidateId,
      "ENVELOPE_ONLY"
    );

    assert.equal(
      result.bestProtectedBudgetWaterfall,
      null
    );

    assert.equal(
      result.economicWaterfall.eligible,
      1
    );
  }
);

test(
  "analysis records improving and deteriorating economics periods",
  () => {
    const rows = [
      observation({
        capturedAt:
          "2026-10-01T00:00:00.000Z",
        quoteBlock:
          200,
        gasPriceWei:
          100n,
        firstGross:
          30n,
        firstCeiling:
          10n,
        secondGross:
          20n,
        secondCeiling:
          8n
      }),
      observation({
        capturedAt:
          "2026-10-01T00:01:00.000Z",
        quoteBlock:
          201,
        gasPriceWei:
          100n,
        firstGross:
          30n,
        firstCeiling:
          20n,
        secondGross:
          20n,
        secondCeiling:
          8n
      }),
      observation({
        capturedAt:
          "2026-10-01T00:02:00.000Z",
        quoteBlock:
          202,
        gasPriceWei:
          100n,
        firstGross:
          30n,
        firstCeiling:
          15n,
        secondGross:
          20n,
        secondCeiling:
          8n
      })
    ];

    const result =
      analyzeObservations(
        rows
      );

    assert.equal(
      result
        .economicsTrendPeriods
        .length,
      2
    );

    assert.equal(
      result
        .economicsTrendPeriods[0]
        .direction,
      "IMPROVING"
    );

    assert.equal(
      result
        .economicsTrendPeriods[1]
        .direction,
      "DETERIORATING"
    );
  }
);

test(
  "validation rejects missing diagnostics",
  () => {
    assert.throws(
      () =>
        validateObservation(
          {
            policySnapshot: {
              gasPriceWei:
                "100"
            }
          },
          7
        ),
      /Observation 7 has no diagnostics array/
    );
  }
);

test(
  "validation rejects invalid diagnostic economics",
  () => {
    assert.throws(
      () =>
        validateObservation(
          {
            policySnapshot: {
              gasPriceWei:
                "100"
            },
            diagnostics: [
              {
                id:
                  "BROKEN",
                grossDelta:
                  "not-a-number",
                maxGasPriceWei:
                  "10"
              }
            ]
          },
          3
        ),
      /Observation 3 has invalid diagnostic economics/
    );
  }
);

test(
  "duration formatter is deterministic",
  () => {
    assert.equal(
      formatDuration(
        (
          2 * 3600 +
          3 * 60 +
          4
        ) * 1000
      ),
      "2h 3m 4s"
    );
  }
);
