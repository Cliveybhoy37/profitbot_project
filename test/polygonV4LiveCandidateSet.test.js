"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  CANDIDATES
} = require(
  "../scripts/research/runPolygonV4LiveCandidateSet"
);

test(
  "live candidate set contains only the meaningful historical cluster",
  () => {
    assert.equal(
      CANDIDATES.length,
      4
    );

    assert.deepEqual(
      CANDIDATES.map(
        item => item.id
      ),
      [
        "V3_075",
        "SUSHI_V2_075",
        "QUICK_V2_075",
        "V3_125_OPTIMIZED"
      ]
    );

    for (
      const candidate of
      CANDIDATES
    ) {
      assert(
        candidate.amount.gt(0)
      );

      assert(
        [
          "UNISWAP_V3",
          "SUSHISWAP_V2",
          "QUICKSWAP_V2"
        ].includes(
          candidate.entryVenue
        )
      );
    }
  }
);

test(
  "candidate definitions remain distinct while sharing policy externally",
  () => {
    assert.equal(
      CANDIDATES[0].amount.toString(),
      "75000000000000000"
    );

    assert.equal(
      CANDIDATES[1].amount.toString(),
      "75000000000000000"
    );

    assert.equal(
      CANDIDATES[2].amount.toString(),
      "75000000000000000"
    );

    assert.equal(
      CANDIDATES[3].amount.toString(),
      "125000000000000000"
    );

    assert.equal(
      CANDIDATES[0].entryVenue,
      "UNISWAP_V3"
    );

    assert.equal(
      CANDIDATES[1].entryVenue,
      "SUSHISWAP_V2"
    );

    assert.equal(
      CANDIDATES[2].entryVenue,
      "QUICKSWAP_V2"
    );
  }
);
