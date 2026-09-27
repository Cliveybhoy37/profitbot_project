"use strict";

require("dotenv").config();

const { ethers } = require("ethers");
const config = require("./utils/polygonProfitBotConfig");
const {
  buildProfitBotDeploymentData,
  estimateProfitBotDeploymentGas,
  validateDeploymentDependencies
} = require("./utils/polygonProfitBotDeployment");

const profitBotArtifact = require(
  "../artifacts/contracts/ProfitBot.sol/ProfitBot.json"
);

async function main() {
  const rpcUrl = process.env.ALCHEMY_POLYGON;
  const from = process.argv[2];

  if (!rpcUrl) {
    throw new Error("ALCHEMY_POLYGON is not configured");
  }

  if (!from) {
    throw new Error(
      "Public deployment from address is required as the first argument"
    );
  }

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

  await validateDeploymentDependencies(provider, config);

  const data = buildProfitBotDeploymentData(
    profitBotArtifact,
    config
  );

  const gas = await estimateProfitBotDeploymentGas(
    provider,
    from,
    data
  );

  console.log("Polygon ProfitBot deployment gas estimate:", gas.toString());
  console.log("Simulation from:", ethers.utils.getAddress(from));
  console.log("No transaction was signed or broadcast.");
}

main().catch((error) => {
  console.error("Deployment gas estimation failed:", error.message);
  process.exitCode = 1;
});
