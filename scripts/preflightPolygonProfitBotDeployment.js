"use strict";

require("dotenv").config();

const { ethers } = require("ethers");
const config = require("./utils/polygonProfitBotConfig");
const {
  buildProfitBotConstructorArgs,
  validateProfitBotConstructorAbi,
  validateDeploymentDependencies
} = require("./utils/polygonProfitBotDeployment");

const profitBotArtifact = require(
  "../artifacts/contracts/ProfitBot.sol/ProfitBot.json"
);

const AAVE_PROVIDER_ABI = [
  "function getPool() view returns (address)"
];

async function main() {
  const rpcUrl = process.env.ALCHEMY_POLYGON;

  if (!rpcUrl) {
    throw new Error("ALCHEMY_POLYGON is not configured");
  }

  validateProfitBotConstructorAbi(profitBotArtifact.abi);

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

  await validateDeploymentDependencies(provider, config);

  const aaveProvider = new ethers.Contract(
    config.addressesProvider,
    AAVE_PROVIDER_ABI,
    provider
  );

  const pool = await aaveProvider.getPool();

  if (!ethers.utils.isAddress(pool) || pool === ethers.constants.AddressZero) {
    throw new Error("Aave provider returned an invalid pool");
  }

  const poolCode = await provider.getCode(pool);
  if (poolCode === "0x") {
    throw new Error("Aave pool has no deployed bytecode");
  }

  const constructorArgs = buildProfitBotConstructorArgs(config);

  console.log("Polygon ProfitBot deployment preflight: verified");
  console.log("Aave pool:", pool);
  console.log("Constructor arguments:");
  constructorArgs.forEach((address, index) => {
    console.log(`  [${index}] ${address}`);
  });
}

main().catch((error) => {
  console.error("Preflight failed:", error.message);
  process.exitCode = 1;
});
