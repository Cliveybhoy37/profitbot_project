"use strict";

// Read-only Polygon dynamic Balancer edge discovery.
// No signer, wallet, approvals, flashloan, or transaction submission.

require("dotenv").config();

const { ethers } = require("ethers");
const TOKENS = require("./utils/polygonScannerTokens");
const {
  resolveAaveEconomics
} = require("./utils/polygonAaveEconomics");
const {
  scanDynamicBalancerEdges,
  scanDynamicBalancerEdgesMultiSize
} = require("./utils/polygonBalancerDynamicEdgeScanner");
const {
  filterDynamicPoolResearchCandidates
} = require("./utils/polygonBalancerDiscovery");
const {
  collectUniqueEdgeTokens,
  collectExternalLiquidityEvidence,
  selectSupportedEdgeOrientations
} = require("./utils/polygonBalancerEdgeResearch");

const provider =
  new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_POLYGON);

function sortByGasBudgetDescending(candidates) {
  return [...candidates].sort((a, b) => {
    if (a.gasBudget.gt(b.gasBudget)) {
      return -1;
    }

    if (a.gasBudget.lt(b.gasBudget)) {
      return 1;
    }

    return 0;
  });
}

function formatGrossBps(candidate) {
  const scale = ethers.BigNumber.from(1000000);
  const scaledBps = candidate.grossDelta
    .mul(10000)
    .mul(scale)
    .div(candidate.amountIn);

  const whole = scaledBps.div(scale).toString();
  const fraction = scaledBps
    .mod(scale)
    .toString()
    .padStart(6, "0")
    .slice(0, 2);

  return `${whole}.${fraction}`;
}

(async () => {
  if (!process.env.ALCHEMY_POLYGON) {
    throw new Error("ALCHEMY_POLYGON required");
  }

  const block = process.env.SCAN_BLOCK
    ? Number(process.env.SCAN_BLOCK)
    : await provider.getBlockNumber();

  if (!Number.isInteger(block) || block <= 0) {
    throw new Error("Invalid SCAN_BLOCK");
  }

  const scanAmount = process.env.SCAN_AMOUNT || "10";
  const scanSizes = process.env.SCAN_SIZES
    ? process.env.SCAN_SIZES
        .split(",")
        .map(value => value.trim())
        .filter(Boolean)
    : null;

  const minimumLiquidity = Number(
    process.env.BALANCER_MIN_LIQUIDITY || "10000"
  );

  if (
    !Number.isFinite(minimumLiquidity) ||
    minimumLiquidity < 0
  ) {
    throw new Error("Invalid BALANCER_MIN_LIQUIDITY");
  }

  const amountIn = ethers.utils.parseUnits(
    scanAmount,
    TOKENS.USDC_E.decimals
  );

  if (amountIn.lte(0)) {
    throw new Error("SCAN_AMOUNT must be positive");
  }

  const amounts = scanSizes
    ? scanSizes.map(value => {
        const amount = ethers.utils.parseUnits(
          value,
          TOKENS.USDC_E.decimals
        );

        if (amount.lte(0)) {
          throw new Error("SCAN_SIZES values must be positive");
        }

        return amount;
      })
    : null;

  if (scanSizes && amounts.length === 0) {
    throw new Error("SCAN_SIZES must contain at least one size");
  }

  const evidenceAmountIn = ethers.utils.parseUnits(
    "10",
    TOKENS.USDC_E.decimals
  );

  const aave = await resolveAaveEconomics(
    provider,
    undefined,
    block
  );

  console.log("========================================");
  console.log("DYNAMIC BALANCER EDGE DISCOVERY");
  console.log("========================================");
  console.log("Polygon snapshot block:", block);
  console.log("Start token: USDC_E");
  if (scanSizes) {
    console.log(
      "Research sizes:",
      scanSizes.join(", "),
      "USDC_E"
    );
    console.log("Orientation evidence amount: 10 USDC_E");
  } else {
    console.log("Research amount:", scanAmount, "USDC_E");
  }
  console.log(
    "Minimum Balancer API liquidity:",
    minimumLiquidity
  );
  console.log("Aave flashloan premium:", aave.premiumBps.toString(), "bps");
  console.log("Live execution: OFF");
  console.log("");

  const scanOptions = {
    provider,
    blockTag: block,
    startToken: {
      symbol: "USDC_E",
      address: TOKENS.USDC_E.address,
      decimals: TOKENS.USDC_E.decimals
    },
    premiumBps: aave.premiumBps,
    collectTokens: collectUniqueEdgeTokens,
    collectEvidence: collectExternalLiquidityEvidence,
    selectOrientations: selectSupportedEdgeOrientations,
    candidateFilterFn: candidates =>
      filterDynamicPoolResearchCandidates(
        candidates,
        minimumLiquidity
      )
  };

  const scan = scanSizes
    ? await scanDynamicBalancerEdgesMultiSize({
        ...scanOptions,
        amounts,
        evidenceAmountIn
      })
    : await scanDynamicBalancerEdges({
        ...scanOptions,
        amountIn
      });

  const verifiedPools = scan.verified.filter(
    item => item.verification
  ).length;

  console.log("========================================");
  console.log("DISCOVERY SUMMARY");
  console.log("========================================");
  console.log("API pools:", scan.apiPoolCount);
  console.log("Dynamic pool candidates:", scan.candidateCount);
  console.log("On-chain verified pools:", verifiedPools);
  console.log("Verified Balancer edges:", scan.edgeTargets.length);
  console.log("Viable Balancer edges:", scan.viableEdgeCount);
  console.log("Viable edge orientations:", scan.viableOrientationCount);
  console.log(
    "Maximum venue combinations after pruning:",
    scan.viableOrientationCount * 9
  );
  let premiumCoveredCandidates;

  if (scanSizes) {
    console.log("");
    console.log("SIZE RESULTS");

    for (const result of scan.sizeResults) {
      console.log(
        ethers.utils.formatUnits(
          result.amountIn,
          TOKENS.USDC_E.decimals
        ),
        "USDC_E:",
        "quotes",
        result.candidates.length,
        "| gross-positive",
        result.positiveCandidates.length,
        "| premium-covered",
        result.premiumCoveredCandidates.length
      );
    }

    premiumCoveredCandidates = scan.sizeResults.flatMap(
      result => result.premiumCoveredCandidates
    );
  } else {
    console.log("Successful route quotes:", scan.candidates.length);
    console.log("Gross-positive routes:", scan.positiveCandidates.length);
    console.log(
      "Premium-covered routes:",
      scan.premiumCoveredCandidates.length
    );

    premiumCoveredCandidates = scan.premiumCoveredCandidates;
  }

  const grossPositiveCandidates = scanSizes
    ? scan.sizeResults.flatMap(
        result => result.positiveCandidates
      )
    : scan.positiveCandidates;

  if (grossPositiveCandidates.length > 0) {
    console.log("");
    console.log("========================================");
    console.log("GROSS-POSITIVE RESEARCH SIGNALS");
    console.log("========================================");

    for (const [index, candidate] of grossPositiveCandidates.entries()) {
      const cycle = candidate.cycle;

      console.log("");
      console.log(`#${index + 1}`);
      console.log("Pool:", cycle.poolName);
      console.log("Pool ID:", cycle.poolId);
      console.log(
        "Route:",
        cycle.legs
          .map(leg => leg.tokenIn.symbol || leg.tokenIn.address)
          .concat(
            cycle.legs[cycle.legs.length - 1].tokenOut.symbol ||
            cycle.legs[cycle.legs.length - 1].tokenOut.address
          )
          .join(" -> ")
      );
      console.log(
        "Venues:",
        candidate.entryVenue,
        "-> BALANCER_V2 ->",
        candidate.exitVenue
      );
      console.log(
        "Amount in:",
        ethers.utils.formatUnits(
          candidate.amountIn,
          TOKENS.USDC_E.decimals
        ),
        "USDC_E"
      );
      console.log(
        "Gross delta:",
        ethers.utils.formatUnits(
          candidate.grossDelta,
          TOKENS.USDC_E.decimals
        ),
        "USDC_E"
      );
      console.log(
        "Gross edge:",
        formatGrossBps(candidate),
        "bps"
      );
      console.log(
        "Flashloan fee:",
        ethers.utils.formatUnits(
          candidate.flashloanFee,
          TOKENS.USDC_E.decimals
        ),
        "USDC_E"
      );
      console.log(
        "Premium-adjusted budget:",
        ethers.utils.formatUnits(
          candidate.gasBudget,
          TOKENS.USDC_E.decimals
        ),
        "USDC_E"
      );
      console.log(
        "Covers premium:",
        candidate.coversFlashloanFee
      );
    }
  }

  if (premiumCoveredCandidates.length === 0) {
    console.log("");
    console.log(
      "No routes survived the Aave premium gate at this pinned block."
    );
    console.log("Live execution: OFF");
    return;
  }

  console.log("");
  console.log("========================================");
  console.log("PREMIUM-COVERED CANDIDATES");
  console.log("========================================");

  const survivors = sortByGasBudgetDescending(
    premiumCoveredCandidates
  );

  for (const [index, candidate] of survivors.entries()) {
    const cycle = candidate.cycle;
    const balancerLeg = cycle.legs[1];

    console.log("");
    console.log(`#${index + 1}`);
    console.log("Pool:", cycle.poolName);
    console.log("Pool type:", cycle.poolType);
    console.log("Pool ID:", cycle.poolId);
    console.log(
      "Route:",
      cycle.legs
        .map(leg => leg.tokenIn.symbol || leg.tokenIn.address)
        .concat(
          cycle.legs[cycle.legs.length - 1].tokenOut.symbol ||
          cycle.legs[cycle.legs.length - 1].tokenOut.address
        )
        .join(" -> ")
    );
    console.log(
      "Venues:",
      candidate.entryVenue,
      "-> BALANCER_V2 ->",
      candidate.exitVenue
    );
    console.log(
      "Balancer edge:",
      balancerLeg.tokenIn.address,
      "->",
      balancerLeg.tokenOut.address
    );
    console.log(
      "Amount in:",
      ethers.utils.formatUnits(
        candidate.amountIn,
        TOKENS.USDC_E.decimals
      ),
      "USDC_E"
    );
    console.log(
      "Amount out:",
      ethers.utils.formatUnits(
        candidate.amountOut,
        TOKENS.USDC_E.decimals
      ),
      "USDC_E"
    );
    console.log(
      "Gross delta:",
      ethers.utils.formatUnits(
        candidate.grossDelta,
        TOKENS.USDC_E.decimals
      ),
      "USDC_E"
    );
    console.log(
      "Flashloan fee:",
      ethers.utils.formatUnits(
        candidate.flashloanFee,
        TOKENS.USDC_E.decimals
      ),
      "USDC_E"
    );
    console.log(
      "Gas budget before gas:",
      ethers.utils.formatUnits(
        candidate.gasBudget,
        TOKENS.USDC_E.decimals
      ),
      "USDC_E"
    );
  }

  console.log("");
  console.log("Gas economics: NOT YET APPLIED");
  console.log("Exact ProfitBot simulation: NOT YET APPLIED");
  console.log("Live execution: OFF");
})().catch(error => {
  console.error("Dynamic Balancer edge discovery failed:");
  console.error(error.message);
  process.exitCode = 1;
});
