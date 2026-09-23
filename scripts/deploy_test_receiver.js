throw new Error("Legacy transaction script disabled pending audited simulation and owner review");
// scripts/deploy_test_receiver.js
const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("🚀 Deploying on:", hre.network.name);
  console.log("👤 Deployer:", deployer.address);

  const provider = "0xa97684ead0e402dc232d5a977953df7ecbab3cdb"; // Aave V3 Polygon

  const Receiver = await hre.ethers.getContractFactory("TestFlashloanReceiver");
  const receiver = await Receiver.deploy(provider);
  await receiver.waitForDeployment();

  const address = await receiver.getAddress();
  console.log("✅ Deployed TestFlashloanReceiver:", address);
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err);
  process.exit(1);
});

