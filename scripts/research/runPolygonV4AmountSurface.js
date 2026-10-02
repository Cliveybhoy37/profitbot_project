"use strict";

const { ethers } = require("ethers");

const {
  observeThreeLegEconomics
} = require(
  "../utils/polygonV4EconomicsObserver"
);

const {
  amountSurfaceEconomics
} = require(
  "../utils/polygonV4AmountSurface"
);

const {
  resolveAaveEconomics
} = require(
  "../utils/polygonAaveEconomics"
);

const {
  CHAIN_ID,
  WPOL,
  DAI,
  APEPE,
  POLICY_GAS_UNITS,
  SAFETY_RESERVE,
  MINIMUM_NET_PROFIT
} = require(
  "./runPolygonV4LiveQualification"
);

const {
  POOL_ID,
  POOL_KEY
} = require(
  "./runPolygonV4TargetedSweep"
);

const {
  SIZES
} = require(
  "./runPolygonV4TargetedFineSweep"
);

function exactAmounts() {
  return SIZES.map(display => ({
    display,
    amount:
      ethers.utils
        .parseEther(display)
        .toString()
  }));
}

function requireSnapshot({
  blockTag,
  gasPriceWei,
  premiumBps
}) {
  if (
    !Number.isSafeInteger(blockTag) ||
    blockTag <= 0
  ) {
    throw new Error(
      "blockTag must be a positive safe integer"
    );
  }

  const gasPrice =
    ethers.BigNumber.from(
      gasPriceWei
    );

  if (gasPrice.lte(0)) {
    throw new Error(
      "gasPriceWei must be positive"
    );
  }

  if (
    !Number.isSafeInteger(premiumBps) ||
    premiumBps < 0 ||
    premiumBps >= 10000
  ) {
    throw new Error(
      "premiumBps must be an integer from 0 to 9999"
    );
  }

  return {
    blockTag,
    gasPriceWei:
      gasPrice,
    premiumBps
  };
}

function economicRow({
  display,
  amount,
  observation,
  snapshot
}) {
  const base = {
    startDisplay:
      display,
    startAmount:
      amount,
    blockTag:
      snapshot.blockTag,
    status:
      observation.status,
    failedLeg:
      observation.failedLeg ??
      null,
    finalAmount:
      observation.amounts?.final ??
      null,
    grossDelta:
      observation.grossDelta ??
      null,
    protectedFinalOutput:
      null,
    protectionHaircut:
      null,
    premiumWei:
      null,
    protectedGasBudgetSigned:
      null,
    protectedGasBudgetWei:
      null,
    gasPriceCeilingWei:
      null,
    modeledGasCostWei:
      null,
    economicDeficitWei:
      null,
    gasCoveragePpm:
      null,
    qualifiesAtObservedGas:
      null
  };

  if (
    observation.status !==
      "QUOTE_OK" ||
    !observation.amounts?.final
  ) {
    return base;
  }

  const economics =
    amountSurfaceEconomics({
      amountIn:
        amount,
      finalAmount:
        observation.amounts.final,
      premiumBps:
        snapshot.premiumBps,
      gasPriceWei:
        snapshot.gasPriceWei
    });

  return {
    ...base,
    finalAmount:
      economics.finalAmount.toString(),
    grossDelta:
      economics.grossDelta.toString(),
    protectedFinalOutput:
      economics
        .protectedFinalOutput
        .toString(),
    protectionHaircut:
      economics
        .protectionHaircut
        .toString(),
    premiumWei:
      economics
        .premiumWei
        .toString(),
    protectedGasBudgetSigned:
      economics
        .protectedGasBudgetSigned
        .toString(),
    protectedGasBudgetWei:
      economics
        .protectedGasBudgetWei
        .toString(),
    gasPriceCeilingWei:
      economics
        .gasPriceCeilingWei
        .toString(),
    modeledGasCostWei:
      economics
        .modeledGasCostWei
        .toString(),
    economicDeficitWei:
      economics
        .economicDeficitWei
        .toString(),
    gasCoveragePpm:
      economics
        .gasCoveragePpm
        .toString(),
    qualifiesAtObservedGas:
      economics
        .qualifiesAtObservedGas
  };
}

function bestProtectedRow(rows) {
  const eligible =
    rows.filter(row =>
      row.status === "QUOTE_OK" &&
      row.protectedGasBudgetWei !== null
    );

  if (eligible.length === 0) {
    return null;
  }

  return eligible.reduce(
    (best, row) => {
      if (!best) {
        return row;
      }

      return (
        ethers.BigNumber
          .from(
            row.protectedGasBudgetWei
          )
          .gt(
            ethers.BigNumber.from(
              best.protectedGasBudgetWei
            )
          )
      )
        ? row
        : best;
    },
    null
  );
}

async function runAmountSurface({
  provider,
  blockTag,
  gasPriceWei,
  premiumBps,
  amounts = exactAmounts(),
  observeFn =
    observeThreeLegEconomics
}) {
  if (!provider) {
    throw new Error(
      "provider required"
    );
  }

  const snapshot =
    requireSnapshot({
      blockTag,
      gasPriceWei,
      premiumBps
    });

  const rows = [];

  for (
    const {
      display,
      amount
    } of amounts
  ) {
    const observation =
      await observeFn({
        provider,
        blockTag:
          snapshot.blockTag,
        startToken:
          WPOL,
        startAmount:
          amount,
        entryVenue:
          "UNISWAP_V3",
        entryToken:
          DAI,
        poolKey:
          POOL_KEY,
        zeroForOne:
          true,
        exitToken:
          APEPE,
        exitVenue:
          "UNISWAP_V3"
      });

    rows.push(
      economicRow({
        display,
        amount,
        observation,
        snapshot
      })
    );
  }

  return {
    snapshot: {
      blockTag:
        snapshot.blockTag,
      gasPriceWei:
        snapshot.gasPriceWei
          .toString(),
      premiumBps:
        snapshot.premiumBps,
      gasUnits:
        POLICY_GAS_UNITS
          .toString(),
      safetyReserveWei:
        SAFETY_RESERVE
          .toString(),
      minimumNetProfitWei:
        MINIMUM_NET_PROFIT
          .toString()
    },
    rows,
    bestProtected:
      bestProtectedRow(rows)
  };
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

  const network =
    await provider.getNetwork();

  if (
    network.chainId !==
    CHAIN_ID
  ) {
    throw new Error(
      `Wrong network: expected ` +
      `${CHAIN_ID}, got ` +
      `${network.chainId}`
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

  console.log(
    "===== POLYGON V4 AMOUNT SURFACE ====="
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
    "Shared gas price wei:",
    gasPriceWei.toString()
  );

  console.log(
    "Aave premium bps:",
    premiumBps
  );

  const result =
    await runAmountSurface({
      provider,
      blockTag,
      gasPriceWei,
      premiumBps
    });

  console.log();
  console.log(
    "===== PROTECTED ECONOMIC SURFACE ====="
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
      "BEST PROTECTED SIZE:",
      result.bestProtected
        .startDisplay,
      "WPOL"
    );

    console.log(
      "BEST PROTECTED GAS BUDGET:",
      result.bestProtected
        .protectedGasBudgetWei
    );

    console.log(
      "BEST GAS CEILING WEI:",
      result.bestProtected
        .gasPriceCeilingWei
    );

    console.log(
      "BEST ECONOMIC DEFICIT WEI:",
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
    "AMOUNT SURFACE COMPLETE"
  );
}

if (
  require.main === module
) {
  main().catch(error => {
    console.error(
      "AMOUNT_SURFACE_FAILED",
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
  exactAmounts,
  requireSnapshot,
  economicRow,
  bestProtectedRow,
  runAmountSurface
};
