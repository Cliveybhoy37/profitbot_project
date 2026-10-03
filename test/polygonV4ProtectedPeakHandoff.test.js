"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  selectProtectedPeakHandoff
} = require(
  "../scripts/utils/polygonV4ProtectedPeakHandoff"
);

function protectedRow(
  blockTag,
  startAmount = "106"
) {
  return {
    status: "QUOTE_OK",
    blockTag,
    startAmount,
    marker:
      `observation-${blockTag}`
  };
}

function stabilityRow(
  blockTag,
  startAmount = "106"
) {
  return {
    snapshot: {
      blockTag,
      gasPriceWei: "200",
      premiumBps: 5
    },
    quoteOkCount: 3,
    rowCount: 3,
    durationMs: 10,
    bestProtected:
      protectedRow(
        blockTag,
        startAmount
      ),
    peakPosition: "INTERIOR"
  };
}

function operational() {
  const snapshots = [
    stabilityRow(100),
    stabilityRow(103)
  ];

  return {
    complete: true,
    maxCycles: 1,
    completedCycles: 1,
    waitMs: 0,
    cycles: [
      {
        cycle: 1,
        result: {
          acquisition: {
            complete: true,
            snapshots: [
              {
                blockTag: 100
              },
              {
                blockTag: 103
              }
            ]
          },
          stability: {
            snapshots,
            summary: {
              snapshotCount: 2,
              snapshotsWithPeak: 2,
              distinctBestAmounts: [
                "106"
              ],
              interiorPeakCount: 2,
              lowerBoundaryPeakCount: 0,
              upperBoundaryPeakCount: 0
            }
          }
        }
      }
    ]
  };
}

test(
  "selects newest preserved observation from a stable interior protected peak",
  () => {
    const input =
      operational();

    const expected =
      input.cycles[0]
        .result.stability
        .snapshots[1]
        .bestProtected;

    const result =
      selectProtectedPeakHandoff(
        input
      );

    assert.equal(
      result.cycle,
      1
    );

    assert.equal(
      result.stableAmount,
      "106"
    );

    assert.equal(
      result.snapshot.blockTag,
      103
    );

    assert.strictEqual(
      result.observation,
      expected,
      "handoff must preserve the exact observed evidence object"
    );
  }
);

test(
  "rejects incomplete acquisition",
  () => {
    const input =
      operational();

    input.cycles[0]
      .result.acquisition
      .complete = false;

    assert.throws(
      () =>
        selectProtectedPeakHandoff(
          input
        ),
      /latest acquisition must be complete/
    );
  }
);

test(
  "rejects missing protected peak",
  () => {
    const input =
      operational();

    input.cycles[0]
      .result.stability
      .summary
      .snapshotsWithPeak = 1;

    assert.throws(
      () =>
        selectProtectedPeakHandoff(
          input
        ),
      /every stability snapshot must contain/
    );
  }
);

test(
  "rejects boundary peak",
  () => {
    const input =
      operational();

    input.cycles[0]
      .result.stability
      .snapshots[1]
      .peakPosition =
        "UPPER_BOUNDARY";

    assert.throws(
      () =>
        selectProtectedPeakHandoff(
          input
        ),
      /peak must be interior/
    );
  }
);

test(
  "rejects unstable protected amount",
  () => {
    const input =
      operational();

    input.cycles[0]
      .result.stability
      .summary
      .distinctBestAmounts = [
        "106",
        "107"
      ];

    assert.throws(
      () =>
        selectProtectedPeakHandoff(
          input
        ),
      /amount must be stable/
    );
  }
);

test(
  "rejects bestProtected amount inconsistent with stability summary",
  () => {
    const input =
      operational();

    input.cycles[0]
      .result.stability
      .snapshots[1]
      .bestProtected
      .startAmount = "107";

    assert.throws(
      () =>
        selectProtectedPeakHandoff(
          input
        ),
      /does not match stable protected amount/
    );
  }
);

test(
  "rejects non-QUOTE_OK selected evidence",
  () => {
    const input =
      operational();

    input.cycles[0]
      .result.stability
      .snapshots[1]
      .bestProtected
      .status = "RPC_FAILURE";

    assert.throws(
      () =>
        selectProtectedPeakHandoff(
          input
        ),
      /requires QUOTE_OK evidence/
    );
  }
);

test(
  "rejects observation block mismatch",
  () => {
    const input =
      operational();

    input.cycles[0]
      .result.stability
      .snapshots[1]
      .bestProtected
      .blockTag = 102;

    assert.throws(
      () =>
        selectProtectedPeakHandoff(
          input
        ),
      /blockTag does not match/
    );
  }
);

test(
  "rejects non-increasing stability blocks",
  () => {
    const input =
      operational();

    input.cycles[0]
      .result.stability
      .snapshots[1]
      .snapshot.blockTag = 100;

    input.cycles[0]
      .result.stability
      .snapshots[1]
      .bestProtected.blockTag = 100;

    assert.throws(
      () =>
        selectProtectedPeakHandoff(
          input
        ),
      /blocks must be strictly increasing/
    );
  }
);

test(
  "rejects malformed operational structures",
  () => {
    assert.throws(
      () =>
        selectProtectedPeakHandoff(
          null
        ),
      /operational result must be an object/
    );

    assert.throws(
      () =>
        selectProtectedPeakHandoff({
          complete: false
        }),
      /operational result must be complete/
    );

    assert.throws(
      () =>
        selectProtectedPeakHandoff({
          complete: true,
          cycles: []
        }),
      /requires cycles/
    );
  }
);

test(
  "rejects missing observation blockTag",
  () => {
    const input =
      operational();

    delete input.cycles[0]
      .result.stability
      .snapshots[1]
      .bestProtected
      .blockTag;

    assert.throws(
      () =>
        selectProtectedPeakHandoff(
          input
        ),
      /blockTag does not match/
    );
  }
);

test(
  "does not fall back to an earlier valid cycle when latest cycle is incomplete",
  () => {
    const input =
      operational();

    const earlier =
      input.cycles[0];

    input.cycles.push({
      cycle: 2,
      result: {
        acquisition: {
          complete: false,
          snapshots: []
        },
        stability: null
      }
    });

    assert.equal(
      earlier.result
        .acquisition.complete,
      true
    );

    assert.throws(
      () =>
        selectProtectedPeakHandoff(
          input
        ),
      /latest acquisition must be complete/
    );
  }
);

test(
  "selects newest evidence from newest qualifying cycle",
  () => {
    const input =
      operational();

    const secondSnapshots = [
      stabilityRow(
        106,
        "107"
      ),
      stabilityRow(
        109,
        "107"
      )
    ];

    input.cycles.push({
      cycle: 2,
      result: {
        acquisition: {
          complete: true,
          snapshots: [
            {
              blockTag: 106
            },
            {
              blockTag: 109
            }
          ]
        },
        stability: {
          snapshots:
            secondSnapshots,
          summary: {
            snapshotCount: 2,
            snapshotsWithPeak: 2,
            distinctBestAmounts: [
              "107"
            ],
            interiorPeakCount: 2,
            lowerBoundaryPeakCount: 0,
            upperBoundaryPeakCount: 0
          }
        }
      }
    });

    const result =
      selectProtectedPeakHandoff(
        input
      );

    assert.equal(
      result.cycle,
      2
    );

    assert.equal(
      result.stableAmount,
      "107"
    );

    assert.equal(
      result.snapshot.blockTag,
      109
    );

    assert.strictEqual(
      result.observation,
      secondSnapshots[1]
        .bestProtected
    );
  }
);
