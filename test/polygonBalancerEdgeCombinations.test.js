"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  evaluateBalancerEdgeCombinations
} = require("../scripts/utils/polygonBalancerEdgeCombinations");

test("evaluateBalancerEdgeCombinations evaluates all nine external venue pairs", async () => {
  const calls = [];
  const cycle = { legs: [{}, {}, {}] };
  const amountIn = ethers.BigNumber.from("10000000");
  const provider = {};
  const blockTag = 123456;

  const evaluateCycle = async args => {
    calls.push(args);

    return {
      amountIn: args.amountIn,
      amountOut: args.amountIn.add(calls.length)
    };
  };

  const results = await evaluateBalancerEdgeCombinations({
    cycle,
    amountIn,
    provider,
    blockTag,
    evaluateCycle
  });

  assert.equal(calls.length, 9);
  assert.equal(results.length, 9);

  const pairs = calls.map(
    ({ entryVenue, exitVenue }) => `${entryVenue}->${exitVenue}`
  );

  assert.deepEqual(pairs, [
    "QUICKSWAP_V2->QUICKSWAP_V2",
    "QUICKSWAP_V2->SUSHISWAP_V2",
    "QUICKSWAP_V2->UNISWAP_V3",
    "SUSHISWAP_V2->QUICKSWAP_V2",
    "SUSHISWAP_V2->SUSHISWAP_V2",
    "SUSHISWAP_V2->UNISWAP_V3",
    "UNISWAP_V3->QUICKSWAP_V2",
    "UNISWAP_V3->SUSHISWAP_V2",
    "UNISWAP_V3->UNISWAP_V3"
  ]);

  for (const call of calls) {
    assert.equal(call.cycle, cycle);
    assert.equal(call.amountIn.toString(), amountIn.toString());
    assert.equal(call.provider, provider);
    assert.equal(call.blockTag, blockTag);
  }
});

test("evaluateBalancerEdgeCombinations filters unavailable combinations without stopping the scan", async () => {
  let calls = 0;

  const results = await evaluateBalancerEdgeCombinations({
    cycle: { legs: [{}, {}, {}] },
    amountIn: ethers.BigNumber.from("10000000"),
    provider: {},
    blockTag: 123456,
    evaluateCycle: async args => {
      calls += 1;

      if (args.entryVenue === "SUSHISWAP_V2") {
        return null;
      }

      return {
        amountIn: args.amountIn,
        amountOut: args.amountIn.add(1)
      };
    }
  });

  assert.equal(calls, 9);
  assert.equal(results.length, 6);
  assert.equal(
    results.some(result => result.entryVenue === "SUSHISWAP_V2"),
    false
  );
});
