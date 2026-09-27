"use strict";

const { ethers } = require("ethers");

const CONFIG_KEYS = Object.freeze([
  "addressesProvider",
  "pool",
  "quickSwapRouter",
  "sushiSwapRouter",
  "uniswapV3Router",
  "balancerVault"
]);

function validateProfitBotConfiguration(actual, expected) {
  if (!actual || !expected) {
    throw new Error("ProfitBot configuration is required");
  }

  for (const key of CONFIG_KEYS) {
    const actualAddress = actual[key];
    const expectedAddress = expected[key];

    if (!ethers.utils.isAddress(actualAddress)) {
      throw new Error(`Invalid ProfitBot ${key}`);
    }

    if (!ethers.utils.isAddress(expectedAddress)) {
      throw new Error(`Invalid expected ${key}`);
    }

    if (actualAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
      throw new Error(`ProfitBot ${key} mismatch`);
    }
  }

  return true;
}

function validateProfitBotPool(storedPool, providerPool) {
  if (!ethers.utils.isAddress(storedPool)) {
    throw new Error("Invalid ProfitBot pool");
  }

  if (!ethers.utils.isAddress(providerPool)) {
    throw new Error("Invalid Aave provider pool");
  }

  if (storedPool.toLowerCase() !== providerPool.toLowerCase()) {
    throw new Error("Aave pool mismatch");
  }

  return true;
}

async function readProfitBotConfiguration(contract) {
  return {
    addressesProvider: await contract.ADDRESSES_PROVIDER(),
    pool: await contract.POOL(),
    quickSwapRouter: await contract.quickSwapRouter(),
    sushiSwapRouter: await contract.sushiSwapRouter(),
    uniswapV3Router: await contract.uniswapV3Router(),
    balancerVault: await contract.balancerVault()
  };
}

module.exports = {
  CONFIG_KEYS,
  validateProfitBotConfiguration,
  validateProfitBotPool,
  readProfitBotConfiguration
};
