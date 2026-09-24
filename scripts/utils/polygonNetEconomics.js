"use strict";

function requireNonNegativeBigInt(value, name) {
  if (typeof value !== "bigint" || value < 0n) {
    throw new TypeError(`${name} must be a non-negative bigint`);
  }
}

function ceilDiv(numerator, denominator) {
  requireNonNegativeBigInt(numerator, "numerator");

  if (typeof denominator !== "bigint" || denominator <= 0n) {
    throw new TypeError("denominator must be a positive bigint");
  }

  if (numerator === 0n) return 0n;
  return (numerator + denominator - 1n) / denominator;
}

function flashloanFeeRaw(amount, premiumBps) {
  requireNonNegativeBigInt(amount, "amount");
  requireNonNegativeBigInt(premiumBps, "premiumBps");

  return ceilDiv(amount * premiumBps, 10_000n);
}

function flashloanAdjustedResearchEconomics({
  startAmount,
  finalAmount,
  premiumBps
}) {
  requireNonNegativeBigInt(startAmount, "startAmount");
  requireNonNegativeBigInt(finalAmount, "finalAmount");
  requireNonNegativeBigInt(premiumBps, "premiumBps");

  if (startAmount === 0n) {
    throw new TypeError("startAmount must be greater than zero");
  }

  const grossDelta = finalAmount - startAmount;
  const flashloanFee = flashloanFeeRaw(startAmount, premiumBps);
  const gasBudget = grossDelta - flashloanFee;

  return {
    grossDelta,
    flashloanFee,
    gasBudget,
    coversFlashloanFee: gasBudget > 0n
  };
}

function nativeGasCostInTokenRaw({
  gasUnits,
  maxFeePerGasWei,
  nativePrice,
  tokenPrice,
  tokenDecimals
}) {
  requireNonNegativeBigInt(gasUnits, "gasUnits");
  requireNonNegativeBigInt(maxFeePerGasWei, "maxFeePerGasWei");
  requireNonNegativeBigInt(nativePrice, "nativePrice");
  requireNonNegativeBigInt(tokenPrice, "tokenPrice");

  if (
    !Number.isInteger(tokenDecimals) ||
    tokenDecimals < 0 ||
    tokenDecimals > 255
  ) {
    throw new TypeError("tokenDecimals must be an integer from 0 to 255");
  }

  if (tokenPrice === 0n) {
    throw new TypeError("tokenPrice must be greater than zero");
  }

  const nativeWei = gasUnits * maxFeePerGasWei;
  const tokenScale = 10n ** BigInt(tokenDecimals);
  const weiPerNative = 10n ** 18n;

  return ceilDiv(
    nativeWei * nativePrice * tokenScale,
    tokenPrice * weiPerNative
  );
}

module.exports = {
  ceilDiv,
  flashloanFeeRaw,
  flashloanAdjustedResearchEconomics,
  nativeGasCostInTokenRaw
};
