"use strict";

const { ethers } = require("ethers");

const {
  observeThreeLegEconomics
} = require(
  "../utils/polygonV4EconomicsObserver"
);

const {
  buildObservedV4Candidate
} = require(
  "../utils/polygonV4ObservedCandidate"
);

const {
  buildV4ExecutionLegs,
  encodeV4ExecutionPlan
} = require(
  "../utils/polygonV4ExecutionRoute"
);

const {
  preflightObservedV4Candidate
} = require(
  "../utils/polygonV4CandidatePreflight"
);

const {
  resolveAaveEconomics
} = require(
  "../utils/polygonAaveEconomics"
);

const {
  POOL_ID,
  POOL_KEY
} = require(
  "./runPolygonV4TargetedSweep"
);

const CHAIN_ID = 137;

const WPOL =
  "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

const DAI =
  "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";

const APEPE =
  "0xA3f751662e282E83EC3cBc387d225Ca56dD63D3A";

const START =
  ethers.utils.parseEther("0.125");

const SLIPPAGE_BPS = 50;
const MAX_SLIPPAGE_BPS = 100;

// Historical measured execution was ~652k gas.
// This is intentionally a conservative qualification policy estimate,
// NOT a claim about current execution gas.
const POLICY_GAS_UNITS =
  ethers.BigNumber.from("700000");

const SAFETY_RESERVE =
  ethers.utils.parseEther("0.001");

const MINIMUM_NET_PROFIT =
  ethers.utils.parseEther("0.005");

const DEADLINE_SECONDS = 300;

async function qualifyLiveRoute({
  provider,
  blockTag = null,
  startAmount = START,
  entryVenue = "UNISWAP_V3",
  startToken = WPOL,
  entryToken = DAI,
  poolKey = POOL_KEY,
  zeroForOne = true,
  exitToken = APEPE,
  exitVenue = "UNISWAP_V3",
  poolId = POOL_ID,
  policySnapshot = null
}) {
  if (!provider) {
    throw new Error("provider required");
  }

  const network =
    await provider.getNetwork();

  if (network.chainId !== CHAIN_ID) {
    throw new Error(
      `Wrong network: expected ${CHAIN_ID}, got ${network.chainId}`
    );
  }

  const quoteBlock =
    blockTag ??
    await provider.getBlockNumber();

  const observation =
    await observeThreeLegEconomics({
      provider,
      blockTag:
        quoteBlock,
      startToken,
      startAmount:
        ethers.BigNumber
          .from(startAmount)
          .toString(),
      entryVenue,
      entryToken,
      poolKey,
      zeroForOne,
      exitToken,
      exitVenue
    });

  if (
    observation.status !==
    "QUOTE_OK"
  ) {
    return {
      liveReady: false,
      stage: "QUOTE",
      blockTag:
        quoteBlock,
      status:
        observation.status,
      failedLeg:
        observation.failedLeg ??
        null
    };
  }

  const candidate =
    buildObservedV4Candidate({
      observation,
      startToken,
      entryToken,
      exitToken
    });

  const executionLegs =
    buildV4ExecutionLegs(
      candidate.legs,
      SLIPPAGE_BPS
    );

  let currentBlock;
  let gasPriceWei;
  let premiumBps;

  if (policySnapshot) {
    if (
      !Number.isSafeInteger(
        policySnapshot.currentBlock
      ) ||
      policySnapshot.currentBlock <= 0
    ) {
      throw new Error(
        "Policy snapshot requires valid currentBlock"
      );
    }

    if (
      !ethers.BigNumber.isBigNumber(
        policySnapshot.gasPriceWei
      ) ||
      policySnapshot.gasPriceWei.lte(0)
    ) {
      throw new Error(
        "Policy snapshot requires positive gasPriceWei"
      );
    }

    if (
      !Number.isSafeInteger(
        policySnapshot.premiumBps
      ) ||
      policySnapshot.premiumBps < 0
    ) {
      throw new Error(
        "Policy snapshot requires valid premiumBps"
      );
    }

    currentBlock =
      policySnapshot.currentBlock;

    gasPriceWei =
      policySnapshot.gasPriceWei;

    premiumBps =
      policySnapshot.premiumBps;
  } else {
    const [
      observedCurrentBlock,
      observedGasPriceWei,
      aave
    ] =
      await Promise.all([
        provider.getBlockNumber(),
        provider.getGasPrice(),
        resolveAaveEconomics(
          provider,
          undefined,
          quoteBlock
        )
      ]);

    currentBlock =
      observedCurrentBlock;

    gasPriceWei =
      observedGasPriceWei;

    premiumBps =
      Number(
        aave.premiumBps
      );

    if (
      !Number.isSafeInteger(
        premiumBps
      )
    ) {
      throw new Error(
        "Aave premium does not fit safe integer"
      );
    }
  }

  let preflight;

  try {
    preflight =
      preflightObservedV4Candidate({
        candidate,
        executionLegs,
        requestedAmount:
          ethers.BigNumber.from(
            startAmount
          ),
        currentBlock,
        maxAgeBlocks:
          3,
        slippageBps:
          SLIPPAGE_BPS,
        maxSlippageBps:
          MAX_SLIPPAGE_BPS,
        premiumBps,
        estimatedGas:
          POLICY_GAS_UNITS,
        gasPriceWei,
        safetyReserveWei:
          SAFETY_RESERVE,
        minimumNetProfitWei:
          MINIMUM_NET_PROFIT
      });
  } catch (error) {
    return {
      liveReady: false,
      stage: "PREFLIGHT",
      blockTag:
        quoteBlock,
      currentBlock,
      observation,
      candidate,
      executionLegs,
      premiumBps,
      gasPriceWei,
      reason:
        error?.message ||
        "UNKNOWN_PREFLIGHT_FAILURE"
    };
  }

  const latestBlock =
    await provider.getBlock(
      currentBlock
    );

  if (!latestBlock) {
    throw new Error(
      "Current block unavailable"
    );
  }

  const deadline =
    latestBlock.timestamp +
    DEADLINE_SECONDS;

  const params =
    encodeV4ExecutionPlan({
      legs:
        executionLegs,
      deadline,
      minimumProfit:
        preflight.minimumNetProfit
    });

  return {
    liveReady: true,
    stage: "QUALIFIED",
    blockTag:
      quoteBlock,
    currentBlock,
    poolId,
    observation,
    candidate,
    executionLegs,
    premiumBps,
    gasPriceWei,
    policyGasUnits:
      POLICY_GAS_UNITS,
    preflight,
    deadline,
    params
  };
}

function formatEther(value) {
  return ethers.utils.formatEther(
    value
  );
}

async function main() {
  const rpc =
    process.env.INFURA_POLYGON;

  if (!rpc) {
    throw new Error(
      "INFURA_POLYGON is not set"
    );
  }

  const provider =
    new ethers.providers
      .JsonRpcProvider(
        rpc,
        CHAIN_ID
      );

  console.log(
    "===== POLYGON V4 LIVE QUALIFICATION ====="
  );

  console.log(
    "Mode: provider only / NO SIGNER / NO TRANSACTION"
  );

  console.log(
    "Route: WPOL -> DAI -> APEPE -> WPOL"
  );

  console.log(
    "Requested flashloan:",
    formatEther(START),
    "WPOL"
  );

  const result =
    await qualifyLiveRoute({
      provider
    });

  console.log(
    "Quote block:",
    result.blockTag
  );

  console.log(
    "Stage:",
    result.stage
  );

  if (!result.liveReady) {
    console.log(
      "LIVE_READY=false"
    );

    if (result.status) {
      console.log(
        "Quote status:",
        result.status
      );
    }

    if (result.failedLeg) {
      console.log(
        "Failed leg:",
        result.failedLeg
      );
    }

    if (result.reason) {
      console.log(
        "Preflight rejection:",
        result.reason
      );
    }

    return;
  }

  console.log(
    "Current block:",
    result.currentBlock
  );

  console.log(
    "Observation age:",
    result.preflight.ageBlocks,
    "blocks"
  );

  console.log(
    "Observed final WPOL:",
    formatEther(
      result.preflight
        .expectedFinalOutput
    )
  );

  console.log(
    "Protected final WPOL:",
    formatEther(
      result.preflight
        .protectedFinalOutput
    )
  );

  console.log(
    "Aave premium bps:",
    result.premiumBps
  );

  console.log(
    "Gas price gwei:",
    ethers.utils.formatUnits(
      result.gasPriceWei,
      "gwei"
    )
  );

  console.log(
    "Policy gas units:",
    result.policyGasUnits
      .toString()
  );

  console.log(
    "Expected net WPOL:",
    formatEther(
      result.preflight
        .expectedNetProfit
    )
  );

  console.log(
    "Worst-case net WPOL:",
    formatEther(
      result.preflight
        .worstCaseNetProfit
    )
  );

  console.log(
    "Minimum net WPOL:",
    formatEther(
      result.preflight
        .minimumNetProfit
    )
  );

  console.log(
    "Encoded plan bytes:",
    ethers.utils.arrayify(
      result.params
    ).length
  );

  console.log(
    "LIVE_READY=true"
  );

  console.log(
    "BROADCAST=false"
  );
}

if (require.main === module) {
  main().catch(error => {
    console.error(
      "LIVE_QUALIFICATION_FAILED",
      error?.code ||
        error?.name ||
        "UNKNOWN"
    );

    console.error(
      error?.message ||
        "Unknown failure"
    );

    process.exitCode = 1;
  });
}

module.exports = {
  CHAIN_ID,
  WPOL,
  DAI,
  APEPE,
  START,
  SLIPPAGE_BPS,
  MAX_SLIPPAGE_BPS,
  POLICY_GAS_UNITS,
  SAFETY_RESERVE,
  MINIMUM_NET_PROFIT,
  DEADLINE_SECONDS,
  qualifyLiveRoute
};
