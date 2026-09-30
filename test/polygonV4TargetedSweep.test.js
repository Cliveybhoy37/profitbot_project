"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  SIZES,
  ANCHOR,
  exactAmounts,
  anchorMatches
} = require(
  "../scripts/research/runPolygonV4TargetedSweep"
);

test(
  "targeted sweep uses deterministic WPOL sizes",
  () => {
    assert.deepEqual(
      SIZES,
      [
        "0.010",
        "0.025",
        "0.050",
        "0.075",
        "0.100",
        "0.150",
        "0.250"
      ]
    );

    assert.deepEqual(
      exactAmounts().map(
        x => x.amount
      ),
      [
        "10000000000000000",
        "25000000000000000",
        "50000000000000000",
        "75000000000000000",
        "100000000000000000",
        "150000000000000000",
        "250000000000000000"
      ]
    );
  }
);

test(
  "targeted sweep anchor requires exact pinned amounts",
  () => {
    const exact = {
      status: "QUOTE_OK",
      amounts: {
        start:
          ANCHOR.amount,
        afterEntry:
          ANCHOR.afterEntry,
        afterV4:
          ANCHOR.afterV4,
        final:
          ANCHOR.final
      },
      grossDelta:
        ANCHOR.grossDelta
    };

    assert.equal(
      anchorMatches(exact),
      true
    );

    assert.equal(
      anchorMatches({
        ...exact,
        amounts: {
          ...exact.amounts,
          final:
            "89407595682158195"
        }
      }),
      false
    );
  }
);
