"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  BALANCER_VAULT,
  TRICRYPTO_POOL_ID,
  getBalancerQuote
} = require("../scripts/utils/polygonBalancerQuotes");

const WBTC = "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6";
const USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

test("Balancer Polygon constants are configured", () => {
  assert.equal(
    ethers.utils.getAddress(BALANCER_VAULT),
    BALANCER_VAULT
  );

  assert.match(TRICRYPTO_POOL_ID, /^0x[0-9a-fA-F]{64}$/);
});

test("Balancer quote rejects same-token swaps", async () => {
  await assert.rejects(
    getBalancerQuote({
      provider: {},
      assets: [WBTC, USDC],
      tokenIn: USDC,
      tokenOut: USDC,
      amountIn: ethers.BigNumber.from(1)
    }),
    /tokenIn and tokenOut must differ/
  );
});

test("Balancer quote rejects tokens outside asset list", async () => {
  await assert.rejects(
    getBalancerQuote({
      provider: {},
      assets: [WBTC, USDC],
      tokenIn: USDC,
      tokenOut: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      amountIn: ethers.BigNumber.from(1)
    }),
    /token not present in Balancer asset list/
  );
});

test("Balancer quote rejects zero input", async () => {
  await assert.rejects(
    getBalancerQuote({
      provider: {},
      assets: [WBTC, USDC],
      tokenIn: USDC,
      tokenOut: WBTC,
      amountIn: ethers.constants.Zero
    }),
    /positive amountIn required/
  );
});
