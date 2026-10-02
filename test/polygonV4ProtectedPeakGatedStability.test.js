"use strict";

const test =
  require("node:test");
const assert =
  require("node:assert/strict");

const {
  runGatedProtectedPeakStability
} = require(
  "../scripts/research/runPolygonV4ProtectedPeakGatedStability"
);

function snapshot(blockTag) {
  return {
    blockTag
  };
}

test(
  "passes gated acquisition inputs through and analyzes a complete snapshot set",
  async () => {
    const acquisition = {
      complete: true,
      requestedCount: 2,
      acquiredCount: 2,
      minimumBlockGap: 3,
      maxAttempts: 4,
      snapshots: [
        snapshot(100),
        snapshot(103)
      ],
      advancements: [
        {
          advanced: true
        }
      ],
      stopReason: null
    };

    let collectArgs = null;
    let stabilityArgs = null;

    const acquireSnapshotFn =
      async () => snapshot(100);

    const observeBlockFn =
      async () => 103;

    const observeAdvancementFn =
      async () => ({
        advanced: true
      });

    const result =
      await runGatedProtectedPeakStability({
        count: 2,
        minimumBlockGap: 3,
        maxAttempts: 4,
        amounts: [
          1n,
          2n
        ],
        acquireSnapshotFn,
        observeBlockFn,
        observeAdvancementFn,
        collectGatedFn:
          async args => {
            collectArgs = args;
            return acquisition;
          },
        runStabilityFn:
          async args => {
            stabilityArgs = args;
            return {
              summary: "stable"
            };
          }
      });

    assert.equal(
      collectArgs.count,
      2
    );

    assert.equal(
      collectArgs.minimumBlockGap,
      3
    );

    assert.equal(
      collectArgs.maxAttempts,
      4
    );

    assert.equal(
      collectArgs.acquireSnapshotFn,
      acquireSnapshotFn
    );

    assert.equal(
      collectArgs.observeBlockFn,
      observeBlockFn
    );

    assert.equal(
      collectArgs.observeAdvancementFn,
      observeAdvancementFn
    );

    assert.deepEqual(
      stabilityArgs,
      {
        snapshots:
          acquisition.snapshots,
        amounts: [
          1n,
          2n
        ]
      }
    );

    assert.deepEqual(
      result,
      {
        acquisition,
        stability: {
          summary: "stable"
        }
      }
    );
  }
);

test(
  "does not analyze an incomplete gated acquisition",
  async () => {
    const acquisition = {
      complete: false,
      requestedCount: 3,
      acquiredCount: 1,
      minimumBlockGap: 5,
      maxAttempts: 2,
      snapshots: [
        snapshot(200)
      ],
      advancements: [
        {
          advanced: false
        }
      ],
      stopReason:
        "BLOCK_ADVANCEMENT_EXHAUSTED"
    };

    let stabilityCalls = 0;

    const result =
      await runGatedProtectedPeakStability({
        count: 3,
        minimumBlockGap: 5,
        maxAttempts: 2,
        acquireSnapshotFn:
          async () => snapshot(200),
        observeBlockFn:
          async () => 201,
        collectGatedFn:
          async () => acquisition,
        runStabilityFn:
          async () => {
            stabilityCalls += 1;
            return {};
          }
      });

    assert.equal(
      stabilityCalls,
      0
    );

    assert.deepEqual(
      result,
      {
        acquisition,
        stability: null
      }
    );
  }
);

test(
  "does not invent an amounts override when the caller omits it",
  async () => {
    const acquisition = {
      complete: true,
      snapshots: [
        snapshot(300)
      ]
    };

    let stabilityArgs = null;

    await runGatedProtectedPeakStability({
      count: 1,
      minimumBlockGap: 1,
      maxAttempts: 1,
      acquireSnapshotFn:
        async () => snapshot(300),
      observeBlockFn:
        async () => 301,
      collectGatedFn:
        async () => acquisition,
      runStabilityFn:
        async args => {
          stabilityArgs = args;
          return {};
        }
    });

    assert.deepEqual(
      stabilityArgs,
      {
        snapshots:
          acquisition.snapshots
      }
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        stabilityArgs,
        "amounts"
      ),
      false
    );
  }
);

test(
  "propagates gated acquisition failure without running stability",
  async () => {
    let stabilityCalls = 0;

    await assert.rejects(
      runGatedProtectedPeakStability({
        count: 2,
        minimumBlockGap: 2,
        maxAttempts: 2,
        acquireSnapshotFn:
          async () => snapshot(400),
        observeBlockFn:
          async () => 402,
        collectGatedFn:
          async () => {
            throw new Error(
              "gated acquisition failed"
            );
          },
        runStabilityFn:
          async () => {
            stabilityCalls += 1;
            return {};
          }
      }),
      /gated acquisition failed/
    );

    assert.equal(
      stabilityCalls,
      0
    );
  }
);

test(
  "propagates stability failure after complete acquisition",
  async () => {
    const acquisition = {
      complete: true,
      snapshots: [
        snapshot(500)
      ]
    };

    await assert.rejects(
      runGatedProtectedPeakStability({
        count: 1,
        minimumBlockGap: 1,
        maxAttempts: 1,
        acquireSnapshotFn:
          async () => snapshot(500),
        observeBlockFn:
          async () => 501,
        collectGatedFn:
          async () => acquisition,
        runStabilityFn:
          async () => {
            throw new Error(
              "stability failed"
            );
          }
      }),
      /stability failed/
    );
  }
);

test(
  "rejects invalid composition dependencies before acquisition",
  async () => {
    let collectCalls = 0;

    const collectGatedFn =
      async () => {
        collectCalls += 1;
        return {
          complete: true,
          snapshots: [
            snapshot(600)
          ]
        };
      };

    await assert.rejects(
      runGatedProtectedPeakStability({
        count: 1,
        minimumBlockGap: 1,
        maxAttempts: 1,
        acquireSnapshotFn:
          async () => snapshot(600),
        observeBlockFn:
          async () => 601,
        collectGatedFn: null,
        runStabilityFn:
          async () => ({})
      }),
      /collectGatedFn must be a function/
    );

    await assert.rejects(
      runGatedProtectedPeakStability({
        count: 1,
        minimumBlockGap: 1,
        maxAttempts: 1,
        acquireSnapshotFn:
          async () => snapshot(600),
        observeBlockFn:
          async () => 601,
        collectGatedFn,
        runStabilityFn: null
      }),
      /runStabilityFn must be a function/
    );

    assert.equal(
      collectCalls,
      0
    );
  }
);

test(
  "rejects malformed acquisition result without running stability",
  async () => {
    const malformed = [
      null,
      [],
      {},
      {
        complete: "yes",
        snapshots: []
      },
      {
        complete: true,
        snapshots: null
      }
    ];

    for (
      const acquisition
      of malformed
    ) {
      let stabilityCalls = 0;

      await assert.rejects(
        runGatedProtectedPeakStability({
          count: 1,
          minimumBlockGap: 1,
          maxAttempts: 1,
          acquireSnapshotFn:
            async () =>
              snapshot(700),
          observeBlockFn:
            async () => 701,
          collectGatedFn:
            async () =>
              acquisition,
          runStabilityFn:
            async () => {
              stabilityCalls += 1;
              return {};
            }
        }),
        /malformed acquisition result/
      );

      assert.equal(
        stabilityCalls,
        0
      );
    }
  }
);

test(
  "preserves the exact acquisition object in the composed result",
  async () => {
    const acquisition = {
      complete: true,
      requestedCount: 1,
      acquiredCount: 1,
      minimumBlockGap: 7,
      maxAttempts: 9,
      snapshots: [
        snapshot(800)
      ],
      advancements: [],
      stopReason: null,
      researchEvidence: {
        marker: "preserve-me"
      }
    };

    const result =
      await runGatedProtectedPeakStability({
        count: 1,
        minimumBlockGap: 7,
        maxAttempts: 9,
        acquireSnapshotFn:
          async () => snapshot(800),
        observeBlockFn:
          async () => 807,
        collectGatedFn:
          async () => acquisition,
        runStabilityFn:
          async () => ({
            ok: true
          })
      });

    assert.equal(
      result.acquisition,
      acquisition
    );

    assert.deepEqual(
      result.acquisition
        .researchEvidence,
      {
        marker: "preserve-me"
      }
    );
  }
);

test(
  "rejects a completed acquisition with no snapshots before stability",
  async () => {
    let stabilityCalls = 0;

    await assert.rejects(
      runGatedProtectedPeakStability({
        count: 1,
        minimumBlockGap: 1,
        maxAttempts: 1,
        acquireSnapshotFn:
          async () => snapshot(900),
        observeBlockFn:
          async () => 901,
        collectGatedFn:
          async () => ({
            complete: true,
            snapshots: []
          }),
        runStabilityFn:
          async () => {
            stabilityCalls += 1;
            return {};
          }
      }),
      /complete acquisition must contain at least one snapshot/
    );

    assert.equal(
      stabilityCalls,
      0
    );
  }
);
