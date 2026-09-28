"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  selectSupportedEdgeOrientations
} = require("../scripts/utils/polygonBalancerEdgeResearch");

const TOKEN_A = {
  address: "0x0000000000000000000000000000000000000001",
  symbol: "A"
};

const TOKEN_B = {
  address: "0x0000000000000000000000000000000000000002",
  symbol: "B"
};

const edge = {
  tokenA: TOKEN_A,
  tokenB: TOKEN_B
};

test("selectSupportedEdgeOrientations keeps forward-only support", () => {
  const evidence = new Map([
    [TOKEN_A.address.toLowerCase(), { hasEntry: true, hasExit: false }],
    [TOKEN_B.address.toLowerCase(), { hasEntry: false, hasExit: true }]
  ]);

  assert.deepEqual(
    selectSupportedEdgeOrientations({ edge, evidence }),
    [0]
  );
});

test("selectSupportedEdgeOrientations keeps reverse-only support", () => {
  const evidence = new Map([
    [TOKEN_A.address.toLowerCase(), { hasEntry: false, hasExit: true }],
    [TOKEN_B.address.toLowerCase(), { hasEntry: true, hasExit: false }]
  ]);

  assert.deepEqual(
    selectSupportedEdgeOrientations({ edge, evidence }),
    [1]
  );
});

test("selectSupportedEdgeOrientations rejects unsupported edge", () => {
  const evidence = new Map([
    [TOKEN_A.address.toLowerCase(), { hasEntry: false, hasExit: false }],
    [TOKEN_B.address.toLowerCase(), { hasEntry: false, hasExit: false }]
  ]);

  assert.deepEqual(
    selectSupportedEdgeOrientations({ edge, evidence }),
    []
  );
});

test("collectUniqueEdgeTokens deduplicates endpoints by address", () => {
  const {
    collectUniqueEdgeTokens
  } = require("../scripts/utils/polygonBalancerEdgeResearch");

  const tokenAClone = {
    ...TOKEN_A,
    symbol: "A-duplicate"
  };

  const edges = [
    {
      tokenA: TOKEN_A,
      tokenB: TOKEN_B
    },
    {
      tokenA: tokenAClone,
      tokenB: {
        address: "0x0000000000000000000000000000000000000003",
        symbol: "C"
      }
    }
  ];

  const tokens = collectUniqueEdgeTokens(edges);

  assert.equal(tokens.length, 3);
  assert.deepEqual(
    tokens.map(token => token.address.toLowerCase()),
    [
      TOKEN_A.address.toLowerCase(),
      TOKEN_B.address.toLowerCase(),
      "0x0000000000000000000000000000000000000003"
    ]
  );
});

test("collectExternalLiquidityEvidence probes each token once", async () => {
  const {
    collectExternalLiquidityEvidence
  } = require("../scripts/utils/polygonBalancerEdgeResearch");

  const tokens = [
    TOKEN_A,
    TOKEN_B
  ];

  const calls = [];

  const probeFn = async args => {
    calls.push(args);

    return {
      token: args.candidateToken,
      entryVenues: ["QUICKSWAP_V2"],
      exitVenues: ["UNISWAP_V3"],
      hasEntry: true,
      hasExit: true,
      hasRoundTripSupport: true
    };
  };

  const evidence = await collectExternalLiquidityEvidence({
    tokens,
    provider: { mock: true },
    blockTag: 123456,
    startToken: {
      address: "0x0000000000000000000000000000000000000099",
      symbol: "USDC_E"
    },
    amountIn: { mockAmount: true },
    probeFn
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].candidateToken, TOKEN_A);
  assert.equal(calls[1].candidateToken, TOKEN_B);
  assert.equal(calls[0].blockTag, 123456);
  assert.equal(calls[1].blockTag, 123456);

  assert.equal(evidence.size, 2);
  assert.equal(
    evidence.get(TOKEN_A.address.toLowerCase()).token,
    TOKEN_A
  );
  assert.equal(
    evidence.get(TOKEN_B.address.toLowerCase()).token,
    TOKEN_B
  );
});
