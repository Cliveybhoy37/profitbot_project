"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildBalancerEdgeCycleOrientations
} = require("../scripts/utils/polygonBalancerEdgeCycles");

const START = {
  address: "0x0000000000000000000000000000000000000001",
  symbol: "USDC_E",
  decimals: 6
};

const TOKEN_A = {
  address: "0x0000000000000000000000000000000000000011",
  symbol: "AAA",
  decimals: 18
};

const TOKEN_B = {
  address: "0x0000000000000000000000000000000000000022",
  symbol: "BBB",
  decimals: 8
};

const EDGE = {
  tokenA: TOKEN_A,
  tokenB: TOKEN_B,
  poolId: "0x" + "ab".repeat(32),
  poolAddress: "0x0000000000000000000000000000000000000091",
  poolName: "Verified Pool",
  poolType: "WEIGHTED",
  liquidity: "50000",
  poolAssets: [TOKEN_A.address, TOKEN_B.address],
  balancesByAddress: {}
};

test("buildBalancerEdgeCycleOrientations creates both three-leg directions", () => {
  const cycles = buildBalancerEdgeCycleOrientations({
    edge: EDGE,
    startToken: START
  });

  assert.equal(cycles.length, 2);

  assert.deepEqual(
    cycles.map(cycle =>
      cycle.legs.map(leg => [
        leg.tokenIn.address,
        leg.tokenOut.address,
        leg.role
      ])
    ),
    [
      [
        [START.address, TOKEN_A.address, "ENTRY"],
        [TOKEN_A.address, TOKEN_B.address, "BALANCER"],
        [TOKEN_B.address, START.address, "EXIT"]
      ],
      [
        [START.address, TOKEN_B.address, "ENTRY"],
        [TOKEN_B.address, TOKEN_A.address, "BALANCER"],
        [TOKEN_A.address, START.address, "EXIT"]
      ]
    ]
  );

  assert.equal(cycles[0].poolId, EDGE.poolId);
  assert.equal(cycles[0].poolType, "WEIGHTED");
  assert.deepEqual(cycles[0].poolAssets, EDGE.poolAssets);
  assert.deepEqual(cycles[0].balancesByAddress, EDGE.balancesByAddress);
});

test("buildBalancerEdgeCycleOrientations rejects start token inside the Balancer edge", () => {
  assert.throws(
    () =>
      buildBalancerEdgeCycleOrientations({
        edge: EDGE,
        startToken: TOKEN_A
      }),
    /start token/i
  );
});

test("buildBalancerEdgeCycleOrientations rejects unsupported Balancer pool types", () => {
  assert.throws(
    () =>
      buildBalancerEdgeCycleOrientations({
        edge: {
          ...EDGE,
          poolType: "COMPOSABLE_STABLE"
        },
        startToken: START
      }),
    /unsupported.*pool type/i
  );
});
