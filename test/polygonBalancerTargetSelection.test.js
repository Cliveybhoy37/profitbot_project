"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const TOKENS = require("../scripts/utils/polygonScannerTokens");
const {
  buildVerifiedScanTargets
} = require("../scripts/utils/polygonBalancerTargetSelection");

const POOL_ID =
  "0x48e971142cc52dc46ba513cbae7cd6ba394394ee0001000000000000000004e4";

function candidate(overrides = {}) {
  return {
    name: "Test Balancer Pool",
    address: "0x48e971142cc52dc46ba513cbae7cd6ba394394ee",
    type: "WEIGHTED",
    ...overrides
  };
}

function verification(overrides = {}) {
  return {
    poolId: POOL_ID,
    apiMatchesChain: true,
    triangles: [
      ["WBTC", "USDC_E", "WETH"],
      ["WBTC", "USDC_E", "DAI"],
      ["WBTC", "WETH", "DAI"],
      ["USDC_E", "WETH", "DAI"]
    ],
    ...overrides
  };
}

test("selects only verified triangles containing the start token", () => {
  const targets = buildVerifiedScanTargets({
    candidate: candidate(),
    verification: verification(),
    tokenRegistry: TOKENS
  });

  assert.equal(targets.length, 3);

  assert.deepEqual(
    targets.map(target => target.tokens),
    [
      ["WBTC", "USDC_E", "WETH"],
      ["WBTC", "USDC_E", "DAI"],
      ["USDC_E", "WETH", "DAI"]
    ]
  );
});

test("rejects candidate when API and Vault token sets did not match", () => {
  assert.throws(
    () =>
      buildVerifiedScanTargets({
        candidate: candidate(),
        verification: verification({
          apiMatchesChain: false
        }),
        tokenRegistry: TOKENS
      }),
    /failed API\/Vault verification/
  );
});

test("unsupported pool type produces no scan targets", () => {
  const targets = buildVerifiedScanTargets({
    candidate: candidate({ type: "UNKNOWN" }),
    verification: verification(),
    tokenRegistry: TOKENS
  });

  assert.deepEqual(targets, []);
});

test("pool with no start-token triangle produces no scan targets", () => {
  const targets = buildVerifiedScanTargets({
    candidate: candidate(),
    verification: verification({
      triangles: [
        ["WPOL", "WBTC", "WETH"],
        ["WPOL", "WBTC", "DAI"],
        ["WPOL", "WETH", "DAI"],
        ["WBTC", "WETH", "DAI"]
      ]
    }),
    tokenRegistry: TOKENS
  });

  assert.deepEqual(targets, []);
});

test("malformed verified triangle is rejected by scan-target validation", () => {
  assert.throws(
    () =>
      buildVerifiedScanTargets({
        candidate: candidate(),
        verification: verification({
          triangles: [
            ["USDC_E", "WETH", "WETH"]
          ]
        }),
        tokenRegistry: TOKENS
      }),
    /duplicate tokens/
  );
});

test("aligns verified balances to each selected triangle", () => {
  const balancesByAddress = {
    [TOKENS.WBTC.address.toLowerCase()]: 111,
    [TOKENS.USDC_E.address.toLowerCase()]: 222,
    [TOKENS.WETH.address.toLowerCase()]: 333,
    [TOKENS.DAI.address.toLowerCase()]: 444
  };

  const targets = buildVerifiedScanTargets({
    candidate: candidate(),
    verification: verification({ balancesByAddress }),
    tokenRegistry: TOKENS
  });

  assert.deepEqual(
    targets.map(target => target.balances),
    [
      [111, 222, 333],
      [111, 222, 444],
      [222, 333, 444]
    ]
  );

  assert.deepEqual(
    targets.map(target => target.poolType),
    ["WEIGHTED", "WEIGHTED", "WEIGHTED"]
  );

  assert.equal(
    targets.every(target => Object.isFrozen(target.balances)),
    true
  );
});
