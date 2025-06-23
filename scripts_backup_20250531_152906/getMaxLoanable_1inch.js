const hre = require("hardhat");
const { ethers } = hre;

// ✅ 1INCH Token & Aave Pool (Polygon)
const ONEINCH_ADDRESS = "0x111111111117dc0aa78b770fa6a738034120c302";
const AAVE_POOL = "0x5342c2c22b65a4cc0c06a34b085c72c4029f66c5";

async function main() {
  const oneInch = await ethers.getContractAt("IERC20", ONEINCH_ADDRESS);
  const rawBalance = await oneInch.balanceOf(AAVE_POOL);
  const formatted = parseFloat(ethers.formatUnits(rawBalance, 18));

  console.log("🟢 Aave Lending Pool 1INCH Liquidity:", formatted.toFixed(4), "1INCH");

  const safeLoan = formatted * 0.80;
  const maxLoan = Math.min(safeLoan, 50000); // cap at 50k 1INCH for stability

  console.log("📈 Suggested Max Flashloan Size:", maxLoan.toFixed(2), "1INCH");
  console.log("📌 (Capped for safe slippage range)");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});

