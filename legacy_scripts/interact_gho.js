const hre = require("hardhat");
const { ethers } = hre;
require("dotenv").config();

// ✅ Contract & Aave Pool
const PROFITBOT_ADDRESS = "0xA0a465878028dfe487ED3da10Ba06267DDEA1C98";
const AAVE_LENDING_POOL = "0x5342c2c22b65a4cc0c06a34b085c72c4029f66c5";

// ✅ Token Addresses
const GHO_ADDRESS = "0x3eD3B47Dd13EC9a98b44e6204A523E766B225811"; // GHO
const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; // USDC

// ✅ Flashloan amount
const AMOUNT = ethers.parseUnits("500", 18); // 500 GHO

// ✅ Arbitrage Paths
const PATH1 = [GHO_ADDRESS, USDC_ADDRESS]; // Uniswap
const PATH2 = [USDC_ADDRESS, GHO_ADDRESS]; // Sushiswap

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("🤝 Using deployer:", deployer.address);

  const profitBot = await ethers.getContractAt("ProfitBot", PROFITBOT_ADDRESS);
  const pool = await ethers.getContractAt("IPool", AAVE_LENDING_POOL);

  const abiCoder = new ethers.AbiCoder();
  const params = abiCoder.encode(
    ["address", "uint256", "address[]", "address[]"],
    [GHO_ADDRESS, AMOUNT, PATH1, PATH2]
  );

  console.log("🚀 Triggering GHO flashloan...");
  try {
    const tx = await pool.flashLoanSimple(
      PROFITBOT_ADDRESS,
      GHO_ADDRESS,
      AMOUNT,
      params,
      0,
      { gasLimit: 5000000 }
    );
    await tx.wait();
    console.log("✅ Flashloan completed!");
  } catch (err) {
    console.error("❌ Flashloan error:", err.message || err);
  }
}

main().catch((err) => {
  console.error("❌ Script error:", err);
  process.exit(1);
});

