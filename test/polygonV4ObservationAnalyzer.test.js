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
          8n
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
