"use strict";

// Read-only Polygon triangular-arbitrage discovery.
// No signer, wallet, approvals, flashloan, or transaction submission.

require("dotenv").config();
const { ethers } = require("ethers");
const {
  medianEffectiveGasPriceWei
} = require("./utils/polygonGasEconomics");
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
const {
  resolveAaveEconomics,
  readTokenPrices,
  calculateMaxAffordableGasUnits,
  calculateGasCostInToken
} = require("./utils/polygonAaveEconomics");
const {
  flashloanAdjustedResearchEconomics
} = require("./utils/polygonNetEconomics");
const {
  findMeasuredExecutionGas
} = require("./utils/polygonExecutionGas");

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

async function resolveResearchGasPriceWei(block) {
  if (process.env.SCAN_GAS_PRICE_GWEI) {
    return {
      gasPriceWei: ethers.utils.parseUnits(
        process.env.SCAN_GAS_PRICE_GWEI,
        "gwei"
      ).toBigInt(),
      source: "explicit SCAN_GAS_PRICE_GWEI"
    };
  }

  if (process.env.SCAN_BLOCK) {
    const historicalBlock = await provider.getBlockWithTransactions(block);
    const gasPricesWei = historicalBlock.transactions.map((tx) => {
      if (!tx.gasPrice) {
        throw new Error("Historical transaction missing effective gas price");
      }

      return tx.gasPrice.toBigInt();
    });

    return {
      gasPriceWei: medianEffectiveGasPriceWei(gasPricesWei),
      source: "pinned-block upper-middle effective gas price"
    };
  }

  const feeData = await provider.getFeeData();

  if (!feeData.maxFeePerGas) {
    throw new Error("Missing max fee per gas");
  }

  return {
    gasPriceWei: feeData.maxFeePerGas.toBigInt(),
    source: "live provider maxFeePerGas"
  };
}

const quoteCache = new Map();

function quoteCacheKey(
  scanTarget,
  venue,
  tokenIn,
  tokenOut,
  amountIn,
  blockTag
) {
  const poolScope =
    venue === "BALANCER_V2"
      ? scanTarget.poolId
      : "GLOBAL";

  return [
    blockTag,
    poolScope,
    venue,
    tokenIn.toLowerCase(),
    tokenOut.toLowerCase(),
    amountIn.toString()
  ].join(":");
}

async function quote(
  scanTarget,
  venue,
  tokenIn,
  tokenOut,
  amountIn,
  blockTag
) {
  const key = quoteCacheKey(
    scanTarget,
    venue,
    tokenIn,
    tokenOut,
    amountIn,
    blockTag
  );

  if (quoteCache.has(key)) {
    return quoteCache.get(key);
  }

  let result;

  if (venue === "BALANCER_V2") {
    result = await getBalancerQuote({
      provider,
      poolId: scanTarget.poolId,
      assets: scanTarget.assets,
      tokenIn,
      tokenOut,
      amountIn,
      blockTag,
      poolType: scanTarget.poolType,
      balances: scanTarget.balances
    });
  } else {
    result = await getQuote(
      venue,
      [tokenIn, tokenOut],
      amountIn,
      provider,
      blockTag
    );
  }

  quoteCache.set(key, result);
  return result;
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
        amountOut: q.amountOut,
        type: q.type || null,
        fee: q.fee ?? null,
        pool: q.pool || null,
        poolId: q.poolId || null
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

async function scanTargetAtBlock(
  target,
  startSizes,
  blockTag,
  researchGasContext
) {
  const {
    premiumBps,
    maxFeePerGasWei,
    nativePrice,
    tokenPrice
  } = researchGasContext;

  const startToken = target.startToken;
  const otherTokens = target.otherTokens;

  console.log("\n========================================");
  console.log("Balancer target:", target.name);
  console.log("Pool address:", target.address);
  console.log("Pool ID:", target.poolId);
  console.log("Tokens:", target.tokens.join(", "));
  console.log("========================================");

  const directions = [
    [startToken, otherTokens[0], otherTokens[1]],
    [startToken, otherTokens[1], otherTokens[0]]
  ];

  const summaries = [];

  for (const size of startSizes) {
    const startAmount = ethers.utils.parseUnits(
      size,
      TOKENS[startToken].decimals
    );

    console.log("\nSTART SIZE:", size, startToken);

    let all = [];

    for (const order of directions) {
      console.log(
        "Scanning:",
        order.join(" -> "),
        "->",
        startToken
      );

      const results = await scanDirection(
        target,
        order,
        startAmount,
        blockTag
      );

      console.log("Completed routes:", results.length);
      all = all.concat(results);
    }

    all.sort((a, b) => {
      if (a.finalAmount.eq(b.finalAmount)) return 0;
      return a.finalAmount.gt(b.finalAmount) ? -1 : 1;
    });

    for (const result of all) {
      result.researchEconomics = flashloanAdjustedResearchEconomics({
        startAmount: BigInt(startAmount.toString()),
        finalAmount: BigInt(result.finalAmount.toString()),
        premiumBps
      });

      result.researchEconomics.maxAffordableGasUnits =
        result.researchEconomics.gasBudget > 0n
          ? calculateMaxAffordableGasUnits({
              tokenBudget: result.researchEconomics.gasBudget,
              maxFeePerGasWei,
              nativePrice,
              tokenPrice,
              tokenDecimals: TOKENS[startToken].decimals
            })
          : 0n;

      const measuredGas = findMeasuredExecutionGas(
        result,
        BigInt(startAmount.toString())
      );

      result.researchEconomics.executionGas = measuredGas
        ? {
            gasUnits: measuredGas.gasUnits,
            source: measuredGas.source,
            gasCost: calculateGasCostInToken({
              gasUnits: measuredGas.gasUnits,
              maxFeePerGasWei,
              nativePrice,
              tokenPrice,
              tokenDecimals: TOKENS[startToken].decimals
            })
          }
        : null;

      if (result.researchEconomics.executionGas) {
        const executionGas = result.researchEconomics.executionGas;

        executionGas.remainingBudget =
          result.researchEconomics.gasBudget - executionGas.gasCost;
        executionGas.affordable = executionGas.remainingBudget >= 0n;
      }
    }

    console.log("\nTOP 5 ROUTES FOR", size, startToken, "\n");

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
          TOKENS[startToken].decimals
        ),
        startToken
      );

      console.log(
        "Gross:",
        ethers.utils.formatUnits(
          r.grossDelta,
          TOKENS[startToken].decimals
        ),
        startToken,
        `(${bps(r.grossDelta, startAmount)} bps)`
      );

      console.log(
        "Aave premium:",
        ethers.utils.formatUnits(
          r.researchEconomics.flashloanFee.toString(),
          TOKENS[startToken].decimals
        ),
        startToken
      );

      console.log(
        "Gas/cost budget after premium:",
        ethers.utils.formatUnits(
          r.researchEconomics.gasBudget.toString(),
          TOKENS[startToken].decimals
        ),
        startToken,
        "| covers premium:",
        r.researchEconomics.coversFlashloanFee
      );

      console.log(
        "Break-even gas capacity:",
        r.researchEconomics.maxAffordableGasUnits.toString(),
        "gas units"
      );

      if (r.researchEconomics.executionGas) {
        const executionGas = r.researchEconomics.executionGas;

        console.log(
          "Measured execution gas:",
          executionGas.gasUnits.toString(),
          "gas units",
          "| source:",
          executionGas.source
        );

        console.log(
          "Measured execution gas cost:",
          ethers.utils.formatUnits(
            executionGas.gasCost.toString(),
            TOKENS[startToken].decimals
          ),
          startToken,
          "| remaining after gas:",
          ethers.utils.formatUnits(
            executionGas.remainingBudget.toString(),
            TOKENS[startToken].decimals
          ),
          startToken,
          "| affordable:",
          executionGas.affordable
        );
      } else {
        console.log("Execution gas evidence: unavailable");
      }

      console.log("---");
    }

    const profitable = all.filter(r => r.grossDelta.gt(0));
    const premiumCovering = all.filter(
      r => r.researchEconomics.coversFlashloanFee
    );
    const premiumCoveringBalancer = premiumCovering.filter(
      r => r.venues.includes("BALANCER_V2")
    );

    console.log(
      "Gross-positive routes:",
      profitable.length,
      "/",
      all.length
    );

    console.log(
      "Premium-covering routes:",
      premiumCovering.length,
      "/",
      all.length
    );

    console.log(
      "Premium-covering Balancer routes:",
      premiumCoveringBalancer.length,
      "/",
      all.length
    );

    const best = all[0] || null;

    summaries.push({
      targetName: target.name,
      poolId: target.poolId,
      tokens: target.tokens,
      size,
      startToken,
      completedRoutes: all.length,
      grossPositiveRoutes: profitable.length,
      premiumCoveringRoutes: premiumCovering.length,
      premiumCoveringBalancerRoutes: premiumCoveringBalancer.length,
      bestGrossBps: best
        ? bps(best.grossDelta, startAmount)
        : null,
      bestRoute: best
        ? {
            order: best.order,
            venues: best.venues
          }
        : null
    });
  }

  return summaries;
}

async function discoverDynamicScanTargets(blockTag) {
  const discovery = await discoverVerifiedCandidates({
    provider,
    blockTag
  });

  const targets = [];
  const seen = new Set();

  for (const item of discovery.verified) {
    if (!item.verification) {
      console.log(
        "Skipping unverified candidate:",
        item.candidate.name,
        "-",
        item.error || "verification failed"
      );
      continue;
    }

    const verifiedTargets = buildVerifiedScanTargets({
      candidate: item.candidate,
      verification: item.verification,
      tokenRegistry: TOKENS,
      startToken: "USDC_E"
    });

    for (const target of verifiedTargets) {
      const key = `${target.poolId}:${target.tokens.join(",")}`;

      if (seen.has(key)) continue;

      seen.add(key);
      targets.push(target);
    }
  }

  return {
    ...discovery,
    targets
  };
}

(async () => {
  if (!process.env.ALCHEMY_POLYGON) {
    throw new Error("ALCHEMY_POLYGON required");
  }

  const block = process.env.SCAN_BLOCK
    ? Number(process.env.SCAN_BLOCK)
    : await provider.getBlockNumber();
  const aave = await resolveAaveEconomics(provider, undefined, block);
  const [gasPrice, prices] = await Promise.all([
    resolveResearchGasPriceWei(block),
    readTokenPrices({
      provider,
      oracleAddress: aave.oracleAddress,
      nativeToken: TOKENS.WPOL.address,
      token: TOKENS.USDC_E.address,
      blockTag: block
    })
  ]);

  if (gasPrice.gasPriceWei <= 0n) {
    throw new Error("Invalid research gas price");
  }

  if (prices.nativePrice === 0n || prices.tokenPrice === 0n) {
    throw new Error("Missing Aave oracle price");
  }

  // Research notionals only. All sizes use the same pinned Polygon block.
  // Override without editing:
  // SCAN_SIZES=1,2,5,10,20,50 node scripts/discoverBalancerMultiSize.js
  const START_SIZES = (process.env.SCAN_SIZES || "10,100,1000")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);

  const dynamicMode = process.env.BALANCER_DYNAMIC === "true";

  console.log("Polygon snapshot block:", block);
  console.log("Research gas price source:", gasPrice.source);
  console.log(
    "Research gas price:",
    ethers.utils.formatUnits(gasPrice.gasPriceWei, "gwei"),
    "gwei"
  );
  console.log(
    "Balancer scan mode:",
    dynamicMode ? "DYNAMIC VERIFIED" : "CURATED"
  );
  console.log("Research sizes:", START_SIZES.join(", "), "USDC_E");
  console.log("Live execution: OFF");

  let scanTargets;

  if (dynamicMode) {
    const discovery = await discoverDynamicScanTargets(block);

    console.log("API pools:", discovery.apiPoolCount);
    console.log("Discovery candidates:", discovery.candidateCount);
    console.log("Verified scan targets:", discovery.targets.length);

    scanTargets = discovery.targets;

    const dynamicLimit = Number(
      process.env.BALANCER_DYNAMIC_LIMIT || 0
    );

    if (dynamicLimit > 0) {
      scanTargets = scanTargets.slice(0, dynamicLimit);
      console.log("Dynamic research limit:", dynamicLimit);
    }

    if (scanTargets.length === 0) {
      console.log("No verified dynamic scan targets found.");
    }
  } else {
    scanTargets = [scanTarget];
  }

  const scanSummaries = [];

  for (const target of scanTargets) {
    const summaries = await scanTargetAtBlock(
      target,
      START_SIZES,
      block,
      {
        premiumBps: aave.premiumBps,
        maxFeePerGasWei: gasPrice.gasPriceWei,
        nativePrice: prices.nativePrice,
        tokenPrice: prices.tokenPrice
      }
    );

    scanSummaries.push(...summaries);
  }

  console.log("\n========================================");
  console.log("CROSS-TARGET SUMMARY");
  console.log("========================================");

  for (const summary of scanSummaries) {
    console.log(
      summary.targetName,
      "|",
      summary.tokens.join("/"),
      "| size",
      summary.size,
      summary.startToken,
      "| best",
      summary.bestGrossBps === null
        ? "N/A"
        : `${summary.bestGrossBps} bps`,
      "| gross-positive",
      `${summary.grossPositiveRoutes}/${summary.completedRoutes}`,
      "| premium-covering",
      `${summary.premiumCoveringRoutes}/${summary.completedRoutes}`,
      "| premium-covering-balancer",
      `${summary.premiumCoveringBalancerRoutes}/${summary.completedRoutes}`
    );
  }

  console.log(
    "\nWARNING: break-even gas capacity is research-only and is not",
    "an execution gas estimate. It does not establish profitability",
    "after actual gas, slippage allowance, or execution compatibility."
  );

  console.log("Live execution: OFF");
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
