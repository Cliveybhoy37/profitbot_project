"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  SIZES,
  ANCHORS,
  exactAmounts,
  anchorMatches,
  bestQuotedRow
} = require(
  "../scripts/research/runPolygonV4TargetedFineSweep"
);

test(
  "fine sweep spans 0.100 through 0.150 in exact 0.005 steps",
  () => {
    assert.equal(
      SIZES.length,
      11
    );

    assert.equal(
      SIZES[0],
      "0.100"
    );

    assert.equal(
      SIZES.at(-1),
      "0.150"
    );

    assert.deepEqual(
      exactAmounts().map(
        row => row.amount
      ),
      [
        "100000000000000000",
        "105000000000000000",
        "110000000000000000",
        "115000000000000000",
        "120000000000000000",
        "125000000000000000",
        "130000000000000000",
        "135000000000000000",
        "140000000000000000",
        "145000000000000000",
        "150000000000000000"
      ]
    );
  }
);

test(
  "fine sweep preserves both exact regression anchors",
  () => {
    for (
      const [
        amount,
        expected
      ] of Object.entries(
        ANCHORS
      )
    ) {
      const result = {
        status:
          "QUOTE_OK",
        amounts: {
          start:
            amount,
          afterEntry:
            expected.afterEntry,
          afterV4:
            expected.afterV4,
          final:
            expected.final
        },
        grossDelta:
          expected.grossDelta
      };

      assert.equal(
        anchorMatches(
          amount,
          result
        ),
        true
      );

      assert.equal(
        anchorMatches(
          amount,
          {
            ...result,
            grossDelta:
              (
                BigInt(
                  expected.grossDelta
                ) - 1n
              ).toString()
          }
        ),
        false
      );
    }
  }
);

test(
  "non-anchor sizes do not trigger anchor validation",
  () => {
    assert.equal(
      anchorMatches(
        "125000000000000000",
        {
          status:
            "QUOTE_OK"
        }
      ),
      null
    );
  }
);

test(
  "bestQuotedRow selects largest raw gross profit",
  () => {
    const rows = [
      {
        startDisplay:
          "0.100",
        status:
          "QUOTE_OK",
        grossDelta:
          "16257072989558983"
      },
      {
        startDisplay:
          "0.125",
        status:
          "QUOTE_OK",
        grossDelta:
          "17000000000000000"
      },
      {
        startDisplay:
          "0.150",
        status:
          "QUOTE_OK",
        grossDelta:
          "16153740666787627"
      },
      {
        startDisplay:
          "0.130",
        status:
          "RPC_FAILURE",
        grossDelta:
          null
      }
    ];

    assert.equal(
      bestQuotedRow(rows)
        .startDisplay,
      "0.125"
    );
  }
);
