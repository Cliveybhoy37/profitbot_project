"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const TOKENS = require("../scripts/utils/polygonScannerTokens");
const {
  verifiedOverlap,
  combinations3,
  mapBalancesByAddress
} = require("../scripts/utils/polygonBalancerDiscovery");

test("combinations3 creates one triangle from three tokens", () => {
  assert.deepEqual(
    combinations3(["WBTC", "USDC_E", "WETH"]),
    [["WBTC", "USDC_E", "WETH"]]
  );
});

test("combinations3 creates four distinct triangles from four tokens", () => {
  assert.deepEqual(
    combinations3(["WBTC", "USDC_E", "WETH", "DAI"]),
    [
      ["WBTC", "USDC_E", "WETH"],
      ["WBTC", "USDC_E", "DAI"],
      ["WBTC", "WETH", "DAI"],
      ["USDC_E", "WETH", "DAI"]
    ]
  );
});

test("verifiedOverlap accepts trusted token addresses", () => {
  const pool = {
    poolTokens: [
      { address: TOKENS.WBTC.address },
      { address: TOKENS.USDC_E.address },
      { address: TOKENS.WETH.address }
    ]
  };

  assert.deepEqual(
    verifiedOverlap(pool),
    ["WBTC", "USDC_E", "WETH"]
  );
});

test("verifiedOverlap ignores unknown token addresses", () => {
  const pool = {
    poolTokens: [
      { address: TOKENS.USDC_E.address },
      { address: TOKENS.WETH.address },
      { address: "0x0000000000000000000000000000000000000001" }
    ]
  };

  assert.deepEqual(
    verifiedOverlap(pool),
    ["USDC_E", "WETH"]
  );
});

test("verifiedOverlap deduplicates trusted addresses", () => {
  const pool = {
    poolTokens: [
      { address: TOKENS.USDC_E.address },
      { address: TOKENS.USDC_E.address.toUpperCase() },
      { address: TOKENS.WETH.address }
    ]
  };

  assert.deepEqual(
    verifiedOverlap(pool),
    ["USDC_E", "WETH"]
  );
});

test("verified discovery requires a pinned block", async () => {
  const {
    discoverVerifiedCandidates
  } = require("../scripts/utils/polygonBalancerDiscovery");

  await assert.rejects(
    () =>
      discoverVerifiedCandidates({
        provider: {},
        blockTag: null
      }),
    /requires pinned blockTag/
  );
});

test("mapBalancesByAddress preserves token balance alignment", () => {
  const balances = [111, 222, 333];

  const result = mapBalancesByAddress(
    [
      TOKENS.WBTC.address,
      TOKENS.USDC_E.address,
      TOKENS.WETH.address
    ],
    balances
  );

  assert.equal(
    result[TOKENS.WBTC.address.toLowerCase()],
    111
  );
  assert.equal(
    result[TOKENS.USDC_E.address.toLowerCase()],
    222
  );
  assert.equal(
    result[TOKENS.WETH.address.toLowerCase()],
    333
  );
  assert.equal(Object.isFrozen(result), true);
});

test("mapBalancesByAddress rejects token balance length mismatch", () => {
  assert.throws(
    () =>
      mapBalancesByAddress(
        [TOKENS.USDC_E.address, TOKENS.WETH.address],
        [111]
      ),
    /token\/balance length mismatch/
  );
});

test("maps API metadata onto Vault-verified tokens in Vault order", () => {
  const {
    mapVerifiedPoolTokens
  } = require("../scripts/utils/polygonBalancerDiscovery");

  const tokenA = "0x0000000000000000000000000000000000000011";
  const tokenB = "0x0000000000000000000000000000000000000022";
  const tokenC = "0x0000000000000000000000000000000000000033";

  const apiTokens = [
    { address: tokenC, symbol: "CCC", decimals: 8 },
    { address: tokenA, symbol: "AAA", decimals: 18 },
    { address: tokenB, symbol: "BBB", decimals: 6 }
  ];

  const result = mapVerifiedPoolTokens(
    apiTokens,
    [tokenA, tokenB, tokenC]
  );

  assert.deepEqual(result, [
    {
      address: ethersAddress(tokenA),
      symbol: "AAA",
      decimals: 18
    },
    {
      address: ethersAddress(tokenB),
      symbol: "BBB",
      decimals: 6
    },
    {
      address: ethersAddress(tokenC),
      symbol: "CCC",
      decimals: 8
    }
  ]);
});

test("verified pool token mapping rejects API/Vault token mismatch", () => {
  const {
    mapVerifiedPoolTokens
  } = require("../scripts/utils/polygonBalancerDiscovery");

  const tokenA = "0x0000000000000000000000000000000000000011";
  const tokenB = "0x0000000000000000000000000000000000000022";
  const unknown = "0x0000000000000000000000000000000000000099";

  assert.throws(
    () =>
      mapVerifiedPoolTokens(
        [
          { address: tokenA, symbol: "AAA", decimals: 18 },
          { address: tokenB, symbol: "BBB", decimals: 6 }
        ],
        [tokenA, unknown]
      ),
    /API\/Vault token mismatch/
  );
});

function ethersAddress(address) {
  return require("ethers").ethers.utils.getAddress(address);
}

test("buildVerifiedPoolEdges creates each unique pool token pair once", () => {
  const {
    buildVerifiedPoolEdges
  } = require("../scripts/utils/polygonBalancerDiscovery");

  const tokens = [
    { address: "0x0000000000000000000000000000000000000011", symbol: "AAA", decimals: 18 },
    { address: "0x0000000000000000000000000000000000000022", symbol: "BBB", decimals: 6 },
    { address: "0x0000000000000000000000000000000000000033", symbol: "CCC", decimals: 8 }
  ];

  assert.deepEqual(
    buildVerifiedPoolEdges(tokens),
    [
      { tokenA: tokens[0], tokenB: tokens[1] },
      { tokenA: tokens[0], tokenB: tokens[2] },
      { tokenA: tokens[1], tokenB: tokens[2] }
    ]
  );
});

test("buildVerifiedPoolEdges rejects duplicate token addresses", () => {
  const {
    buildVerifiedPoolEdges
  } = require("../scripts/utils/polygonBalancerDiscovery");

  const address = "0x0000000000000000000000000000000000000011";

  assert.throws(
    () =>
      buildVerifiedPoolEdges([
        { address, symbol: "AAA", decimals: 18 },
        { address: address.toUpperCase(), symbol: "DUP", decimals: 18 }
      ]),
    /duplicate token address/
  );
});
