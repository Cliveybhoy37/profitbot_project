"use strict";

// Read-only Polygon triangular-arbitrage discovery.
// No signer, wallet, approvals, flashloan, or transaction submission.

require("dotenv").config();
const { ethers } = require("ethers");
const { getQuote } = require("./utils/polygonDiscoveryQuotes");
const {
  getBalancerQuote,
  TRICRYPTO_POOL_ID
} = require("./utils/polygonBalancerQuotes");

const provider =
  new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_POLYGON);

const TOKENS = {
  USDC_E: {
    address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    decimals: 6
  },
  WETH: {
    address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    decimals: 18
  },
  WBTC: {
    address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
    decimals: 8
  }
};

const BALANCER_ASSETS = [
  TOKENS.WBTC.address,
  TOKENS.USDC_E.address,
  TOKENS.WETH.address
];

const VENUES = [
  "BALANCER_V2",
  "QUICKSWAP_V2",
  "SUSHISWAP_V2",
  "UNISWAP_V3"
];

async function quote(venue, tokenIn, tokenOut, amountIn, blockTag) {
  if (venue === "BALANCER_V2") {
    return getBalancerQuote({
      provider,
      poolId: TRICRYPTO_POOL_ID,
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
  const startAmount = ethers.utils.parseUnits("10", 6);

  console.log("Polygon snapshot block:", block);
  console.log("Start: 10 USDC_E");
  console.log("Live execution: OFF\n");

  const directions = [
    ["USDC_E", "WETH", "WBTC"],
    ["USDC_E", "WBTC", "WETH"]
  ];

  let all = [];

  for (const order of directions) {
    console.log("Scanning:", order.join(" -> "), "-> USDC_E");

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
      ethers.utils.formatUnits(r.finalAmount, 6),
      "USDC_E"
    );

    console.log(
      "Gross:",
      ethers.utils.formatUnits(r.grossDelta, 6),
      "USDC_E",
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
