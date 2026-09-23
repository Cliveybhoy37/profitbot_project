const { test } = require("node:test");
const assert = require("node:assert/strict");
const tokens = require("../scripts/utils/polygonScannerTokens");

test("Polygon scanner keeps native and bridged USDC distinct", () => {
  assert.notEqual(tokens.USDC_NATIVE.address, tokens.USDC_E.address);
  assert.equal(tokens.USDC_NATIVE.decimals, 6);
  assert.equal(tokens.USDC_E.decimals, 6);
});

test("Polygon scanner registry contains expected core assets", () => {
  assert.equal(tokens.WPOL.decimals, 18);
  assert.equal(tokens.DAI.decimals, 18);
  assert.equal(tokens.WETH.decimals, 18);
  assert.equal(tokens.WBTC.decimals, 8);
});
