// scripts/getMaxLoanable_usdc.js
require("dotenv").config();
const hre = require("hardhat");
const { ethers } = hre;

const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const dataProviderAddress = "0x9441B65EE553F70df9C77d0bE1c1eF14FeB7FbF6"; // ✅ Aave V3 PoolDataProvider (Polygon)
const providerAddress = "0xa97684ead0e402dc232d5a977953df7ecbab3cdb"; // Aave PoolAddressesProvider

const IPoolAddressesProvider_ABI = [
  "function getPool() external view returns (address)"
];

const IPoolDataProvider_ABI = [
  "function getReserveData(address asset) external view returns (uint256 availableLiquidity, uint256 totalStableDebt, uint256 totalVariableDebt, uint256 liquidityRate, uint256 variableBorrowRate, uint256 stableBorrowRate, uint256 averageStableBorrowRate, uint256 liquidityIndex, uint256 variableBorrowIndex, uint40 lastUpdateTimestamp)"
];

async function main() {
  console.log("🔍 Fetching max loanable USDC using Aave DataProvider...");

  const provider = await ethers.getContractAt(IPoolAddressesProvider_ABI, providerAddress);
  const poolAddress = await provider.getPool();

  const dataProvider = await ethers.getContractAt(IPoolDataProvider_ABI, dataProviderAddress);
  const reserveData = await dataProvider.getReserveData(USDC_ADDRESS);
  const available = reserveData.availableLiquidity;

  const availableFloat = parseFloat(ethers.formatUnits(available, 6));
  const safeLoan = availableFloat * 0.80;
  const maxLoan = Math.min(safeLoan, 35000); // Cap for slippage control

  console.log(`🟢 USDC Available in Aave: ${availableFloat.toFixed(2)} USDC`);
  console.log(`📈 Safe Max Flashloan: ${safeLoan.toFixed(2)} USDC`);
  console.log(`📌 Suggested Cap (35k limit): ${maxLoan.toFixed(2)} USDC`);
}

main().catch((err) => {
  console.error("❌ Error checking USDC liquidity:", err);
  process.exit(1);
});

