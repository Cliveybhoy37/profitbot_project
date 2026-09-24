"use strict";

// Read-only Polygon triangular-arbitrage discovery.
// No signer, wallet, approvals, flashloan, or transaction submission.

require("dotenv").config();
const { ethers } = require("ethers");
const { getQuote } = require("./utils/polygonDiscoveryQuotes");
const { getBalancerQuote } = require("./utils/polygonBalancerQuotes");
const TOKENS = require("./utils/polygonScannerTokens");
const POOLS = require("./utils/polygonBalancerPools");
const {
  buildScanTarget
} = require("./utils/polygonBalancerScanTarget");
const {
  discoverVerifiedCandidates
} = require("./utils/polygonBalancerDiscovery");
const {
  buildVerifiedScanTargets
} = require("./utils/polygonBalancerTargetSelection");

const provider =
  new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_POLYGON);

const VENUES = [
  "BALANCER_V2",
  "QUICKSWAP_V2",
  "SUSHISWAP_V2",
  "UNISWAP_V3"
];

// Select with:
// BALANCER_POOL=TRICRYPTO node scripts/discoverBalancerTriangles.js
// BALANCER_POOL=BASE_POOL node scripts/discoverBalancerTriangles.js
const poolKey = process.env.BALANCER_POOL || "TRICRYPTO";
const selectedPool = POOLS[poolKey];

if (!selectedPool) {
  throw new Error(
    `Unknown BALANCER_POOL ${poolKey}. Available: ${Object.keys(POOLS).join(", ")}`
  );
}

const scanTarget = buildScanTarget({
  name: selectedPool.name,
  address: selectedPool.address,
  poolId: selectedPool.poolId,
  tokens: selectedPool.tokens,
  tokenRegistry: TOKENS,
  startToken: "USDC_E"
});

const BALANCER_ASSETS = scanTarget.assets;
const START_TOKEN = scanTarget.startToken;
const OTHER_TOKENS = scanTarget.otherTokens;

async function quote(
  scanTarget,
  venue,
  tokenIn,
  tokenOut,
  amountIn,
  blockTag
) {
  if (venue === "BALANCER_V2") {
    return getBalancerQuote({
      provider,
      poolId: scanTarget.poolId,
      assets: scanTarget.assets,
      tokenIn,
      tokenOut,
      amountIn,
      blockTag
    });
  }

  return getQuote(
    venue,
    [tokenIn, tokenOut],
    amountIn,
    provider,
    blockTag
  );
}

async function testRoute(scanTarget, order, venues, startAmount, blockTag) {
  let amount = startAmount;
  const legs = [];

  for (let i = 0; i < 3; i++) {
    const from = order[i];
    const to = order[(i + 1) % 3];
    const venue = venues[i];

    try {
      const q = await quote(
        scanTarget,
        venue,
        TOKENS[from].address,
        TOKENS[to].address,
        amount,
        blockTag
      );

      if (!q || !q.amountOut || q.amountOut.lte(0)) {
        return null;
      }

      legs.push({
        from,
        to,
        venue,
        amountIn: amount,
        amountOut: q.amountOut
      });

      amount = q.amountOut;
    } catch (_) {
      return null;
    }
  }

  return {
    order,
    venues,
    legs,
    finalAmount: amount,
    grossDelta: amount.sub(startAmount)
  };
}

async function scanDirection(scanTarget, order, startAmount, blockTag) {
  const results = [];

  for (const v1 of VENUES) {
    for (const v2 of VENUES) {
      for (const v3 of VENUES) {
        const result = await testRoute(
          scanTarget,
          order,
          [v1, v2, v3],
          startAmount,
          blockTag
        );

        if (result) results.push(result);
      }
    }
  }

  return results;
}

function bps(delta, startAmount) {
  return delta.mul(10000).div(startAmount).toString();
}

(async () => {
  if (!process.env.ALCHEMY_POLYGON) {
    throw new Error("ALCHEMY_POLYGON required");
  }

  const block = await provider.getBlockNumber();

  // Research notionals only. All sizes use the same pinned Polygon block.
  // Override without editing:
  // SCAN_SIZES=1,2,5,10,20,50 node scripts/discoverBalancerMultiSize.js
  const START_SIZES = (process.env.SCAN_SIZES || "10,100,1000")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);

  console.log("Polygon snapshot block:", block);
  console.log("Balancer pool:", poolKey);
  console.log("Pool address:", scanTarget.address);
  console.log("Pool ID:", scanTarget.poolId);
  console.log("Tokens:", scanTarget.tokens.join(", "));
  console.log("Research sizes:", START_SIZES.join(", "), START_TOKEN);
  console.log("Live execution: OFF\n");

  const directions = [
    [START_TOKEN, OTHER_TOKENS[0], OTHER_TOKENS[1]],
    [START_TOKEN, OTHER_TOKENS[1], OTHER_TOKENS[0]]
  ];

  for (const size of START_SIZES) {
    const startAmount = ethers.utils.parseUnits(
      size,
      TOKENS[START_TOKEN].decimals
    );

    console.log("\n========================================");
    console.log("START SIZE:", size, START_TOKEN);
    console.log("========================================");

    let all = [];

    for (const order of directions) {
      console.log(
        "Scanning:",
        order.join(" -> "),
        "->",
        START_TOKEN
      );

      const results = await scanDirection(
        scanTarget,
        order,
        startAmount,
        block
      );

      console.log("Completed routes:", results.length);
      all = all.concat(results);
    }

    all.sort((a, b) => {
      if (a.finalAmount.eq(b.finalAmount)) return 0;
      return a.finalAmount.gt(b.finalAmount) ? -1 : 1;
    });

    console.log("\nTOP 5 ROUTES FOR", size, START_TOKEN, "\n");

    for (const r of all.slice(0, 5)) {
      console.log(
        r.order[0],
        `-[${r.venues[0]}]->`,
        r.order[1],
        `-[${r.venues[1]}]->`,
        r.order[2],
        `-[${r.venues[2]}]->`,
        r.order[0]
      );

      console.log(
        "Final:",
        ethers.utils.formatUnits(
          r.finalAmount,
          TOKENS[START_TOKEN].decimals
        ),
        START_TOKEN
      );

      console.log(
        "Gross:",
        ethers.utils.formatUnits(
          r.grossDelta,
          TOKENS[START_TOKEN].decimals
        ),
        START_TOKEN,
        `(${bps(r.grossDelta, startAmount)} bps)`
      );

      console.log("---");
    }

    const profitable = all.filter(r => r.grossDelta.gt(0));

    console.log(
      "Gross-positive routes:",
      profitable.length,
      "/",
      all.length
    );
  }

  console.log(
    "\nWARNING: gross-positive does not include Aave premium, gas,",
    "slippage allowance, or execution compatibility."
  );

  console.log("Live execution: OFF");
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
