// scripts/deployProfitBot.js
require("dotenv").config();
const { ethers, network } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = network.name.toUpperCase();

  console.log(`🚀 Deploying ProfitBot from: ${deployer.address}`);
  console.log(`🌐 Network: ${network.name}`);

  const poolAddressMap = {
    polygon: process.env.POOL_ADDRESS_PROVIDER_POLYGON,
    arbitrum: process.env.POOL_ADDRESS_PROVIDER_ARBITRUM,
    localhost: process.env.POOL_ADDRESS_PROVIDER_POLYGON,
  };

  const providerAddress = poolAddressMap[network.name];
  if (!providerAddress) {
    throw new Error(`❌ Missing PoolAddressProvider for network: ${network.name}`);
  }

  const uniswapRouter = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";  
  const sushiswapRouter = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506"; 
  const balancerVault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";  

  const ProfitBot = await ethers.getContractFactory("ProfitBot");
  const contract = await ProfitBot.deploy(
    providerAddress,
    uniswapRouter,
    sushiswapRouter,
    balancerVault // ✅ Included all 4 arguments
  );
  await contract.deployed();

  console.log(`✅ ProfitBot deployed at: ${contract.address}`);
  console.log(`📌 Paste this into your .env:\nPROFITBOT_ADDRESS_${networkName}=${contract.address}`);
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});

