const hre = require("hardhat");
const { ethers } = hre;
require("dotenv").config();

const PROFITBOT_ADDRESS = "0xA0a465878028dfe487ED3da10Ba06267DDEA1C98";
const AAVE_LENDING_POOL = "0x5342c2c22b65a4cc0c06a34b085c72c4029f66c5";

const WETH_ADDRESS = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const WMATIC = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";

// ⛏️ Adjust this value as needed after running getMaxLoanable.js or testRoutes.js
const AMOUNT = ethers.parseUnits("100", 18); // Try 10, 25, 50, 100 WETH etc.

const PATH1 = [WETH_ADDRESS, WMATIC, USDC_ADDRESS]; // Uniswap route
const PATH2 = [USDC_ADDRESS, WMATIC, WETH_ADDRESS]; // Sushiswap route

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🤝 Using deployer:", deployer.address);
  console.log("🔢 Flashloan amount:", ethers.formatUnits(AMOUNT, 18), "WETH");

  const profitBot = await ethers.getContractAt("ProfitBot", PROFITBOT_ADDRESS);
  const pool = await ethers.getContractAt("IPool", AAVE_LENDING_POOL);

  const abiCoder = new ethers.AbiCoder();
  const params = abiCoder.encode(
    ["address", "uint256", "address[]", "address[]"],
    [WETH_ADDRESS, AMOUNT, PATH1, PATH2]
  );

  console.log("🚀 Triggering flashloan arbitrage...");
  try {
    const tx = await pool.flashLoanSimple(
      PROFITBOT_ADDRESS,
      WETH_ADDRESS,
      AMOUNT,
      params,
      0,
      { gasLimit: 6000000 }
    );
    await tx.wait();
    console.log("✅ Flashloan transaction confirmed!");
  } catch (err) {
    console.error("❌ Flashloan failed:", err.reason || err.message || err);
  }
}

main().catch((err) => {
  console.error("❌ Script error:", err);
  process.exit(1);
});

