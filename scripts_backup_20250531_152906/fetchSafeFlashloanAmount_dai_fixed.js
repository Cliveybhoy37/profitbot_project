const hre = require("hardhat");
const { ethers } = hre;

const DAI = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
const AAVE_POOL = "0x5342C2c22B65A4cC0C06A34B085c72C4029F66c5";

const IPool_ABI = [
  "function getReserveData(address asset) external view returns (tuple(uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt))"
];

async function main() {
  const pool = await ethers.getContractAt(IPool_ABI, AAVE_POOL);
  const reserveData = await pool.getReserveData(DAI);

  const rawAvailable = reserveData[1];
  const formatted = parseFloat(ethers.formatUnits(rawAvailable, 18));
  const safeLoan = Math.min(formatted * 0.8, 50000);

  const safeAmount = ethers.parseUnits(safeLoan.toFixed(2), 18);
  console.log(`✅ Safe Flashloan Amount: ${safeLoan.toFixed(2)} DAI`);
  console.log(`🔢 Hex Format: ${safeAmount.toString()}`);
  console.log(`📋 Use in interact_flashloan.js:\n\nconst AMOUNT = ethers.parseUnits("${safeLoan.toFixed(2)}", 18);`);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});

