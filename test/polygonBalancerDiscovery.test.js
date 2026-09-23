"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const TOKENS = require("../scripts/utils/polygonScannerTokens");
const {
  verifiedOverlap,
  combinations3
} = require("../scripts/utils/polygonBalancerDiscovery");

test("combinations3 creates one triangle from three tokens", () => {
  assert.deepEqual(
    combinations3(["WBTC", "USDC_E", "WETH"]),
    [["WBTC", "USDC_E", "WETH"]]
  );
});

test("combinations3 creates four distinct triangles from four tokens", () => {
  assert.deepEqual(
    combinations3(["WBTC", "USDC_E", "WETH", "DAI"]),
    [
      ["WBTC", "USDC_E", "WETH"],
      ["WBTC", "USDC_E", "DAI"],
      ["WBTC", "WETH", "DAI"],
      ["USDC_E", "WETH", "DAI"]
    ]
  );
});

test("verifiedOverlap accepts trusted token addresses", () => {
  const pool = {
    poolTokens: [
      { address: TOKENS.WBTC.address },
      { address: TOKENS.USDC_E.address },
      { address: TOKENS.WETH.address }
    ]
  };

  assert.deepEqual(
    verifiedOverlap(pool),
    ["WBTC", "USDC_E", "WETH"]
  );
});

test("verifiedOverlap ignores unknown token addresses", () => {
  const pool = {
    poolTokens: [
      { address: TOKENS.USDC_E.address },
      { address: TOKENS.WETH.address },
      { address: "0x0000000000000000000000000000000000000001" }
    ]
  };

  assert.deepEqual(
    verifiedOverlap(pool),
    ["USDC_E", "WETH"]
  );
});

test("verifiedOverlap deduplicates trusted addresses", () => {
  const pool = {
    poolTokens: [
      { address: TOKENS.USDC_E.address },
      { address: TOKENS.USDC_E.address.toUpperCase() },
      { address: TOKENS.WETH.address }
    ]
  };

  assert.deepEqual(
    verifiedOverlap(pool),
    ["USDC_E", "WETH"]
  );
});
