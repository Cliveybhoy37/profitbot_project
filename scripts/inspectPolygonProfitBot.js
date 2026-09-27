"use strict";

require("dotenv").config();

const { ethers } = require("ethers");
const expectedConfig = require("./utils/polygonProfitBotConfig");
const {
  readProfitBotConfiguration,
  validateProfitBotConfiguration,
  validateProfitBotPool
} = require("./utils/polygonProfitBotDeployment");

const PROFITBOT_ABI = [
  "function ADDRESSES_PROVIDER() view returns (address)",
  "function POOL() view returns (address)",
  "function quickSwapRouter() view returns (address)",
  "function sushiSwapRouter() view returns (address)",
  "function uniswapV3Router() view returns (address)",
  "function balancerVault() view returns (address)",
  "function owner() view returns (address)"
];

const AAVE_PROVIDER_ABI = [
  "function getPool() view returns (address)"
];

async function main() {
  const rpcUrl = process.env.ALCHEMY_POLYGON;
  const profitBotAddress = process.argv[2];

  if (!rpcUrl) {
    throw new Error("ALCHEMY_POLYGON is not configured");
  }

  if (!ethers.utils.isAddress(profitBotAddress)) {
    throw new Error("Usage: node scripts/inspectPolygonProfitBot.js <profitBotAddress>");
  }

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

  const code = await provider.getCode(profitBotAddress);
  if (code === "0x") {
    throw new Error("ProfitBot address has no deployed bytecode");
  }

  const profitBot = new ethers.Contract(
    profitBotAddress,
    PROFITBOT_ABI,
    provider
  );

  const actual = await readProfitBotConfiguration(profitBot);
  const owner = await profitBot.owner();

  const aaveProvider = new ethers.Contract(
    actual.addressesProvider,
    AAVE_PROVIDER_ABI,
    provider
  );
  const providerPool = await aaveProvider.getPool();

  validateProfitBotPool(actual.pool, providerPool);
  validateProfitBotConfiguration(actual, {
    ...expectedConfig,
    pool: providerPool
  });

  console.log("ProfitBot:", profitBotAddress);
  console.log("Owner:", owner);
  console.log("Bytecode bytes:", (code.length - 2) / 2);
  console.log("Configuration: verified");
}

main().catch((error) => {
  console.error("Inspection failed:", error.message);
  process.exitCode = 1;
});
