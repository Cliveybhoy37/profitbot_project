"use strict";

const { ethers } = require("ethers");

const {
  runProtectedFineSurface
} = require(
  "./runPolygonV4ProtectedFineSurface"
);

const {
  resolveAaveEconomics
} = require(
  "../utils/polygonAaveEconomics"
);

const {
  CHAIN_ID
} = require(
  "./runPolygonV4LiveQualification"
);

const {
  POOL_ID
} = require(
  "./runPolygonV4TargetedSweep"
);

const MICRO_START_WEI =
  ethers.utils.parseEther("0.1210");

const MICRO_END_WEI =
  ethers.utils.parseEther("0.1250");

const MICRO_STEP_WEI =
  ethers.utils.parseEther("0.0001");

function microProtectedAmounts({
  startWei = MICRO_START_WEI,
  endWei = MICRO_END_WEI,
  stepWei = MICRO_STEP_WEI
} = {}) {
  const start =
    ethers.BigNumber.from(startWei);

  const end =
    ethers.BigNumber.from(endWei);

  const step =
    ethers.BigNumber.from(stepWei);

  if (start.lte(0)) {
    throw new Error(
      "startWei must be positive"
    );
  }

  if (end.lt(start)) {
    throw new Error(
      "endWei must be greater than or equal to startWei"
    );
  }

  if (step.lte(0)) {
    throw new Error(
      "stepWei must be positive"
    );
  }

  const amounts = [];

  for (
    let amount = start;
    amount.lte(end);
    amount = amount.add(step)
  ) {
    amounts.push({
      display:
        ethers.utils.formatEther(amount),
      amount:
        amount.toString()
    });
  }

  return amounts;
}

async function runProtectedMicroSurface({
  provider,
  blockTag,
  gasPriceWei,
  premiumBps,
  amounts = microProtectedAmounts(),
  runFineSurfaceFn = runProtectedFineSurface
}) {
  return runFineSurfaceFn({
    provider,
    blockTag,
    gasPriceWei,
    premiumBps,
    amounts
  });
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
    new ethers.providers.JsonRpcProvider(
      rpc,
      CHAIN_ID
    );

  const network =
    await provider.getNetwork();

  if (network.chainId !== CHAIN_ID) {
    throw new Error(
      `Wrong network: expected ${CHAIN_ID}, got ${network.chainId}`
    );
  }

  const blockTag =
    await provider.getBlockNumber();

  const [
    gasPriceWei,
    aave
  ] =
    await Promise.all([
      provider.getGasPrice(),
      resolveAaveEconomics(
        provider,
        undefined,
        blockTag
      )
    ]);

  const premiumBps =
    Number(aave.premiumBps);

  if (
    !Number.isSafeInteger(premiumBps) ||
    premiumBps < 0 ||
    premiumBps >= 10000
  ) {
    throw new Error(
      "Aave premium does not fit valid basis points"
    );
  }

  const amounts =
    microProtectedAmounts();

  console.log(
    "===== POLYGON V4 PROTECTED MICRO SURFACE ====="
  );

  console.log(
    "Provider-only research."
  );

  console.log(
    "No signer. No transaction. No broadcast."
  );

  console.log(
    "Pinned quote block:",
    blockTag
  );

  console.log(
    "PoolId:",
    POOL_ID
  );

  console.log(
    "Route: WPOL -> DAI -> APEPE -> WPOL"
  );

  console.log(
    "Micro range:",
    amounts[0].display,
    "through",
    amounts[amounts.length - 1].display,
    "WPOL"
  );

  console.log(
    "Micro step: 0.0001 WPOL"
  );

  console.log(
    "Samples:",
    amounts.length
  );

  console.log(
    "Shared gas price wei:",
    gasPriceWei.toString()
  );

  console.log(
    "Aave premium bps:",
    premiumBps
  );

  const result =
    await runProtectedMicroSurface({
      provider,
      blockTag,
      gasPriceWei,
      premiumBps,
      amounts
    });

  console.log();
  console.log(
    "===== PROTECTED MICRO ECONOMIC SURFACE ====="
  );

  console.table(
    result.rows.map(row => ({
      WPOL:
        row.startDisplay,
      status:
        row.status,
      grossDelta:
        row.grossDelta,
      protectedGasBudget:
        row.protectedGasBudgetWei,
      gasCeilingWei:
        row.gasPriceCeilingWei,
      gasCoveragePpm:
        row.gasCoveragePpm,
      deficitWei:
        row.economicDeficitWei,
      observedGasQualifies:
        row.qualifiesAtObservedGas
    }))
  );

  console.log();

  if (result.bestProtected) {
    console.log(
      "BEST MICRO PROTECTED SIZE:",
      result.bestProtected.startDisplay,
      "WPOL"
    );

    console.log(
      "BEST MICRO PROTECTED GAS BUDGET:",
      result.bestProtected
        .protectedGasBudgetWei
    );

    console.log(
      "BEST MICRO GAS CEILING WEI:",
      result.bestProtected
        .gasPriceCeilingWei
    );

    console.log(
      "BEST MICRO ECONOMIC DEFICIT WEI:",
      result.bestProtected
        .economicDeficitWei
    );

    console.log(
      "QUALIFIES AT OBSERVED GAS:",
      result.bestProtected
        .qualifiesAtObservedGas
    );
  }

  console.log();
  console.log(
    "PROTECTED MICRO SURFACE COMPLETE"
  );
}

if (require.main === module) {
  main().catch(error => {
    console.error(
      "PROTECTED_MICRO_SURFACE_FAILED",
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
  MICRO_START_WEI,
  MICRO_END_WEI,
  MICRO_STEP_WEI,
  microProtectedAmounts,
  runProtectedMicroSurface
};
