"use strict";

const { ethers } = require("ethers");

const {
  resolveAaveEconomics
} = require(
  "../utils/polygonAaveEconomics"
);

const SNAPSHOT_PROVENANCE =
  Object.freeze({
    quoteBlock: "PINNED",
    aavePremium: "BLOCK_PINNED",
    gasPrice: "OBSERVED_AT_ACQUISITION"
  });

function validateAcquiredSnapshot({
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
    blockTag,
    gasPriceWei:
      gasPrice,
    premiumBps,
    provenance: {
      ...SNAPSHOT_PROVENANCE
    }
  };
}

async function acquireProtectedPeakSnapshot({
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

  const blockTag =
    await provider.getBlockNumber();

  if (
    !Number.isSafeInteger(blockTag) ||
    blockTag <= 0
  ) {
    throw new Error(
      "blockTag must be a positive safe integer"
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
        blockTag
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

  return validateAcquiredSnapshot({
    blockTag,
    gasPriceWei,
    premiumBps
  });
}

module.exports = {
  SNAPSHOT_PROVENANCE,
  validateAcquiredSnapshot,
  acquireProtectedPeakSnapshot
};
