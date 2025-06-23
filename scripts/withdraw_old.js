const hre = require("hardhat");
const { ethers } = hre;
require("dotenv").config();

const OLD_PROFITBOT_ADDRESS = "0xcF3E821FFA721c29909f85dD366ff613A654058C";
const WETH_ADDRESS = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🔐 Using deployer:", deployer.address);

  const profitBot = await ethers.getContractAt("ProfitBot", OLD_PROFITBOT_ADDRESS);

  console.log("💰 Attempting to withdraw WETH from OLD ProfitBot...");
  const tx = await profitBot.withdrawToken(WETH_ADDRESS);  // ✅ correct method
  await tx.wait();
  console.log("✅ WETH withdrawn from old contract.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

