const hre = require("hardhat");
const { ethers } = hre;

// GHO Token and Aave V3 Lending Pool on Polygon
const GHO_ADDRESS = "0x3eD3B47Dd13EC9a98b44e6204A523E766B225811";
const AAVE_POOL = "0x5342c2c22b65a4cc0c06a34b085c72c4029f66c5";

async function main() {
  const gho = await ethers.getContractAt("IERC20", GHO_ADDRESS);
  const rawBalance = await gho.balanceOf(AAVE_POOL);
  const formatted = parseFloat(ethers.formatUnits(rawBalance, 18));

  console.log("🟢 Aave Lending Pool GHO Liquidity:", formatted.toFixed(4), "GHO");

  const safeLoan = formatted * 0.80;
  const maxLoan = Math.min(safeLoan, 50000); // cap for safe testing

  console.log("📈 Suggested Max Flashloan Size:", maxLoan.toFixed(2), "GHO");
  console.log("📌 (Capped to 50k GHO for slippage safety)");
}

main().catch((err) => {
  console.error("❌ Error checking GHO liquidity:", err);
  process.exit(1);
});

