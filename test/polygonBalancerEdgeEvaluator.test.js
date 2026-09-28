"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  evaluateBalancerEdgeCycle
} = require("../scripts/utils/polygonBalancerEdgeEvaluator");

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

test("evaluateBalancerEdgeCycle chains all three quotes at one pinned block", async () => {
  const calls = [];
  const amountIn = ethers.BigNumber.from("10000000");
  const entryOut = ethers.BigNumber.from("20000000");
  const balancerOut = ethers.BigNumber.from("30000000");
  const finalOut = ethers.BigNumber.from("10010000");
  const blockTag = 123456;

  const cycle = {
    poolId: "0x" + "ab".repeat(32),
    poolType: "WEIGHTED",
    poolAssets: [TOKEN_A.address, TOKEN_B.address],
    balancesByAddress: {
      [TOKEN_A.address.toLowerCase()]: ethers.BigNumber.from("1000000000"),
      [TOKEN_B.address.toLowerCase()]: ethers.BigNumber.from("2000000000")
    },
    legs: [
      { role: "ENTRY", tokenIn: START, tokenOut: TOKEN_A },
      { role: "BALANCER", tokenIn: TOKEN_A, tokenOut: TOKEN_B },
      { role: "EXIT", tokenIn: TOKEN_B, tokenOut: START }
    ]
  };

  const getExternalQuote = async (venue, path, quotedAmountIn, provider, quotedBlock) => {
    calls.push({ type: "external", venue, path, quotedAmountIn, provider, quotedBlock });

    return {
      venue,
      type: venue === "UNISWAP_V3" ? "V3" : "V2",
      amountOut: calls.length === 1 ? entryOut : finalOut,
      fee: venue === "UNISWAP_V3" ? 500 : null,
      pool: null
    };
  };

  const getBalancerQuote = async args => {
    calls.push({ type: "balancer", ...args });

    return {
      venue: "BALANCER_V2",
      amountIn: args.amountIn,
      amountOut: balancerOut,
      poolId: args.poolId,
      blockTag: args.blockTag
    };
  };

  const provider = {};
  const result = await evaluateBalancerEdgeCycle({
    cycle,
    amountIn,
    entryVenue: "QUICKSWAP_V2",
    exitVenue: "UNISWAP_V3",
    provider,
    blockTag,
    getExternalQuote,
    getBalancerQuote
  });

  assert.equal(calls.length, 3);

  assert.equal(calls[0].quotedAmountIn.toString(), amountIn.toString());
  assert.equal(calls[0].quotedBlock, blockTag);

  assert.equal(calls[1].amountIn.toString(), entryOut.toString());
  assert.equal(calls[1].blockTag, blockTag);

  assert.equal(calls[2].quotedAmountIn.toString(), balancerOut.toString());
  assert.equal(calls[2].quotedBlock, blockTag);

  assert.equal(result.amountIn.toString(), amountIn.toString());
  assert.equal(result.amountOut.toString(), finalOut.toString());
});

test("evaluateBalancerEdgeCycle stops when the entry quote is unavailable", async () => {
  let balancerCalls = 0;
  let externalCalls = 0;

  const cycle = {
    poolId: "0x" + "ab".repeat(32),
    poolType: "WEIGHTED",
    poolAssets: [TOKEN_A.address, TOKEN_B.address],
    balancesByAddress: {},
    legs: [
      { role: "ENTRY", tokenIn: START, tokenOut: TOKEN_A },
      { role: "BALANCER", tokenIn: TOKEN_A, tokenOut: TOKEN_B },
      { role: "EXIT", tokenIn: TOKEN_B, tokenOut: START }
    ]
  };

  const result = await evaluateBalancerEdgeCycle({
    cycle,
    amountIn: ethers.BigNumber.from("10000000"),
    entryVenue: "QUICKSWAP_V2",
    exitVenue: "UNISWAP_V3",
    provider: {},
    blockTag: 123456,
    getExternalQuote: async () => {
      externalCalls += 1;
      return null;
    },
    getBalancerQuote: async () => {
      balancerCalls += 1;
      throw new Error("Balancer should not be called");
    }
  });

  assert.equal(result, null);
  assert.equal(externalCalls, 1);
  assert.equal(balancerCalls, 0);
});

test("evaluateBalancerEdgeCycle isolates Balancer quote failure", async () => {
  let externalCalls = 0;

  const cycle = {
    poolId: "0x" + "ab".repeat(32),
    poolType: "WEIGHTED",
    poolAssets: [TOKEN_A.address, TOKEN_B.address],
    balancesByAddress: {},
    legs: [
      { role: "ENTRY", tokenIn: START, tokenOut: TOKEN_A },
      { role: "BALANCER", tokenIn: TOKEN_A, tokenOut: TOKEN_B },
      { role: "EXIT", tokenIn: TOKEN_B, tokenOut: START }
    ]
  };

  const result = await evaluateBalancerEdgeCycle({
    cycle,
    amountIn: ethers.BigNumber.from("10000000"),
    entryVenue: "QUICKSWAP_V2",
    exitVenue: "UNISWAP_V3",
    provider: {},
    blockTag: 123456,
    getExternalQuote: async () => {
      externalCalls += 1;
      return {
        venue: "QUICKSWAP_V2",
        type: "V2",
        amountOut: ethers.BigNumber.from("20000000"),
        fee: null,
        pool: null
      };
    },
    getBalancerQuote: async () => {
      throw new Error("quote unavailable");
    }
  });

  assert.equal(result, null);
  assert.equal(externalCalls, 1);
});

test("evaluateBalancerEdgeCycle stops when the exit quote is unavailable", async () => {
  let externalCalls = 0;
  let balancerCalls = 0;

  const cycle = {
    poolId: "0x" + "ab".repeat(32),
    poolType: "WEIGHTED",
    poolAssets: [TOKEN_A.address, TOKEN_B.address],
    balancesByAddress: {},
    legs: [
      { role: "ENTRY", tokenIn: START, tokenOut: TOKEN_A },
      { role: "BALANCER", tokenIn: TOKEN_A, tokenOut: TOKEN_B },
      { role: "EXIT", tokenIn: TOKEN_B, tokenOut: START }
    ]
  };

  const result = await evaluateBalancerEdgeCycle({
    cycle,
    amountIn: ethers.BigNumber.from("10000000"),
    entryVenue: "QUICKSWAP_V2",
    exitVenue: "UNISWAP_V3",
    provider: {},
    blockTag: 123456,
    getExternalQuote: async () => {
      externalCalls += 1;

      if (externalCalls === 1) {
        return {
          venue: "QUICKSWAP_V2",
          type: "V2",
          amountOut: ethers.BigNumber.from("20000000"),
          fee: null,
          pool: null
        };
      }

      return null;
    },
    getBalancerQuote: async () => {
      balancerCalls += 1;
      return {
        venue: "BALANCER_V2",
        amountOut: ethers.BigNumber.from("30000000"),
        poolId: cycle.poolId,
        blockTag: 123456
      };
    }
  });

  assert.equal(result, null);
  assert.equal(externalCalls, 2);
  assert.equal(balancerCalls, 1);
});
