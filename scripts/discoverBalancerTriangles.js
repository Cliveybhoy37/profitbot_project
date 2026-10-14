"use strict";

// Read-only Polygon triangular-arbitrage discovery.
// No signer, wallet, approvals, flashloan, or transaction submission.

require("dotenv").config();
const { ethers } = require("ethers");
const { getQuote } = require("./utils/polygonDiscoveryQuotes");
const { getBalancerQuote } = require("./utils/polygonBalancerQuotes");
const TOKENS = require("./utils/polygonScannerTokens");
const POOLS = require("./utils/polygonBalancerPools");

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

if (!selectedPool.poolId) {
  throw new Error(`Balancer pool ${poolKey} has no verified poolId`);
}

if (selectedPool.tokens.length !== 3) {
  throw new Error(
    `Balancer pool ${poolKey} must expose exactly 3 scanner tokens`
  );
}

const BALANCER_ASSETS =
  selectedPool.tokens.map(symbol => TOKENS[symbol].address);

const START_TOKEN = "USDC_E";

if (!selectedPool.tokens.includes(START_TOKEN)) {
  throw new Error(`${poolKey} does not contain ${START_TOKEN}`);
}

const OTHER_TOKENS =
  selectedPool.tokens.filter(symbol => symbol !== START_TOKEN);

async function quote(venue, tokenIn, tokenOut, amountIn, blockTag) {
  if (venue === "BALANCER_V2") {
    return getBalancerQuote({
      provider,
      poolId: selectedPool.poolId,
      assets: BALANCER_ASSETS,
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

async function testRoute(order, venues, startAmount, blockTag) {
  let amount = startAmount;
  const legs = [];

  for (let i = 0; i < 3; i++) {
    const from = order[i];
    const to = order[(i + 1) % 3];
    const venue = venues[i];

    try {
      const q = await quote(
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

async function scanDirection(order, startAmount, blockTag) {
  const results = [];

  for (const v1 of VENUES) {
    for (const v2 of VENUES) {
      for (const v3 of VENUES) {
        const result = await testRoute(
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

  const startAmount = ethers.utils.parseUnits(
    "10",
    TOKENS[START_TOKEN].decimals
  );

  console.log("Polygon snapshot block:", block);
  console.log("Balancer pool:", poolKey);
  console.log("Pool address:", selectedPool.address);
  console.log("Pool ID:", selectedPool.poolId);
  console.log("Tokens:", selectedPool.tokens.join(", "));
  console.log("Start: 10 USDC_E");
  console.log("Live execution: OFF\n");

  const directions = [
    [START_TOKEN, OTHER_TOKENS[0], OTHER_TOKENS[1]],
    [START_TOKEN, OTHER_TOKENS[1], OTHER_TOKENS[0]]
  ];

  let all = [];

  for (const order of directions) {
    console.log(
      "Scanning:",
      order.join(" -> "),
      "->",
      START_TOKEN
    );

    const results = await scanDirection(
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

  console.log("\nTOP 10 TRIANGULAR ROUTES\n");

  for (const r of all.slice(0, 10)) {
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
    "\nGross-positive routes:",
    profitable.length,
    "/",
    all.length
  );

  console.log(
    "WARNING: gross-positive does not include Aave premium, gas,",
    "slippage allowance, or execution compatibility."
  );
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
