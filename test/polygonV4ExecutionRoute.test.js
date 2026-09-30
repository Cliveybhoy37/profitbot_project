const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  VENUE_IDS,
  LEG_TYPE,
  EXECUTION_PLAN_TYPE,
  V4_DATA_TYPE,
  buildV4ExecutionLegs,
  encodeV4ExecutionLegs,
  encodeV4ExecutionPlan
} = require("../scripts/utils/polygonV4ExecutionRoute");

const WPOL =
  "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

const DAI =
  "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";

const APEPE =
  "0xA3f751662e282E83EC3cBc387d225Ca56dD63D3A";

const ZERO =
  ethers.constants.AddressZero;

const POOL_KEY = {
  currency0: DAI,
  currency1: APEPE,
  fee: 10000,
  tickSpacing: 100,
  hooks: ZERO
};

function candidate() {
  return [
    {
      venue: "UNISWAP_V3",
      tokenIn: WPOL,
      tokenOut: DAI,
      amountOut:
        ethers.BigNumber.from("14481764747850506"),
      fee: 100
    },
    {
      venue: "UNISWAP_V4",
      tokenIn: DAI,
      tokenOut: APEPE,
      amountOut:
        ethers.BigNumber.from(
          "12592522662788687883109"
        ),
      poolKey: POOL_KEY,
      zeroForOne: true
    },
    {
      venue: "UNISWAP_V3",
      tokenIn: APEPE,
      tokenOut: WPOL,
      amountOut:
        ethers.BigNumber.from("141808483715718886"),
      fee: 100
    }
  ];
}

test(
  "builds protected V3 -> V4 -> V3 candidate",
  () => {
    const legs =
      buildV4ExecutionLegs(candidate(), 50);

    assert.equal(
      legs[0].venue,
      VENUE_IDS.UNISWAP_V3
    );

    assert.equal(
      legs[1].venue,
      VENUE_IDS.UNISWAP_V4
    );

    assert.equal(
      legs[2].venue,
      VENUE_IDS.UNISWAP_V3
    );

    assert.equal(
      legs[0].minAmountOut.toString(),
      "14409355924111253"
    );

    assert.equal(
      legs[1].minAmountOut.toString(),
      "12529560049474744443693"
    );

    assert.equal(
      legs[2].minAmountOut.toString(),
      "141099441297140291"
    );

    const decodedV4 =
      ethers.utils.defaultAbiCoder.decode(
        [V4_DATA_TYPE],
        legs[1].venueData
      )[0];

    assert.equal(decodedV4.currency0, DAI);
    assert.equal(decodedV4.currency1, APEPE);
    assert.equal(decodedV4.fee, 10000);
    assert.equal(decodedV4.tickSpacing, 100);
    assert.equal(decodedV4.hooks, ZERO);
    assert.equal(decodedV4.zeroForOne, true);

    const encoded =
      encodeV4ExecutionLegs(legs);

    assert.ok(
      ethers.utils.isHexString(encoded)
    );

    const decoded =
      ethers.utils.defaultAbiCoder.decode(
        [LEG_TYPE],
        encoded
      )[0];

    assert.equal(decoded.length, 3);
    assert.equal(
      decoded[1].venue,
      VENUE_IDS.UNISWAP_V4
    );
    assert.equal(decoded[0].tokenIn, WPOL);
    assert.equal(decoded[2].tokenOut, WPOL);
  }
);

test(
  "rejects V4 direction inconsistent with tokens",
  () => {
    const route = candidate();
    route[1].zeroForOne = false;

    assert.throws(
      () => buildV4ExecutionLegs(route, 50),
      /V4 direction does not match execution leg tokens/
    );
  }
);

test(
  "rejects malformed V4 pool data",
  () => {
    const route = candidate();
    route[1].poolKey = {
      ...POOL_KEY,
      fee: 0
    };

    assert.throws(
      () => buildV4ExecutionLegs(route, 50),
      /valid fee/
    );
  }
);

test(
  "rejects non-contiguous route",
  () => {
    const route = candidate();
    route[2].tokenIn = DAI;

    assert.throws(
      () => buildV4ExecutionLegs(route, 50),
      /Execution route is not contiguous/
    );
  }
);


test(
  "encodes deadline and minimum profit with protected legs",
  () => {
    const legs =
      buildV4ExecutionLegs(
        candidate(),
        50
      );

    const minimumProfit =
      ethers.BigNumber.from(
        "5000000000000000"
      );

    const encoded =
      encodeV4ExecutionPlan({
        legs,
        deadline: 2000000000,
        minimumProfit
      });

    const decoded =
      ethers.utils.defaultAbiCoder.decode(
        [EXECUTION_PLAN_TYPE],
        encoded
      )[0];

    assert.equal(
      decoded.deadline.toString(),
      "2000000000"
    );

    assert.equal(
      decoded.minimumProfit.toString(),
      minimumProfit.toString()
    );

    assert.equal(
      decoded.legs.length,
      3
    );

    assert.equal(
      decoded.legs[0].tokenIn,
      WPOL
    );

    assert.equal(
      decoded.legs[2].tokenOut,
      WPOL
    );
  }
);

test(
  "rejects unsafe execution-plan policy",
  () => {
    const legs =
      buildV4ExecutionLegs(
        candidate(),
        50
      );

    assert.throws(
      () =>
        encodeV4ExecutionPlan({
          legs,
          deadline: 0,
          minimumProfit:
            ethers.BigNumber.from(1)
        }),
      /deadline must be a positive/
    );

    assert.throws(
      () =>
        encodeV4ExecutionPlan({
          legs,
          deadline: 2000000000,
          minimumProfit:
            ethers.constants.Zero
        }),
      /minimumProfit must be a positive/
    );
  }
);
