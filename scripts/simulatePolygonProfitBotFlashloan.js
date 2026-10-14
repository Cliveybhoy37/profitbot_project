"use strict";

require("dotenv").config();

const fs = require("fs");
const { ethers } = require("ethers");
const TOKENS = require("./utils/polygonScannerTokens");
const expectedConfig = require("./utils/polygonProfitBotConfig");
const {
  readProfitBotConfiguration,
  validateProfitBotConfiguration,
  validateProfitBotPool
} = require("./utils/polygonProfitBotDeployment");
const {
  parseFlashloanSimulationCliValues,
  hydrateFlashloanSimulationCandidate,
  buildFlashloanSimulationRequest,
  simulateInitiateFlashloan
} = require("./utils/polygonFlashloanSimulation");

const PROFITBOT_INSPECTION_ABI = [
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
  const [
    profitBotAddress,
    ownerAddress,
    candidatePath,
    loanAmount,
    slippageBps
  ] = process.argv.slice(2);

  if (!rpcUrl) {
    throw new Error("ALCHEMY_POLYGON is not configured");
  }

  if (
    !ethers.utils.isAddress(profitBotAddress) ||
    profitBotAddress === ethers.constants.AddressZero
  ) {
    throw new Error("Valid nonzero ProfitBot address is required");
  }

  if (
    !ethers.utils.isAddress(ownerAddress) ||
    ownerAddress === ethers.constants.AddressZero
  ) {
    throw new Error("Valid nonzero ProfitBot owner address is required");
  }

  if (!candidatePath) {
    throw new Error("Candidate JSON path is required");
  }

  const parsed = parseFlashloanSimulationCliValues({
    loanAmount,
    slippageBps
  });

  const candidateJson = JSON.parse(
    fs.readFileSync(candidatePath, "utf8")
  );
  const candidate =
    hydrateFlashloanSimulationCandidate(candidateJson);

  const request = buildFlashloanSimulationRequest({
    candidate,
    tokens: TOKENS,
    amount: parsed.amount,
    slippageBps: parsed.slippageBps
  });

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

  const code = await provider.getCode(profitBotAddress);
  if (code === "0x") {
    throw new Error("ProfitBot address has no deployed bytecode");
  }

  const profitBot = new ethers.Contract(
    profitBotAddress,
    PROFITBOT_INSPECTION_ABI,
    provider
  );

  const actual = await readProfitBotConfiguration(profitBot);
  const actualOwner = await profitBot.owner();

  if (
    ethers.utils.getAddress(actualOwner) !==
    ethers.utils.getAddress(ownerAddress)
  ) {
    throw new Error(
      "Supplied owner address does not match ProfitBot owner()"
    );
  }

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

  const result = await simulateInitiateFlashloan(
    provider,
    ownerAddress,
    profitBotAddress,
    request.data
  );

  console.log("ProfitBot:", ethers.utils.getAddress(profitBotAddress));
  console.log("Owner:", ethers.utils.getAddress(ownerAddress));
  console.log("Loan token:", request.token);
  console.log("Loan amount:", request.amount.toString());
  console.log("Slippage bps:", parsed.slippageBps);
  console.log("Configuration: verified");
  console.log("Simulation result:", result);
  console.log("No transaction was signed or broadcast.");
}

main().catch((error) => {
  console.error("Simulation failed:", error.message);
  process.exitCode = 1;
});
