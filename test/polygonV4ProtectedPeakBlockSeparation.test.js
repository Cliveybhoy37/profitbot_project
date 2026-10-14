"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  validateMinimumBlockGap,
  validateProtectedPeakBlockSeparation
} = require(
  "../scripts/research/runPolygonV4ProtectedPeakBlockSeparation"
);

function snapshot(
  blockTag
) {
  return {
    blockTag
  };
}

test(
  "accepts positive safe-integer minimum block gaps",
  () => {
    assert.equal(
      validateMinimumBlockGap(1),
      1
    );

    assert.equal(
      validateMinimumBlockGap(3),
      3
    );

    assert.equal(
      validateMinimumBlockGap(
        Number.MAX_SAFE_INTEGER
      ),
      Number.MAX_SAFE_INTEGER
    );
  }
);

test(
  "rejects invalid minimum block gaps",
  () => {
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
          validateMinimumBlockGap(
            value
          ),
        /positive safe integer/
      );
    }
  }
);

test(
  "accepts snapshots meeting the exact minimum block gap",
  () => {
    const snapshots = [
      snapshot(100),
      snapshot(103),
      snapshot(106)
    ];

    assert.strictEqual(
      validateProtectedPeakBlockSeparation({
        snapshots,
        minimumBlockGap: 3
      }),
      snapshots
    );
  }
);

test(
  "accepts gaps larger than the configured minimum",
  () => {
    const snapshots = [
      snapshot(100),
      snapshot(104),
      snapshot(110)
    ];

    assert.strictEqual(
      validateProtectedPeakBlockSeparation({
        snapshots,
        minimumBlockGap: 3
      }),
      snapshots
    );
  }
);

test(
  "fails closed when any adjacent gap is too small",
  () => {
    assert.throws(
      () =>
        validateProtectedPeakBlockSeparation({
          snapshots: [
            snapshot(100),
            snapshot(102),
            snapshot(106)
          ],
          minimumBlockGap: 3
        }),
      /below minimumBlockGap/
    );

    assert.throws(
      () =>
        validateProtectedPeakBlockSeparation({
          snapshots: [
            snapshot(100),
            snapshot(103),
            snapshot(105)
          ],
          minimumBlockGap: 3
        }),
      /below minimumBlockGap/
    );
  }
);

test(
  "preserves the underlying 1G snapshot sequence rules",
  () => {
    assert.throws(
      () =>
        validateProtectedPeakBlockSeparation({
          snapshots: [
            snapshot(100),
            snapshot(100)
          ],
          minimumBlockGap: 1
        }),
      /strictly increasing/
    );

    assert.throws(
      () =>
        validateProtectedPeakBlockSeparation({
          snapshots: [
            snapshot(101),
            snapshot(100)
          ],
          minimumBlockGap: 1
        }),
      /strictly increasing/
    );

    assert.throws(
      () =>
        validateProtectedPeakBlockSeparation({
          snapshots: [],
          minimumBlockGap: 1
        }),
      /non-empty array/
    );
  }
);

test(
  "a single valid snapshot satisfies any valid separation policy",
  () => {
    const snapshots = [
      snapshot(100)
    ];

    assert.strictEqual(
      validateProtectedPeakBlockSeparation({
        snapshots,
        minimumBlockGap: 500
      }),
      snapshots
    );
  }
);
