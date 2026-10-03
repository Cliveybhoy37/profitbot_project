"use strict";

const { ethers } = require("ethers");

const {
  resolveAaveEconomics
} = require(
  "./polygonAaveEconomics"
);

const POLICY_PROVENANCE =
  Object.freeze({
    currentBlock:
      "PROVIDER_OBSERVED",
    gasPrice:
      "OBSERVED_AT_QUALIFICATION",
    aavePremium:
      "QUALIFICATION_BLOCK_PINNED"
  });

function validateQualificationPolicySnapshot({
  currentBlock,
  gasPriceWei,
  premiumBps
}) {
  if (
    !Number.isSafeInteger(currentBlock) ||
    currentBlock <= 0
  ) {
    throw new Error(
      "currentBlock must be a positive safe integer"
    );
  }

  let gasPrice;

  try {
    gasPrice =
      ethers.BigNumber.from(
        gasPriceWei
      );
  } catch {
    throw new Error(
      "gasPriceWei must be positive"
    );
  }

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
    currentBlock,
    gasPriceWei: gasPrice,
    premiumBps,
    provenance: {
      ...POLICY_PROVENANCE
    }
  };
}

async function acquireQualificationPolicySnapshot({
  provider,
  resolveAaveEconomicsFn =
    resolveAaveEconomics
}) {
  if (!provider) {
    throw new Error(
      "provider required"
    );
  }

  if (
    typeof provider.getBlockNumber !==
      "function" ||
    typeof provider.getGasPrice !==
      "function"
  ) {
    throw new Error(
      "provider requires getBlockNumber and getGasPrice"
    );
  }

  if (
    typeof resolveAaveEconomicsFn !==
      "function"
  ) {
    throw new Error(
      "resolveAaveEconomicsFn must be a function"
    );
  }

  const currentBlock =
    await provider.getBlockNumber();

  if (
    !Number.isSafeInteger(currentBlock) ||
    currentBlock <= 0
  ) {
    throw new Error(
      "currentBlock must be a positive safe integer"
    );
  }

  const [
    gasPriceWei,
    aave
  ] =
    await Promise.all([
      provider.getGasPrice(),
      resolveAaveEconomicsFn(
        provider,
        undefined,
        currentBlock
      )
    ]);

  if (
    !aave ||
    typeof aave !== "object"
  ) {
    throw new Error(
      "Aave economics required"
    );
  }

  const premiumBps =
    Number(aave.premiumBps);

  return validateQualificationPolicySnapshot({
    currentBlock,
    gasPriceWei,
    premiumBps
  });
}

module.exports = {
  POLICY_PROVENANCE,
  validateQualificationPolicySnapshot,
  acquireQualificationPolicySnapshot
};
