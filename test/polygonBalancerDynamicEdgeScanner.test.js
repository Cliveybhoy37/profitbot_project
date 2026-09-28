"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  scanDynamicBalancerEdges
} = require("../scripts/utils/polygonBalancerDynamicEdgeScanner");

test("scanDynamicBalancerEdges evaluates both orientations for every discovered edge", async () => {
  const provider = {};
  const blockTag = 123456;
  const amountIn = ethers.BigNumber.from("10000000");
  const startToken = {
    address: "0x0000000000000000000000000000000000000001",
    symbol: "USDC_E",
    decimals: 6
  };

  const edge = {
    poolId: "0x" + "ab".repeat(32),
    poolAddress: "0x00000000000000000000000000000000000000aa",
    poolName: "Test Pool",
    poolType: "WEIGHTED"
  };

  const cycleA = { id: "A" };
  const cycleB = { id: "B" };
  const calls = [];

  const result = await scanDynamicBalancerEdges({
    provider,
    blockTag,
    startToken,
    amountIn,
    discoverEdges: async args => {
      assert.equal(args.provider, provider);
      assert.equal(args.blockTag, blockTag);

      return {
        edgeTargets: [edge]
      };
    },
    buildOrientations: args => {
      assert.equal(args.edge, edge);
      assert.equal(args.startToken, startToken);
      return [cycleA, cycleB];
    },
    evaluateCombinations: async args => {
      calls.push(args);

      return [{
        entryVenue: "QUICKSWAP_V2",
        exitVenue: "UNISWAP_V3",
        amountIn: args.amountIn,
        amountOut: args.amountIn.add(1)
      }];
    }
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].cycle, cycleA);
  assert.equal(calls[1].cycle, cycleB);

  for (const call of calls) {
    assert.equal(call.amountIn.toString(), amountIn.toString());
    assert.equal(call.provider, provider);
    assert.equal(call.blockTag, blockTag);
  }

  assert.equal(result.candidates.length, 2);
});

test("scanDynamicBalancerEdges isolates a failed orientation and continues scanning", async () => {
  const provider = {};
  const blockTag = 654321;
  const amountIn = ethers.BigNumber.from("10000000");
  const startToken = {
    address: "0x0000000000000000000000000000000000000001",
    symbol: "USDC_E",
    decimals: 6
  };

  const edge = {
    poolId: "0x" + "cd".repeat(32),
    poolAddress: "0x00000000000000000000000000000000000000bb",
    poolName: "Resilience Pool",
    poolType: "STABLE"
  };

  const failingCycle = { id: "FAIL" };
  const survivingCycle = { id: "SURVIVE" };
  const calls = [];

  const result = await scanDynamicBalancerEdges({
    provider,
    blockTag,
    startToken,
    amountIn,
    discoverEdges: async () => ({
      edgeTargets: [edge]
    }),
    buildOrientations: () => [
      failingCycle,
      survivingCycle
    ],
    evaluateCombinations: async args => {
      calls.push(args.cycle.id);

      if (args.cycle === failingCycle) {
        throw new Error("simulated orientation failure");
      }

      return [{
        entryVenue: "UNISWAP_V3",
        exitVenue: "QUICKSWAP_V2",
        amountIn,
        amountOut: amountIn.add(2)
      }];
    }
  });

  assert.deepEqual(calls, ["FAIL", "SURVIVE"]);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].amountOut.toString(), "10000002");
});

test("scanDynamicBalancerEdges isolates a failed edge and continues with later edges", async () => {
  const provider = {};
  const blockTag = 777777;
  const amountIn = ethers.BigNumber.from("10000000");
  const startToken = {
    address: "0x0000000000000000000000000000000000000001",
    symbol: "USDC_E",
    decimals: 6
  };

  const badEdge = { id: "BAD_EDGE" };
  const goodEdge = { id: "GOOD_EDGE" };
  const goodCycle = { id: "GOOD_CYCLE" };
  const builtEdges = [];
  const evaluatedCycles = [];

  const result = await scanDynamicBalancerEdges({
    provider,
    blockTag,
    startToken,
    amountIn,
    discoverEdges: async () => ({
      edgeTargets: [badEdge, goodEdge]
    }),
    buildOrientations: ({ edge }) => {
      builtEdges.push(edge.id);

      if (edge === badEdge) {
        throw new Error("simulated edge failure");
      }

      return [goodCycle];
    },
    evaluateCombinations: async ({ cycle }) => {
      evaluatedCycles.push(cycle.id);

      return [{
        entryVenue: "QUICKSWAP_V2",
        exitVenue: "SUSHISWAP_V2",
        amountIn,
        amountOut: amountIn.add(3)
      }];
    }
  });

  assert.deepEqual(builtEdges, ["BAD_EDGE", "GOOD_EDGE"]);
  assert.deepEqual(evaluatedCycles, ["GOOD_CYCLE"]);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].amountOut.toString(), "10000003");
});
