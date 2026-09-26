const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  findMeasuredExecutionGas
} = require("../scripts/utils/polygonExecutionGas");

test("matches historical fork-measured three-leg route", () => {
  const result = findMeasuredExecutionGas({
    order: ["USDC_E", "WBTC", "WPOL"],
    legs: [
      { venue: "UNISWAP_V3", fee: 500 },
      { venue: "SUSHISWAP_V2", fee: null },
      { venue: "UNISWAP_V3", fee: 500 }
    ]
  }, 1_000_000n, 94_374_759);

  assert.deepEqual(result, {
    gasUnits: 479_395n,
    source: "measured Polygon fork execution at block 94374759"
  });
});

test("does not extrapolate measured gas to Balancer routes", () => {
  const result = findMeasuredExecutionGas({
    order: ["USDC_E", "WBTC", "WPOL"],
    legs: [
      { venue: "BALANCER_V2", fee: null },
      { venue: "SUSHISWAP_V2", fee: null },
      { venue: "UNISWAP_V3", fee: 500 }
    ]
  });

  assert.equal(result, null);
});

test("does not extrapolate measured gas to different V3 fee tiers", () => {
  const result = findMeasuredExecutionGas({
    order: ["USDC_E", "WBTC", "WPOL"],
    legs: [
      { venue: "UNISWAP_V3", fee: 3000 },
      { venue: "SUSHISWAP_V2", fee: null },
      { venue: "UNISWAP_V3", fee: 500 }
    ]
  });

  assert.equal(result, null);
});

test("returns null for malformed leg metadata", () => {
  const result = findMeasuredExecutionGas({
    order: ["USDC_E", "WBTC", "WPOL"],
    legs: [
      null,
      { venue: "SUSHISWAP_V2", fee: null },
      { venue: "UNISWAP_V3", fee: 500 }
    ]
  });

  assert.equal(result, null);
});

test("does not extrapolate measured gas to a different loan amount", () => {
  const result = findMeasuredExecutionGas(
    {
      order: ["USDC_E", "WBTC", "WPOL"],
      legs: [
        { venue: "UNISWAP_V3", fee: 500 },
        { venue: "SUSHISWAP_V2", fee: null },
        { venue: "UNISWAP_V3", fee: 500 }
      ]
    },
    2_000_000n
  );

  assert.equal(result, null);
});

test("does not extrapolate measured gas to a different block", () => {
  const result = findMeasuredExecutionGas(
    {
      order: ["USDC_E", "WBTC", "WPOL"],
      legs: [
        { venue: "UNISWAP_V3", fee: 500 },
        { venue: "SUSHISWAP_V2", fee: null },
        { venue: "UNISWAP_V3", fee: 500 }
      ]
    },
    1_000_000n,
    94_274_759
  );

  assert.equal(result, null);
});

test("matches historical fork-measured Balancer route", () => {
  const result = findMeasuredExecutionGas(
    {
      order: ["USDC_E", "WETH", "WPOL"],
      legs: [
        { venue: "UNISWAP_V3", fee: 500, poolId: null },
        {
          venue: "BALANCER_V2",
          fee: null,
          poolId: "0x32fc95287b14eaef3afa92cccc48c285ee3a280a000100000000000000000005"
        },
        { venue: "UNISWAP_V3", fee: 500, poolId: null }
      ]
    },
    1_000_000n,
    93_974_759
  );

  assert.deepEqual(result, {
    gasUnits: 478_582n,
    source: "measured Polygon fork Balancer execution at block 93974759"
  });
});

test("does not extrapolate Balancer gas evidence to a different pool", () => {
  const result = findMeasuredExecutionGas(
    {
      order: ["USDC_E", "WETH", "WPOL"],
      legs: [
        { venue: "UNISWAP_V3", fee: 500, poolId: null },
        {
          venue: "BALANCER_V2",
          fee: null,
          poolId: "0x03cd191f589d12b0582a99808cf19851e468e6b500010000000000000000000a"
        },
        { venue: "UNISWAP_V3", fee: 500, poolId: null }
      ]
    },
    1_000_000n,
    93_974_759
  );

  assert.equal(result, null);
});
