const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validateProfitBotConfiguration
} = require("../scripts/utils/polygonProfitBotDeployment");

const EXPECTED = {
  addressesProvider: "0xa97684ead0e402dc232d5a977953df7ecbab3cdb",
  pool: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
  quickSwapRouter: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
  sushiSwapRouter: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
  uniswapV3Router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
  balancerVault: "0xBA12222222228d8Ba445958a75a0704d566BF2C8"
};

test("accepts the expected current Polygon ProfitBot configuration", () => {
  assert.doesNotThrow(() =>
    validateProfitBotConfiguration(EXPECTED, EXPECTED)
  );
});

test("rejects a deployment with a missing or mismatched dependency", () => {
  assert.throws(
    () =>
      validateProfitBotConfiguration(
        {
          ...EXPECTED,
          balancerVault: null
        },
        EXPECTED
      ),
    /balancerVault/
  );

  assert.throws(
    () =>
      validateProfitBotConfiguration(
        {
          ...EXPECTED,
          uniswapV3Router: "0x0000000000000000000000000000000000000001"
        },
        EXPECTED
      ),
    /uniswapV3Router/
  );
});
