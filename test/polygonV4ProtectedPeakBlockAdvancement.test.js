"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  validateBlockTag,
  validateMaxAttempts,
  observeProtectedPeakBlockAdvancement
} = require(
  "../scripts/research/runPolygonV4ProtectedPeakBlockAdvancement"
);

test(
  "validates positive safe-integer block tags and attempt budgets",
  () => {
    assert.equal(
      validateBlockTag(
        100,
        "blockTag"
      ),
      100
    );

    assert.equal(
      validateMaxAttempts(3),
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
          validateBlockTag(
            value,
            "blockTag"
          ),
        /positive safe integer/
      );

      assert.throws(
        () =>
          validateMaxAttempts(
            value
          ),
        /positive safe integer/
      );
    }
  }
);

test(
  "succeeds immediately when the first observation meets the exact gap",
  async () => {
    let calls = 0;

    const result =
      await observeProtectedPeakBlockAdvancement({
        previousBlockTag: 100,
        minimumBlockGap: 3,
        maxAttempts: 5,
        observeBlockFn:
          async () => {
            calls += 1;
            return 103;
          }
      });

    assert.equal(calls, 1);

    assert.deepEqual(
      result,
      {
        advanced: true,
        previousBlockTag: 100,
        minimumBlockGap: 3,
        requiredBlockTag: 103,
        observedBlockTag: 103,
        attemptsUsed: 1,
        maxAttempts: 5,
        observations: [103]
      }
    );
  }
);

test(
  "keeps observing duplicate, backward, and intermediate valid blocks until the gap is met",
  async () => {
    const blocks = [
      100,
      99,
      101,
      102,
      104
    ];

    let index = 0;

    const result =
      await observeProtectedPeakBlockAdvancement({
        previousBlockTag: 100,
        minimumBlockGap: 4,
        maxAttempts: 5,
        observeBlockFn:
          async () =>
            blocks[index++]
      });

    assert.deepEqual(
      result,
      {
        advanced: true,
        previousBlockTag: 100,
        minimumBlockGap: 4,
        requiredBlockTag: 104,
        observedBlockTag: 104,
        attemptsUsed: 5,
        maxAttempts: 5,
        observations: blocks
      }
    );
  }
);

test(
  "returns a structured exhausted result when the attempt budget is consumed",
  async () => {
    const blocks = [
      200,
      201,
      202
    ];

    let index = 0;

    const result =
      await observeProtectedPeakBlockAdvancement({
        previousBlockTag: 200,
        minimumBlockGap: 5,
        maxAttempts: 3,
        observeBlockFn:
          async () =>
            blocks[index++]
      });

    assert.deepEqual(
      result,
      {
        advanced: false,
        previousBlockTag: 200,
        minimumBlockGap: 5,
        requiredBlockTag: 205,
        observedBlockTag: 202,
        attemptsUsed: 3,
        maxAttempts: 3,
        observations: blocks
      }
    );
  }
);

test(
  "fails immediately on malformed observed block evidence",
  async () => {
    let calls = 0;

    await assert.rejects(
      observeProtectedPeakBlockAdvancement({
        previousBlockTag: 100,
        minimumBlockGap: 2,
        maxAttempts: 4,
        observeBlockFn:
          async () => {
            calls += 1;

            if (calls === 1) {
              return 101;
            }

            return null;
          }
      }),
      /observedBlockTag must be a positive safe integer/
    );

    assert.equal(
      calls,
      2
    );
  }
);

test(
  "rejects invalid dependencies before observing any blocks",
  async () => {
    let calls = 0;

    const observeBlockFn =
      async () => {
        calls += 1;
        return 101;
      };

    const cases = [
      {
        previousBlockTag: 0,
        minimumBlockGap: 1,
        maxAttempts: 1,
        observeBlockFn
      },
      {
        previousBlockTag: 100,
        minimumBlockGap: 0,
        maxAttempts: 1,
        observeBlockFn
      },
      {
        previousBlockTag: 100,
        minimumBlockGap: 1,
        maxAttempts: 0,
        observeBlockFn
      },
      {
        previousBlockTag: 100,
        minimumBlockGap: 1,
        maxAttempts: 1,
        observeBlockFn: null
      }
    ];

    for (const args of cases) {
      await assert.rejects(
        observeProtectedPeakBlockAdvancement(
          args
        )
      );
    }

    assert.equal(
      calls,
      0
    );
  }
);

test(
  "fails closed when the required block would exceed the safe-integer range",
  async () => {
    let calls = 0;

    await assert.rejects(
      observeProtectedPeakBlockAdvancement({
        previousBlockTag:
          Number.MAX_SAFE_INTEGER,
        minimumBlockGap: 1,
        maxAttempts: 1,
        observeBlockFn:
          async () => {
            calls += 1;
            return 1;
          }
      }),
      /required blockTag exceeds safe integer range/
    );

    assert.equal(
      calls,
      0
    );
  }
);
