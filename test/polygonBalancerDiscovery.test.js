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

test("buildVerifiedPoolEdgeTargets creates edges from arbitrary Vault-verified tokens", () => {
  const {
    buildVerifiedPoolEdgeTargets
  } = require("../scripts/utils/polygonBalancerDiscovery");

  const tokens = [
    { address: "0x0000000000000000000000000000000000000011", symbol: "AAA", decimals: 18 },
    { address: "0x0000000000000000000000000000000000000022", symbol: "BBB", decimals: 6 },
    { address: "0x0000000000000000000000000000000000000033", symbol: "CCC", decimals: 8 }
  ];

  const verification = {
    poolId: "0xpool",
    apiMatchesChain: true,
    verifiedPoolTokens: tokens,
    poolAssets: tokens.map(token => token.address),
    balancesByAddress: {
      [tokens[0].address.toLowerCase()]: "100",
      [tokens[1].address.toLowerCase()]: "200",
      [tokens[2].address.toLowerCase()]: "300"
    }
  };

  const targets = buildVerifiedPoolEdgeTargets({
    pool: {
      address: "0x0000000000000000000000000000000000000099",
      name: "Research Pool",
      type: "WEIGHTED",
      liquidity: "12345"
    },
    verification
  });

  assert.equal(targets.length, 3);
  assert.equal(targets[0].poolId, "0xpool");
  assert.deepEqual(targets[0].poolAssets, verification.poolAssets);
  assert.equal(targets[0].tokenA.symbol, "AAA");
  assert.equal(targets[0].tokenB.symbol, "BBB");
});

test("buildVerifiedPoolEdgeTargets rejects API/Vault token mismatch", () => {
  const {
    buildVerifiedPoolEdgeTargets
  } = require("../scripts/utils/polygonBalancerDiscovery");

  assert.deepEqual(
    buildVerifiedPoolEdgeTargets({
      pool: {
        address: "0x0000000000000000000000000000000000000099",
        name: "Mismatch Pool",
        type: "WEIGHTED",
        liquidity: "12345"
      },
      verification: {
        poolId: "0xpool",
        apiMatchesChain: false,
        verifiedPoolTokens: [],
        poolAssets: [],
        balancesByAddress: {}
      }
    }),
    []
  );
});

test("selectDynamicPoolCandidates accepts protocol-v2 pools with arbitrary token pairs", () => {
  const {
    selectDynamicPoolCandidates
  } = require("../scripts/utils/polygonBalancerDiscovery");

  const pools = [
    {
      address: "0x0000000000000000000000000000000000000099",
      protocolVersion: 2,
      poolTokens: [
        { address: "0x0000000000000000000000000000000000000011" },
        { address: "0x0000000000000000000000000000000000000022" }
      ]
    }
  ];

  assert.deepEqual(selectDynamicPoolCandidates(pools), pools);
});

test("selectDynamicPoolCandidates rejects non-v2 and malformed token sets", () => {
  const {
    selectDynamicPoolCandidates
  } = require("../scripts/utils/polygonBalancerDiscovery");

  const validTokens = [
    { address: "0x0000000000000000000000000000000000000011" },
    { address: "0x0000000000000000000000000000000000000022" }
  ];

  const pools = [
    {
      address: "0x0000000000000000000000000000000000000091",
      protocolVersion: 3,
      poolTokens: validTokens
    },
    {
      address: "0x0000000000000000000000000000000000000092",
      protocolVersion: 2,
      poolTokens: [validTokens[0]]
    },
    {
      address: "0x0000000000000000000000000000000000000093",
      protocolVersion: 2,
      poolTokens: [validTokens[0], validTokens[0]]
    }
  ];

  assert.deepEqual(selectDynamicPoolCandidates(pools), []);
});

test("buildVerifiedPoolEdgeTargets uses Balancer dynamicData totalLiquidity", () => {
  const {
    buildVerifiedPoolEdgeTargets
  } = require("../scripts/utils/polygonBalancerDiscovery");

  const tokenA = {
    address: "0x0000000000000000000000000000000000000011",
    symbol: "AAA",
    decimals: 18
  };

  const tokenB = {
    address: "0x0000000000000000000000000000000000000022",
    symbol: "BBB",
    decimals: 6
  };

  const targets = buildVerifiedPoolEdgeTargets({
    pool: {
      address: "0x0000000000000000000000000000000000000099",
      name: "Dynamic Pool",
      type: "WEIGHTED",
      dynamicData: {
        totalLiquidity: "12345.67"
      }
    },
    verification: {
      apiMatchesChain: true,
      poolId: "0xpool",
      verifiedPoolTokens: [tokenA, tokenB],
      poolAssets: [tokenA.address, tokenB.address],
      balancesByAddress: {}
    }
  });

  assert.equal(targets.length, 1);
  assert.equal(targets[0].liquidity, "12345.67");
});

test("buildDynamicVerifiedEdgeTargets emits edges only from chain-matched pools", () => {
  const {
    buildDynamicVerifiedEdgeTargets
  } = require("../scripts/utils/polygonBalancerDiscovery");

  const tokenA = {
    address: "0x0000000000000000000000000000000000000011",
    symbol: "AAA",
    decimals: 18
  };

  const tokenB = {
    address: "0x0000000000000000000000000000000000000022",
    symbol: "BBB",
    decimals: 6
  };

  const verified = [
    {
      candidate: {
        address: "0x0000000000000000000000000000000000000091",
        name: "Verified Pool",
        type: "WEIGHTED",
        dynamicData: { totalLiquidity: "50000" }
      },
      verification: {
        apiMatchesChain: true,
        poolId: "0xverified",
        verifiedPoolTokens: [tokenA, tokenB],
        poolAssets: [tokenA.address, tokenB.address],
        balancesByAddress: {}
      }
    },
    {
      candidate: {
        address: "0x0000000000000000000000000000000000000092",
        name: "Mismatch Pool",
        type: "WEIGHTED",
        dynamicData: { totalLiquidity: "90000" }
      },
      verification: {
        apiMatchesChain: false,
        poolId: "0xmismatch",
        verifiedPoolTokens: [],
        poolAssets: [tokenA.address, tokenB.address],
        balancesByAddress: {}
      }
    }
  ];

  const targets = buildDynamicVerifiedEdgeTargets(verified);

  assert.equal(targets.length, 1);
  assert.equal(targets[0].poolName, "Verified Pool");
  assert.equal(targets[0].liquidity, "50000");
  assert.equal(targets[0].tokenA.address, tokenA.address);
  assert.equal(targets[0].tokenB.address, tokenB.address);
});
