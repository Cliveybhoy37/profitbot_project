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

function buildProfitBotConstructorArgs(config) {
  if (!config) {
    throw new Error("ProfitBot constructor configuration is required");
  }

  const keys = [
    "addressesProvider",
    "quickSwapRouter",
    "sushiSwapRouter",
    "uniswapV3Router",
    "balancerVault"
  ];

  for (const key of keys) {
    if (!ethers.utils.isAddress(config[key])) {
      throw new Error(`Invalid ProfitBot constructor ${key}`);
    }
  }

  return keys.map((key) => config[key]);
}

async function validateDeploymentDependencies(provider, config) {
  if (!provider || typeof provider.getCode !== "function") {
    throw new Error("Deployment provider with getCode is required");
  }

  const keys = [
    "addressesProvider",
    "quickSwapRouter",
    "sushiSwapRouter",
    "uniswapV3Router",
    "balancerVault"
  ];

  buildProfitBotConstructorArgs(config);

  for (const key of keys) {
    const code = await provider.getCode(config[key]);

    if (code === "0x") {
      throw new Error(
        `ProfitBot deployment dependency ${key} has no bytecode`
      );
    }
  }

  return true;
}

async function readGetter(contract, getter) {
  try {
    return await contract[getter]();
  } catch (_) {
    throw new Error(
      `Incompatible ProfitBot deployment: ${getter}() unavailable`
    );
  }
}

async function readProfitBotConfiguration(contract) {
  return {
    addressesProvider: await readGetter(contract, "ADDRESSES_PROVIDER"),
    pool: await readGetter(contract, "POOL"),
    quickSwapRouter: await readGetter(contract, "quickSwapRouter"),
    sushiSwapRouter: await readGetter(contract, "sushiSwapRouter"),
    uniswapV3Router: await readGetter(contract, "uniswapV3Router"),
    balancerVault: await readGetter(contract, "balancerVault")
  };
}

function buildProfitBotDeploymentData(artifact, config) {
  if (
    !artifact ||
    typeof artifact.bytecode !== "string" ||
    artifact.bytecode === "0x" ||
    !ethers.utils.isHexString(artifact.bytecode)
  ) {
    throw new Error("ProfitBot deployment bytecode is missing");
  }

  validateProfitBotConstructorAbi(artifact.abi);

  const constructorArgs = buildProfitBotConstructorArgs(config);
  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode
  );

  const transaction = factory.getDeployTransaction(...constructorArgs);

  if (!transaction.data) {
    throw new Error("ProfitBot deployment data was not generated");
  }

  return transaction.data;
}

function validateProfitBotConstructorAbi(abi) {
  const expectedInputs = [
    ["_provider", "address"],
    ["_quickSwapRouter", "address"],
    ["_sushiSwapRouter", "address"],
    ["_uniswapV3Router", "address"],
    ["_balancerVault", "address"]
  ];

  const constructor = Array.isArray(abi)
    ? abi.find((entry) => entry && entry.type === "constructor")
    : null;

  const inputs = constructor && Array.isArray(constructor.inputs)
    ? constructor.inputs
    : [];

  const matches =
    inputs.length === expectedInputs.length &&
    inputs.every(
      (input, index) =>
        input.name === expectedInputs[index][0] &&
        input.type === expectedInputs[index][1]
    );

  if (!matches) {
    throw new Error("ProfitBot constructor ABI mismatch");
  }

  return true;
}

module.exports = {
  CONFIG_KEYS,
  validateProfitBotConfiguration,
  validateProfitBotPool,
  buildProfitBotConstructorArgs,
  buildProfitBotDeploymentData,
  validateProfitBotConstructorAbi,
  validateDeploymentDependencies,
  readProfitBotConfiguration
};
