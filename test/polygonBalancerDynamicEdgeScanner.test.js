"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ethers } = require("ethers");

const {
  scanDynamicBalancerEdges,
  scanDynamicBalancerEdgesMultiSize
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

test("scanDynamicBalancerEdges annotates gross delta and separates positive candidates", async () => {
  const provider = {};
  const blockTag = 888888;
  const amountIn = ethers.BigNumber.from("10000000");
  const startToken = {
    address: "0x0000000000000000000000000000000000000001",
    symbol: "USDC_E",
    decimals: 6
  };

  const edge = { id: "EDGE" };
  const cycle = {
    id: "CYCLE",
    poolId: "0x" + "ef".repeat(32),
    poolAddress: "0x00000000000000000000000000000000000000cc",
    poolName: "Economics Pool",
    poolType: "WEIGHTED"
  };

  const result = await scanDynamicBalancerEdges({
    provider,
    blockTag,
    startToken,
    amountIn,
    discoverEdges: async () => ({
      edgeTargets: [edge]
    }),
    buildOrientations: () => [cycle],
    evaluateCombinations: async () => [
      {
        entryVenue: "QUICKSWAP_V2",
        exitVenue: "UNISWAP_V3",
        amountIn,
        amountOut: amountIn.add(25)
      },
      {
        entryVenue: "SUSHISWAP_V2",
        exitVenue: "UNISWAP_V3",
        amountIn,
        amountOut: amountIn
      },
      {
        entryVenue: "UNISWAP_V3",
        exitVenue: "QUICKSWAP_V2",
        amountIn,
        amountOut: amountIn.sub(10)
      }
    ]
  });

  assert.equal(result.candidates.length, 3);
  assert.equal(result.positiveCandidates.length, 1);

  assert.equal(result.candidates[0].cycle, cycle);
  assert.equal(result.candidates[0].grossDelta.toString(), "25");
  assert.equal(result.candidates[1].grossDelta.toString(), "0");
  assert.equal(result.candidates[2].grossDelta.toString(), "-10");

  assert.equal(result.positiveCandidates[0], result.candidates[0]);
});

test("scanDynamicBalancerEdges separates candidates that strictly cover flashloan premium", async () => {
  const provider = {};
  const blockTag = 999999;
  const amountIn = ethers.BigNumber.from("100000000");
  const premiumBps = 5n;
  const startToken = {
    address: "0x0000000000000000000000000000000000000001",
    symbol: "USDC_E",
    decimals: 6
  };

  const cycle = {
    id: "PREMIUM_CYCLE",
    poolId: "0x" + "ab".repeat(32),
    poolAddress: "0x00000000000000000000000000000000000000dd",
    poolName: "Premium Pool",
    poolType: "WEIGHTED"
  };

  const result = await scanDynamicBalancerEdges({
    provider,
    blockTag,
    startToken,
    amountIn,
    premiumBps,
    discoverEdges: async () => ({
      edgeTargets: [{ id: "EDGE" }]
    }),
    buildOrientations: () => [cycle],
    evaluateCombinations: async () => [
      {
        entryVenue: "QUICKSWAP_V2",
        exitVenue: "UNISWAP_V3",
        amountIn,
        amountOut: amountIn.add(50001)
      },
      {
        entryVenue: "SUSHISWAP_V2",
        exitVenue: "UNISWAP_V3",
        amountIn,
        amountOut: amountIn.add(50000)
      },
      {
        entryVenue: "UNISWAP_V3",
        exitVenue: "QUICKSWAP_V2",
        amountIn,
        amountOut: amountIn.add(40000)
      }
    ]
  });

  assert.equal(result.positiveCandidates.length, 3);
  assert.equal(result.premiumCoveredCandidates.length, 1);

  assert.equal(result.candidates[0].flashloanFee.toString(), "50000");
  assert.equal(result.candidates[0].gasBudget.toString(), "1");
  assert.equal(result.candidates[0].coversFlashloanFee, true);

  assert.equal(result.candidates[1].gasBudget.toString(), "0");
  assert.equal(result.candidates[1].coversFlashloanFee, false);

  assert.equal(result.candidates[2].gasBudget.toString(), "-10000");
  assert.equal(result.candidates[2].coversFlashloanFee, false);

  assert.equal(result.premiumCoveredCandidates[0], result.candidates[0]);
});

test("scanDynamicBalancerEdges forwards candidate filter to discovery", async () => {
  const provider = {};
  const candidateFilterFn = candidates => candidates;

  let seenFilter = null;

  const result = await scanDynamicBalancerEdges({
    provider,
    blockTag: 888,
    startToken: {
      address: "0x0000000000000000000000000000000000000001",
      symbol: "USDC_E",
      decimals: 6
    },
    amountIn: ethers.BigNumber.from("10000000"),
    candidateFilterFn,
    discoverEdges: async args => {
      seenFilter = args.candidateFilterFn;

      return {
        edgeTargets: []
      };
    }
  });

  assert.equal(seenFilter, candidateFilterFn);
  assert.equal(result.candidates.length, 0);
  assert.equal(result.positiveCandidates.length, 0);
});

test("scanDynamicBalancerEdges prunes unsupported orientations before combination evaluation", async () => {
  const provider = {};
  const blockTag = 123456;
  const amountIn = ethers.BigNumber.from("10000000");
  const startToken = {
    address: "0x0000000000000000000000000000000000000001",
    symbol: "USDC_E",
    decimals: 6
  };

  const edge = { id: "PRUNED_EDGE" };
  const cycleA = { id: "A" };
  const cycleB = { id: "B" };
  const orientationEvidence = new Map([["token", { supported: true }]]);
  const evaluated = [];

  const result = await scanDynamicBalancerEdges({
    provider,
    blockTag,
    startToken,
    amountIn,
    orientationEvidence,
    discoverEdges: async () => ({ edgeTargets: [edge] }),
    buildOrientations: () => [cycleA, cycleB],
    selectOrientations: args => {
      assert.equal(args.edge, edge);
      assert.equal(args.evidence, orientationEvidence);
      return [1];
    },
    evaluateCombinations: async ({ cycle }) => {
      evaluated.push(cycle.id);
      return [{
        entryVenue: "UNISWAP_V3",
        exitVenue: "QUICKSWAP_V2",
        amountIn,
        amountOut: amountIn.add(1)
      }];
    }
  });

  assert.deepEqual(evaluated, ["B"]);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].cycle, cycleB);
});

test("scanDynamicBalancerEdges collects shared endpoint evidence once before pruning", async () => {
  const provider = {};
  const blockTag = 246810;
  const amountIn = ethers.BigNumber.from("10000000");
  const startToken = {
    address: "0x0000000000000000000000000000000000000001",
    symbol: "USDC_E",
    decimals: 6
  };

  const tokenA = { address: "0x00000000000000000000000000000000000000a1" };
  const tokenB = { address: "0x00000000000000000000000000000000000000b1" };
  const tokenC = { address: "0x00000000000000000000000000000000000000c1" };
  const edgeAB = { id: "AB", tokenA, tokenB };
  const edgeBC = { id: "BC", tokenA: tokenB, tokenB: tokenC };
  const evidence = new Map([["evidence", true]]);
  let collectedTokens = null;
  let selectorCalls = 0;

  await scanDynamicBalancerEdges({
    provider,
    blockTag,
    startToken,
    amountIn,
    discoverEdges: async () => ({ edgeTargets: [edgeAB, edgeBC] }),
    collectTokens: edges => {
      assert.deepEqual(edges, [edgeAB, edgeBC]);
      return [tokenA, tokenB, tokenC];
    },
    collectEvidence: async args => {
      collectedTokens = args.tokens;
      assert.equal(args.provider, provider);
      assert.equal(args.blockTag, blockTag);
      assert.equal(args.startToken, startToken);
      assert.equal(args.amountIn, amountIn);
      return evidence;
    },
    selectOrientations: args => {
      selectorCalls += 1;
      assert.equal(args.evidence, evidence);
      return [];
    },
    buildOrientations: ({ edge }) => [{ id: edge.id }],
    evaluateCombinations: async () => {
      throw new Error("unsupported orientation should not be evaluated");
    }
  });

  assert.deepEqual(collectedTokens, [tokenA, tokenB, tokenC]);
  assert.equal(selectorCalls, 2);
});

test("scanDynamicBalancerEdges reports orientation pruning telemetry", async () => {
  const provider = {};
  const amountIn = ethers.BigNumber.from("10000000");
  const evidence = new Map();
  const edges = [{ id: "A" }, { id: "B" }];

  const result = await scanDynamicBalancerEdges({
    provider,
    blockTag: 13579,
    startToken: { address: "0x0000000000000000000000000000000000000001" },
    amountIn,
    orientationEvidence: evidence,
    discoverEdges: async () => ({ edgeTargets: edges }),
    buildOrientations: ({ edge }) => [
      { id: edge.id + "-0" },
      { id: edge.id + "-1" }
    ],
    selectOrientations: ({ edge }) => edge.id === "A" ? [0, 1] : [1],
    evaluateCombinations: async () => []
  });

  assert.equal(result.viableEdgeCount, 2);
  assert.equal(result.viableOrientationCount, 3);
});


test("scanDynamicBalancerEdgesMultiSize discovers and prunes once before evaluating every size", async () => {
  const provider = {};
  const blockTag = 97531;
  const startToken = {
    address: "0x0000000000000000000000000000000000000001",
    symbol: "USDC_E",
    decimals: 6
  };
  const amounts = [
    ethers.BigNumber.from("1000000"),
    ethers.BigNumber.from("5000000"),
    ethers.BigNumber.from("10000000")
  ];
  const evidenceAmountIn = ethers.BigNumber.from("10000000");
  const edge = { id: "EDGE" };
  const cycleA = { id: "A" };
  const cycleB = { id: "B" };
  const evidence = new Map([["supported", true]]);
  let discoveryCalls = 0;
  let evidenceCalls = 0;
  let selectorCalls = 0;
  const evaluations = [];

  const result = await scanDynamicBalancerEdgesMultiSize({
    provider,
    blockTag,
    startToken,
    amounts,
    evidenceAmountIn,
    premiumBps: 5n,
    discoverEdges: async () => {
      discoveryCalls += 1;
      return { edgeTargets: [edge] };
    },
    collectTokens: () => [{ address: "0x00000000000000000000000000000000000000a1" }],
    collectEvidence: async ({ amountIn }) => {
      evidenceCalls += 1;
      assert.equal(amountIn.toString(), evidenceAmountIn.toString());
      return evidence;
    },
    buildOrientations: () => [cycleA, cycleB],
    selectOrientations: ({ evidence: seenEvidence }) => {
      selectorCalls += 1;
      assert.equal(seenEvidence, evidence);
      return [1];
    },
    evaluateCombinations: async ({ cycle, amountIn }) => {
      evaluations.push(`${cycle.id}:${amountIn.toString()}`);
      return [{
        entryVenue: "UNISWAP_V3",
        exitVenue: "QUICKSWAP_V2",
        amountIn,
        amountOut: amountIn.add(1000)
      }];
    }
  });

  assert.equal(discoveryCalls, 1);
  assert.equal(evidenceCalls, 1);
  assert.equal(selectorCalls, 1);
  assert.deepEqual(evaluations, [
    "B:1000000",
    "B:5000000",
    "B:10000000"
  ]);
  assert.equal(result.viableEdgeCount, 1);
  assert.equal(result.viableOrientationCount, 1);
  assert.equal(result.sizeResults.length, 3);
  assert.deepEqual(
    result.sizeResults.map(item => item.amountIn.toString()),
    amounts.map(amount => amount.toString())
  );
});

test("scanDynamicBalancerEdgesMultiSize computes economics independently per size", async () => {
  const amounts = [
    ethers.BigNumber.from("1000000"),
    ethers.BigNumber.from("10000000")
  ];

  const result = await scanDynamicBalancerEdgesMultiSize({
    provider: {},
    blockTag: 86420,
    startToken: {
      address: "0x0000000000000000000000000000000000000001"
    },
    amounts,
    premiumBps: 5n,
    discoverEdges: async () => ({
      edgeTargets: [{ id: "EDGE" }]
    }),
    buildOrientations: () => [{ id: "CYCLE" }],
    evaluateCombinations: async ({ amountIn }) => [{
      entryVenue: "UNISWAP_V3",
      exitVenue: "QUICKSWAP_V2",
      amountIn,
      amountOut: amountIn.add(
        amountIn.eq(amounts[0]) ? 501 : 5000
      )
    }]
  });

  assert.equal(result.sizeResults.length, 2);

  const small = result.sizeResults[0];
  const large = result.sizeResults[1];

  assert.equal(small.candidates[0].flashloanFee.toString(), "500");
  assert.equal(small.candidates[0].gasBudget.toString(), "1");
  assert.equal(small.premiumCoveredCandidates.length, 1);

  assert.equal(large.candidates[0].flashloanFee.toString(), "5000");
  assert.equal(large.candidates[0].gasBudget.toString(), "0");
  assert.equal(large.premiumCoveredCandidates.length, 0);
});

test("scanDynamicBalancerEdgesMultiSize rejects an empty amount list before discovery", async () => {
  let discoveryCalls = 0;

  await assert.rejects(
    scanDynamicBalancerEdgesMultiSize({
      provider: {},
      blockTag: 12345,
      startToken: {
        address: "0x0000000000000000000000000000000000000001"
      },
      amounts: [],
      discoverEdges: async () => {
        discoveryCalls += 1;
        return { edgeTargets: [] };
      }
    }),
    /amounts required/
  );

  assert.equal(discoveryCalls, 0);
});
