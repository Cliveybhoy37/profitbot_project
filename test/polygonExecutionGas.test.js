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
