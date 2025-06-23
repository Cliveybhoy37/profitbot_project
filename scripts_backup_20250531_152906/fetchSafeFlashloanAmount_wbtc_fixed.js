const hre = require("hardhat");
const { ethers } = hre;

const WBTC = "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6";
const AAVE_POOL = "0x5342C2c22B65A4cC0C06A34B085c72C4029F66c5";

const IPool_ABI = [
  "function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))"
];

async function main() {
  const pool = await ethers.getContractAt(IPool_ABI, AAVE_POOL);
  const reserveData = await pool.getReserveData(WBTC);

  // Accessing the 'accruedToTreasury' field as an example
  const rawAvailable = reserveData.accruedToTreasury;
  const formatted = parseFloat(ethers.formatUnits(rawAvailable, 8));
  const safeLoan = Math.min(formatted * 0.8, 10); // Cap at 10 WBTC for safety

  const safeAmount = ethers.parseUnits(safeLoan.toFixed(8), 8);
  console.log(`✅ Safe Flashloan Amount: ${safeLoan.toFixed(8)} WBTC`);
  console.log(`🔢 Hex Format: ${safeAmount.toString()}`);
  console.log(`📋 Use in interact_flashloan.js:\n\nconst AMOUNT = ethers.parseUnits("${safeLoan.toFixed(8)}", 8);`);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});

