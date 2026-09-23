"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const TOKENS = require("../scripts/utils/polygonScannerTokens");
const {
  buildScanTarget
} = require("../scripts/utils/polygonBalancerScanTarget");

const POOL_ID =
  "0x03cd191f589d12b0582a99808cf19851e468e6b500010000000000000000000a";

test("builds a verified three-token Balancer scan target", () => {
  const target = buildScanTarget({
    name: "Test Pool",
    address: "0x03cd191f589d12b0582a99808cf19851e468e6b5",
    poolId: POOL_ID,
    tokens: ["WBTC", "USDC_E", "WETH"],
    tokenRegistry: TOKENS
  });

  assert.equal(target.name, "Test Pool");
  assert.equal(target.poolId, POOL_ID);
  assert.deepEqual(target.tokens, ["WBTC", "USDC_E", "WETH"]);
  assert.equal(target.startToken, "USDC_E");
  assert.deepEqual(target.otherTokens, ["WBTC", "WETH"]);

  assert.deepEqual(
    target.assets,
    target.tokens.map(symbol => TOKENS[symbol].address)
  );
});

test("rejects a four-token pool until a triangle is selected", () => {
  assert.throws(
    () =>
      buildScanTarget({
        poolId: POOL_ID,
        tokens: ["WBTC", "USDC_E", "WETH", "DAI"],
        tokenRegistry: TOKENS
      }),
    /exactly 3 scanner tokens/
  );
});

test("rejects duplicate triangle tokens", () => {
  assert.throws(
    () =>
      buildScanTarget({
        poolId: POOL_ID,
        tokens: ["USDC_E", "WETH", "WETH"],
        tokenRegistry: TOKENS
      }),
    /duplicate tokens/
  );
});

test("rejects tokens outside the verified scanner registry", () => {
  assert.throws(
    () =>
      buildScanTarget({
        poolId: POOL_ID,
        tokens: ["USDC_E", "WETH", "FAKE"],
        tokenRegistry: TOKENS
      }),
    /Unknown scanner token FAKE/
  );
});

test("rejects triangle without the configured start token", () => {
  assert.throws(
    () =>
      buildScanTarget({
        poolId: POOL_ID,
        tokens: ["WPOL", "WBTC", "WETH"],
        tokenRegistry: TOKENS
      }),
    /does not contain USDC_E/
  );
});

test("supports an explicitly configured alternative start token", () => {
  const target = buildScanTarget({
    poolId: POOL_ID,
    tokens: ["WPOL", "WBTC", "WETH"],
    tokenRegistry: TOKENS,
    startToken: "WETH"
  });

  assert.equal(target.startToken, "WETH");
  assert.deepEqual(target.otherTokens, ["WPOL", "WBTC"]);
});
