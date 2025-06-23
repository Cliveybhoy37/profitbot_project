// scripts/getMaxLoanableToken.js
require("dotenv").config();
const { ethers } = require("ethers");

// Get token address from CLI
const tokenAddress = process.argv[2];
if (!tokenAddress) {
  console.error("❌ Please provide a token address.");
  process.exit(1);
}

// Determine network context
const network = process.env.NETWORK || "polygon";

const UI_POOL_DATA_PROVIDER =
  network === "polygon"
    ? process.env.UI_POOL_DATA_PROVIDER_POLYGON
    : process.env.UI_POOL_DATA_PROVIDER_ARBITRUM;

const POOL_ADDRESS_PROVIDER =
  network === "polygon"
    ? process.env.POOL_ADDRESS_PROVIDER_POLYGON
    : process.env.POOL_ADDRESS_PROVIDER_ARBITRUM;

if (!UI_POOL_DATA_PROVIDER || !POOL_ADDRESS_PROVIDER) {
  console.error("❌ Missing data provider or pool address in environment config.");
  process.exit(1);
}

// Setup provider
const providerUrl =
  network === "polygon"
    ? process.env.POLYGON_RPC || "https://polygon-rpc.com"
    : process.env.ARBITRUM_RPC || "https://arb1.arbitrum.io/rpc";

const provider = new ethers.JsonRpcProvider(providerUrl);

// ABI for UiPoolDataProviderV3
const ABI = [
  "function getReservesData(address provider) view returns (tuple(string symbol, address underlyingAsset, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint256 availableLiquidity, uint256 totalPrincipalStableDebt, uint256 averageStableRate, uint256 stableDebtLastUpdateTimestamp, uint256 totalScaledVariableDebt, uint256 priceInMarketReferenceCurrency, uint256 variableRateSlope1, uint256 variableRateSlope2, uint256 stableRateSlope1, uint256 stableRateSlope2, uint256 baseStableBorrowRate, uint256 baseVariableBorrowRate, uint256 optimalUsageRatio, bool isPaused, bool isActive, bool isFrozen, bool borrowingEnabled, bool isStableBorrowRateEnabled, uint8 decimals)[], (uint256,uint256,int256,uint8))"
];

async function main() {
  const dataProvider = new ethers.Contract(UI_POOL_DATA_PROVIDER, ABI, provider);
  const [reserves] = await dataProvider.getReservesData(POOL_ADDRESS_PROVIDER);

  const tokenReserve = reserves.find(
    (r) => r.underlyingAsset.toLowerCase() === tokenAddress.toLowerCase()
  );

  if (!tokenReserve) {
    console.error("❌ Token not found in Aave reserves.");
    process.exit(1);
  }

  const available = parseFloat(ethers.formatUnits(tokenReserve.availableLiquidity, tokenReserve.decimals));
  const safeLoan = available * 0.8;
  const maxLoan = Math.min(safeLoan, 35000);

  console.log(`🟢 Available Aave Liquidity for token ${tokenAddress}: ${available.toFixed(4)}`);
  console.log("📈 Safe Max Flashloan Size:", maxLoan.toFixed(2));
  console.log("📌 (Capped at 35k USD-equivalent for slippage safety)");
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});

