"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  validateCount,
  collectGatedProtectedPeakSnapshots
} = require(
  "../scripts/research/runPolygonV4ProtectedPeakGatedAcquisition"
);

function snapshot(blockTag) {
  return {
    blockTag
  };
}

test(
  "validates positive safe-integer snapshot counts",
  () => {
    assert.equal(
      validateCount(3),
      3
    );

    for (
      const value of [
        0,
        -1,
        1.5,
        NaN,
        Infinity,
        "3",
        null,
        undefined
      ]
    ) {
      assert.throws(
        () =>
          validateCount(value),
        /positive safe integer/
      );
    }
  }
);

test(
  "acquires the first snapshot without an advancement gate",
  async () => {
    let acquireCalls = 0;
    let advancementCalls = 0;

    const result =
      await collectGatedProtectedPeakSnapshots({
        count: 1,
        minimumBlockGap: 3,
        maxAttempts: 5,
        acquireSnapshotFn:
          async () => {
            acquireCalls += 1;
            return snapshot(100);
          },
        observeBlockFn:
          async () => 103,
        observeAdvancementFn:
          async () => {
            advancementCalls += 1;
            throw new Error(
              "must not run"
            );
          }
      });

    assert.equal(
      acquireCalls,
      1
    );

    assert.equal(
      advancementCalls,
      0
    );

    assert.deepEqual(
      result,
      {
        complete: true,
        requestedCount: 1,
        acquiredCount: 1,
        minimumBlockGap: 3,
        maxAttempts: 5,
        snapshots: [
          snapshot(100)
        ],
        advancements: [],
        stopReason: null
      }
    );
  }
);

test(
  "gates every later acquisition from the last successfully acquired snapshot",
  async () => {
    const acquired = [
      snapshot(100),
      snapshot(103),
      snapshot(107)
    ];

    let acquireIndex = 0;
    const advancementCalls = [];

    const result =
      await collectGatedProtectedPeakSnapshots({
        count: 3,
        minimumBlockGap: 3,
        maxAttempts: 4,
        acquireSnapshotFn:
          async () =>
            acquired[
              acquireIndex++
            ],
        observeBlockFn:
          async () => 999,
        observeAdvancementFn:
          async args => {
            advancementCalls.push(
              args
            );

            return {
              advanced: true,
              previousBlockTag:
                args.previousBlockTag,
              minimumBlockGap:
                args.minimumBlockGap,
              requiredBlockTag:
                args.previousBlockTag +
                args.minimumBlockGap,
              observedBlockTag:
                args.previousBlockTag +
                args.minimumBlockGap,
              attemptsUsed: 1,
              maxAttempts:
                args.maxAttempts,
              observations: [
                args.previousBlockTag +
                args.minimumBlockGap
              ]
            };
          }
      });

    assert.equal(
      acquireIndex,
      3
    );

    assert.equal(
      advancementCalls.length,
      2
    );

    assert.deepEqual(
      advancementCalls.map(
        call =>
          call.previousBlockTag
      ),
      [100, 103]
    );

    for (
      const call of
        advancementCalls
    ) {
      assert.equal(
        call.minimumBlockGap,
        3
      );

      assert.equal(
        call.maxAttempts,
        4
      );

      assert.equal(
        typeof call.observeBlockFn,
        "function"
      );
    }

    assert.equal(
      result.complete,
      true
    );

    assert.equal(
      result.acquiredCount,
      3
    );

    assert.equal(
      result.advancements.length,
      2
    );

    assert.equal(
      result.stopReason,
      null
    );
  }
);

test(
  "returns an incomplete structured result without acquiring after exhausted advancement",
  async () => {
    let acquireCalls = 0;

    const exhausted = {
      advanced: false,
      previousBlockTag: 200,
      minimumBlockGap: 5,
      requiredBlockTag: 205,
      observedBlockTag: 203,
      attemptsUsed: 3,
      maxAttempts: 3,
      observations: [
        201,
        202,
        203
      ]
    };

    const result =
      await collectGatedProtectedPeakSnapshots({
        count: 2,
        minimumBlockGap: 5,
        maxAttempts: 3,
        acquireSnapshotFn:
          async () => {
            acquireCalls += 1;
            return snapshot(200);
          },
        observeBlockFn:
          async () => 201,
        observeAdvancementFn:
          async () =>
            exhausted
      });

    assert.equal(
      acquireCalls,
      1
    );

    assert.deepEqual(
      result,
      {
        complete: false,
        requestedCount: 2,
        acquiredCount: 1,
        minimumBlockGap: 5,
        maxAttempts: 3,
        snapshots: [
          snapshot(200)
        ],
        advancements: [
          exhausted
        ],
        stopReason:
          "BLOCK_ADVANCEMENT_EXHAUSTED"
      }
    );
  }
);

test(
  "revalidates actual acquired snapshot separation after successful advancement",
  async () => {
    const acquired = [
      snapshot(300),
      snapshot(301)
    ];

    let acquireIndex = 0;

    await assert.rejects(
      collectGatedProtectedPeakSnapshots({
        count: 2,
        minimumBlockGap: 5,
        maxAttempts: 2,
        acquireSnapshotFn:
          async () =>
            acquired[
              acquireIndex++
            ],
        observeBlockFn:
          async () => 305,
        observeAdvancementFn:
          async args => ({
            advanced: true,
            previousBlockTag:
              args.previousBlockTag,
            minimumBlockGap:
              args.minimumBlockGap,
            requiredBlockTag: 305,
            observedBlockTag: 305,
            attemptsUsed: 1,
            maxAttempts:
              args.maxAttempts,
            observations: [305]
          })
      }),
      /below minimumBlockGap/
    );

    assert.equal(
      acquireIndex,
      2
    );
  }
);

test(
  "propagates acquisition failure after successful advancement",
  async () => {
    let acquireCalls = 0;

    await assert.rejects(
      collectGatedProtectedPeakSnapshots({
        count: 2,
        minimumBlockGap: 2,
        maxAttempts: 2,
        acquireSnapshotFn:
          async () => {
            acquireCalls += 1;

            if (
              acquireCalls === 1
            ) {
              return snapshot(400);
            }

            throw new Error(
              "snapshot acquisition failed"
            );
          },
        observeBlockFn:
          async () => 402,
        observeAdvancementFn:
          async args => ({
            advanced: true,
            previousBlockTag:
              args.previousBlockTag,
            minimumBlockGap:
              args.minimumBlockGap,
            requiredBlockTag: 402,
            observedBlockTag: 402,
            attemptsUsed: 1,
            maxAttempts:
              args.maxAttempts,
            observations: [402]
          })
      }),
      /snapshot acquisition failed/
    );

    assert.equal(
      acquireCalls,
      2
    );
  }
);

test(
  "rejects malformed advancement results instead of acquiring another snapshot",
  async () => {
    let acquireCalls = 0;

    await assert.rejects(
      collectGatedProtectedPeakSnapshots({
        count: 2,
        minimumBlockGap: 2,
        maxAttempts: 2,
        acquireSnapshotFn:
          async () => {
            acquireCalls += 1;
            return snapshot(500);
          },
        observeBlockFn:
          async () => 502,
        observeAdvancementFn:
          async () => ({
            advanced: "yes"
          })
      }),
      /boolean advanced/
    );

    assert.equal(
      acquireCalls,
      1
    );
  }
);

test(
  "rejects invalid dependencies before acquiring the first snapshot",
  async () => {
    let acquireCalls = 0;

    const acquireSnapshotFn =
      async () => {
        acquireCalls += 1;
        return snapshot(600);
      };

    const observeBlockFn =
      async () => 601;

    const valid = {
      count: 2,
      minimumBlockGap: 1,
      maxAttempts: 1,
      acquireSnapshotFn,
      observeBlockFn
    };

    const cases = [
      {
        ...valid,
        count: 0
      },
      {
        ...valid,
        minimumBlockGap: 0
      },
      {
        ...valid,
        maxAttempts: 0
      },
      {
        ...valid,
        acquireSnapshotFn: null
      },
      {
        ...valid,
        observeBlockFn: null
      },
      {
        ...valid,
        observeAdvancementFn: null
      }
    ];

    for (const args of cases) {
      await assert.rejects(
        collectGatedProtectedPeakSnapshots(
          args
        )
      );
    }

    assert.equal(
      acquireCalls,
      0
    );
  }
);

test(
  "rejects advancement evidence whose policy provenance does not match the gate",
  async () => {
    const mismatches = [
      {
        previousBlockTag: 699,
        minimumBlockGap: 3,
        maxAttempts: 2
      },
      {
        previousBlockTag: 700,
        minimumBlockGap: 4,
        maxAttempts: 2
      },
      {
        previousBlockTag: 700,
        minimumBlockGap: 3,
        maxAttempts: 9
      }
    ];

    for (const mismatch of mismatches) {
      let acquireCalls = 0;

      await assert.rejects(
        collectGatedProtectedPeakSnapshots({
          count: 2,
          minimumBlockGap: 3,
          maxAttempts: 2,
          acquireSnapshotFn:
            async () => {
              acquireCalls += 1;
              return snapshot(700);
            },
          observeBlockFn:
            async () => 703,
          observeAdvancementFn:
            async () => ({
              advanced: true,
              ...mismatch,
              requiredBlockTag: 703,
              observedBlockTag: 703,
              attemptsUsed: 1,
              observations: [703]
            })
        }),
        /policy provenance mismatch/
      );

      assert.equal(
        acquireCalls,
        1
      );
    }
  }
);

test(
  "rejects successful advancement evidence below the required block gap",
  async () => {
    let acquireCalls = 0;

    await assert.rejects(
      collectGatedProtectedPeakSnapshots({
        count: 2,
        minimumBlockGap: 4,
        maxAttempts: 2,
        acquireSnapshotFn:
          async () => {
            acquireCalls += 1;
            return snapshot(800);
          },
        observeBlockFn:
          async () => 804,
        observeAdvancementFn:
          async () => ({
            advanced: true,
            previousBlockTag: 800,
            minimumBlockGap: 4,
            requiredBlockTag: 804,
            observedBlockTag: 803,
            attemptsUsed: 1,
            maxAttempts: 2,
            observations: [803]
          })
      }),
      /does not satisfy required block gap/
    );

    assert.equal(
      acquireCalls,
      1
    );
  }
);
