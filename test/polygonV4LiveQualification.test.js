"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const { ethers } =
  require("ethers");

const {
  START,
  SLIPPAGE_BPS,
  MAX_SLIPPAGE_BPS,
  POLICY_GAS_UNITS,
  SAFETY_RESERVE,
  MINIMUM_NET_PROFIT,
  DEADLINE_SECONDS
} = require(
  "../scripts/research/runPolygonV4LiveQualification"
);

test(
  "live qualification policy is fail-closed and nonzero",
  () => {
    assert(
      START.gt(0)
    );

    assert.equal(
      SLIPPAGE_BPS,
      50
    );

    assert.equal(
      MAX_SLIPPAGE_BPS,
      100
    );

    assert(
      POLICY_GAS_UNITS.gte(
        ethers.BigNumber.from(
          "650723"
        )
      )
    );

    assert(
      SAFETY_RESERVE.gt(0)
    );

    assert(
      MINIMUM_NET_PROFIT.gt(0)
    );

    assert(
      DEADLINE_SECONDS > 0
    );
  }
);
