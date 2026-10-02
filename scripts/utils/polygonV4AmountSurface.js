"use strict";

const { ethers } = require("ethers");

const {
  SLIPPAGE_BPS,
  POLICY_GAS_UNITS,
  SAFETY_RESERVE,
  MINIMUM_NET_PROFIT
} = require(
  "../research/runPolygonV4LiveQualification"
);

function requireBigNumber(value, label) {
  let amount;

  try {
    amount =
      ethers.BigNumber.from(value);
  } catch (_) {
    throw new Error(
      `${label} must be an integer amount`
    );
  }

  return amount;
}

function requirePositiveBigNumber(
  value,
  label
) {
  const amount =
    requireBigNumber(value, label);

  if (amount.lte(0)) {
    throw new Error(
      `${label} must be positive`
    );
  }

  return amount;
}

function requireNonnegativeBigNumber(
  value,
  label
) {
  const amount =
    requireBigNumber(value, label);

  if (amount.lt(0)) {
    throw new Error(
      `${label} must be nonnegative`
    );
  }

  return amount;
}

function requireBps(value, label) {
  if (
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value >= 10000
  ) {
    throw new Error(
      `${label} must be an integer from 0 to 9999`
    );
  }

  return value;
}

function amountSurfaceEconomics({
  amountIn,
  finalAmount,
  premiumBps,
  gasPriceWei = null,
  slippageBps = SLIPPAGE_BPS,
  gasUnits = POLICY_GAS_UNITS,
  safetyReserveWei = SAFETY_RESERVE,
  minimumNetProfitWei =
    MINIMUM_NET_PROFIT
}) {
  const start =
    requirePositiveBigNumber(
      amountIn,
      "amountIn"
    );

  const final =
    requirePositiveBigNumber(
      finalAmount,
      "finalAmount"
    );

  const slippage =
    requireBps(
      slippageBps,
      "slippageBps"
    );

  const premiumRate =
    requireBps(
      premiumBps,
      "premiumBps"
    );

  const units =
    requirePositiveBigNumber(
      gasUnits,
      "gasUnits"
    );

  const reserve =
    requireNonnegativeBigNumber(
      safetyReserveWei,
      "safetyReserveWei"
    );

  const minimumProfit =
    requireNonnegativeBigNumber(
      minimumNetProfitWei,
      "minimumNetProfitWei"
    );

  const protectedFinalOutput =
    final
      .mul(10000 - slippage)
      .div(10000);

  const grossDelta =
    final.sub(start);

  const protectionHaircut =
    final.sub(
      protectedFinalOutput
    );

  const premium =
    start
      .mul(premiumRate)
      .div(10000);

  const fixedProtectedCosts =
    start
      .add(premium)
      .add(reserve)
      .add(minimumProfit);

  const protectedGasBudgetSigned =
    protectedFinalOutput.sub(
      fixedProtectedCosts
    );

  const protectedGasBudget =
    protectedGasBudgetSigned.gt(0)
      ? protectedGasBudgetSigned
      : ethers.constants.Zero;

  const gasPriceCeilingWei =
    protectedGasBudget.div(
      units
    );

  let modeledGasCostWei = null;
  let economicDeficitWei = null;
  let gasCoveragePpm = null;
  let qualifiesAtObservedGas = null;

  if (gasPriceWei !== null) {
    const gasPrice =
      requirePositiveBigNumber(
        gasPriceWei,
        "gasPriceWei"
      );

    modeledGasCostWei =
      gasPrice.mul(units);

    economicDeficitWei =
      modeledGasCostWei.gt(
        protectedGasBudget
      )
        ? modeledGasCostWei.sub(
            protectedGasBudget
          )
        : ethers.constants.Zero;

    gasCoveragePpm =
      modeledGasCostWei.isZero()
        ? null
        : protectedGasBudget
            .mul(1000000)
            .div(modeledGasCostWei);

    qualifiesAtObservedGas =
      protectedGasBudget.gte(
        modeledGasCostWei
      );
  }

  return {
    amountIn: start,
    finalAmount: final,
    grossDelta,
    slippageBps: slippage,
    protectedFinalOutput,
    protectionHaircut,
    premiumBps:
      premiumRate,
    premiumWei:
      premium,
    safetyReserveWei:
      reserve,
    minimumNetProfitWei:
      minimumProfit,
    gasUnits:
      units,
    protectedGasBudgetSigned,
    protectedGasBudgetWei:
      protectedGasBudget,
    gasPriceCeilingWei,
    modeledGasCostWei,
    economicDeficitWei,
    gasCoveragePpm,
    qualifiesAtObservedGas
  };
}

module.exports = {
  amountSurfaceEconomics
};
