throw new Error("Legacy transaction script disabled pending audited simulation and owner review");
const hre = require("hardhat");
const { ethers } = hre;
require("dotenv").config();

// ✅ Your latest deployed ProfitBot address
const PROFITBOT_ADDRESS = "0x44337Ab47887D956695312381Aa40D46dFEFf64A";

// ✅ WETH token on Polygon
const WETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🔐 Using wallet:", deployer.address);

  const profitBot = await ethers.getContractAt("ProfitBot", PROFITBOT_ADDRESS);

  console.log("🚨 Attempting to withdraw WETH from ProfitBot...");
  const tx = await profitBot.withdrawToken(WETH, { gasLimit: 200000 });
  await tx.wait();

  console.log("✅ Withdrawal complete. WETH returned to:", deployer.address);
}

main().catch((err) => {
  console.error("❌ Withdrawal failed:", err.message);
  process.exit(1);
});

