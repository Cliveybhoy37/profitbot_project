const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  console.log("🚀 Deploying ProfitBot with deployer:", deployer.address);
  console.log("🛰️ Network:", network);

  let providerAddress, uniswapRouter, sushiSwapRouter;

  if (network === "polygon") {
    // ✅ Correct PoolAddressesProvider for Polygon
    providerAddress = "0xa97684ead0e402dc232d5a977953df7ecbab3cdb"; // Aave V3 PoolAddressesProvider
    uniswapRouter = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";   // QuickSwap
    sushiSwapRouter = "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"; // SushiSwap
  } else if (network === "arbitrum") {
    providerAddress = "0xa97684ead0e402dc232d5a977953df7ecbab3cdb"; // Aave V3 Arbitrum
    uniswapRouter = "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506";   // SushiSwap (Arbitrum uses same)
    sushiSwapRouter = "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506";
  } else {
    console.error("❌ Unsupported network:", network);
    process.exit(1);
  }

  const ProfitBot = await hre.ethers.getContractFactory("ProfitBot");
  const bot = await ProfitBot.deploy(
    providerAddress,
    uniswapRouter,
    sushiSwapRouter,
    { gasLimit: 5000000 }
  );

  await bot.waitForDeployment();
  const deployedAddress = await bot.getAddress();
  console.log("✅ ProfitBot deployed to:", deployedAddress);
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});

