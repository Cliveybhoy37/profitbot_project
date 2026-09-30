"use strict";

const { ethers } = require("ethers");

function requireBigNumber(value, label) {
  if (!ethers.BigNumber.isBigNumber(value)) {
    throw new Error(
      `${label} must be a BigNumber`
    );
  }

  return value;
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

function requireNonnegativeInteger(
  value,
  label
) {
  if (
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new Error(
      `${label} must be a nonnegative safe integer`
    );
  }

  return value;
}

function requirePositiveInteger(
  value,
  label
) {
  if (
    !Number.isSafeInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `${label} must be a positive safe integer`
    );
  }

  return value;
}

function preflightObservedV4Candidate({
  candidate,
  requestedAmount,
  currentBlock,
  maxAgeBlocks,
  slippageBps,
  maxSlippageBps,
  premiumBps,
  estimatedGas,
  gasPriceWei,
  safetyReserveWei,
  minimumNetProfitWei
}) {
  if (
    !candidate ||
    typeof candidate !== "object"
  ) {
    throw new Error(
      "Preflight requires candidate"
    );
  }

  const observationBlock =
    requirePositiveInteger(
      candidate.blockTag,
      "Candidate blockTag"
    );

  const amountIn =
    requirePositiveBigNumber(
      candidate.amountIn,
      "Candidate amountIn"
    );

  const requested =
    requirePositiveBigNumber(
      requestedAmount,
      "Requested amount"
    );

  if (!amountIn.eq(requested)) {
    throw new Error(
      "Candidate amount does not match requested flashloan"
    );
  }

  const head =
    requirePositiveInteger(
      currentBlock,
      "Current block"
    );

  const maxAge =
    requireNonnegativeInteger(
      maxAgeBlocks,
      "maxAgeBlocks"
    );

  if (observationBlock > head) {
    throw new Error(
      "Candidate observation block is in the future"
    );
  }

  const ageBlocks =
    head - observationBlock;

  if (ageBlocks > maxAge) {
    throw new Error(
      "Candidate observation is stale"
    );
  }

  const slippage =
    requirePositiveInteger(
      slippageBps,
      "slippageBps"
    );

  const maxSlippage =
    requirePositiveInteger(
      maxSlippageBps,
      "maxSlippageBps"
    );

  if (maxSlippage >= 10000) {
    throw new Error(
      "maxSlippageBps must be below 10000"
    );
  }

  if (slippage > maxSlippage) {
    throw new Error(
      "Candidate slippage exceeds policy maximum"
    );
  }

  const premium =
    requireNonnegativeInteger(
      premiumBps,
      "premiumBps"
    );

  if (premium >= 10000) {
    throw new Error(
      "premiumBps must be below 10000"
    );
  }

  const gas =
    requirePositiveBigNumber(
      estimatedGas,
      "Estimated gas"
    );

  const gasPrice =
    requirePositiveBigNumber(
      gasPriceWei,
      "Gas price"
    );

  const safetyReserve =
    requireNonnegativeBigNumber(
      safetyReserveWei,
      "Safety reserve"
    );

  const minimumNetProfit =
    requireNonnegativeBigNumber(
      minimumNetProfitWei,
      "Minimum net profit"
    );

  if (
    !Array.isArray(candidate.legs) ||
    candidate.legs.length !== 3
  ) {
    throw new Error(
      "Preflight requires exactly three candidate legs"
    );
  }

  const expectedFinalOutput =
    requirePositiveBigNumber(
      candidate.legs[2].amountOut,
      "Expected final output"
    );

  const protectedFinalOutput =
    expectedFinalOutput
      .mul(10000 - slippageBps)
      .div(10000);

  const expectedPremium =
    amountIn
      .mul(premium)
      .div(10000);

  const estimatedGasCost =
    gas.mul(gasPrice);

  const totalCost =
    amountIn
      .add(expectedPremium)
      .add(estimatedGasCost)
      .add(safetyReserve);

  if (
    expectedFinalOutput.lt(
      totalCost
    )
  ) {
    throw new Error(
      "Candidate has negative expected net profit"
    );
  }

  const expectedNetProfit =
    expectedFinalOutput.sub(
      totalCost
    );

  if (
    expectedNetProfit.lt(
      minimumNetProfit
    )
  ) {
    throw new Error(
      "Candidate expected net profit below minimum"
    );
  }

  if (
    protectedFinalOutput.lt(
      totalCost
    )
  ) {
    throw new Error(
      "Candidate protected output does not cover modeled costs"
    );
  }

  const worstCaseNetProfit =
    protectedFinalOutput.sub(
      totalCost
    );

  if (
    worstCaseNetProfit.lt(
      minimumNetProfit
    )
  ) {
    throw new Error(
      "Candidate worst-case net profit below minimum"
    );
  }

  return {
    observationBlock,
    ageBlocks,
    amountIn,
    expectedFinalOutput,
    protectedFinalOutput,
    expectedPremium,
    estimatedGasCost,
    safetyReserve,
    minimumNetProfit,
    expectedNetProfit,
    worstCaseNetProfit
  };
}

module.exports = {
  preflightObservedV4Candidate
};
