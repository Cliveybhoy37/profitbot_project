"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  probeExternalTokenLiquidity
} = require("../scripts/utils/polygonExternalLiquidityResearch");

const START = {
  address: "0x0000000000000000000000000000000000000001",
  symbol: "USDC_E",
  decimals: 6
};

const TOKEN = {
  address: "0x0000000000000000000000000000000000000002",
  symbol: "AAA",
  decimals: 18
};

test("probeExternalTokenLiquidity records usable entry and exit venues", async () => {
  const calls = [];

  const quoteFn = async (
    venue,
    path,
    amountIn,
    provider,
    blockTag
  ) => {
    calls.push({
      venue,
      path,
      amountIn: amountIn.toString(),
      provider,
      blockTag
    });

    return {
      venue,
      amountOut: ethers.BigNumber.from("123")
    };
  };

  const result = await probeExternalTokenLiquidity({
    provider: {},
    blockTag: 12345,
    startToken: START,
    candidateToken: TOKEN,
    amountIn: ethers.BigNumber.from("10000000"),
    quoteFn
  });

  assert.equal(calls.length, 6);
  assert.equal(result.entryVenues.length, 3);
  assert.equal(result.exitVenues.length, 3);
  assert.equal(result.hasEntry, true);
  assert.equal(result.hasExit, true);
  assert.equal(result.hasRoundTripSupport, true);
});

test("probeExternalTokenLiquidity isolates unavailable venues", async () => {
  const quoteFn = async (venue, path) => {
    const isEntry =
      path[0].toLowerCase() === START.address.toLowerCase();

    if (venue === "QUICKSWAP_V2" && isEntry) {
      return {
        venue,
        amountOut: ethers.BigNumber.from("100")
      };
    }

    if (venue === "UNISWAP_V3" && !isEntry) {
      return {
        venue,
        amountOut: ethers.BigNumber.from("100")
      };
    }

    return null;
  };

  const result = await probeExternalTokenLiquidity({
    provider: {},
    blockTag: 12345,
    startToken: START,
    candidateToken: TOKEN,
    amountIn: ethers.BigNumber.from("10000000"),
    quoteFn
  });

  assert.deepEqual(result.entryVenues, ["QUICKSWAP_V2"]);
  assert.deepEqual(result.exitVenues, ["UNISWAP_V3"]);
  assert.equal(result.hasRoundTripSupport, true);
});

test("probeExternalTokenLiquidity requires a pinned block", async () => {
  await assert.rejects(
    probeExternalTokenLiquidity({
      provider: {},
      startToken: START,
      candidateToken: TOKEN,
      amountIn: ethers.BigNumber.from("10000000"),
      quoteFn: async () => null
    }),
    /pinned block/
  );
});
