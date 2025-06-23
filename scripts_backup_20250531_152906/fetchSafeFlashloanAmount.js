// scripts/fetchSafeFlashloanAmount.js
require("dotenv").config();
const { ethers } = require("ethers");

const TOKEN_SYMBOL = process.env.FLASHLOAN_TOKEN || "DAI";

// ✅ Supported tokens
const TOKENS = {
  WBTC: { address: "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6", decimals: 8 },
  DAI:  { address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", decimals: 18 },
  USDC: { address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", decimals: 6 },
  WETH: { address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", decimals: 18 },
};

const token = TOKENS[TOKEN_SYMBOL.toUpperCase()];
if (!token) {
  console.error(`❌ Unsupported token: ${TOKEN_SYMBOL}`);
  process.exit(1);
}

// 🌐 Load network config
const network = process.env.NETWORK || "polygon";

const providerUrl =
  network === "polygon"
    ? process.env.POLYGON_RPC
    : process.env.ARBITRUM_RPC;

const UI_POOL_DATA_PROVIDER =
  network === "polygon"
    ? process.env.UI_POOL_DATA_PROVIDER_POLYGON
    : process.env.UI_POOL_DATA_PROVIDER_ARBITRUM;

const POOL_ADDRESS_PROVIDER =
  network === "polygon"
    ? process.env.POOL_ADDRESS_PROVIDER_POLYGON
    : process.env.POOL_ADDRESS_PROVIDER_ARBITRUM;

if (!providerUrl || !UI_POOL_DATA_PROVIDER || !POOL_ADDRESS_PROVIDER) {
  console.error(`❌ Missing environment variables for ${network}`);
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(providerUrl);

const ABI = [
  "function getReservesData(address provider) view returns (tuple(string symbol, address underlyingAsset, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint256 availableLiquidity, uint256 totalPrincipalStableDebt, uint256 averageStableRate, uint256 stableDebtLastUpdateTimestamp, uint256 totalScaledVariableDebt, uint256 priceInMarketReferenceCurrency, uint256 variableRateSlope1, uint256 variableRateSlope2, uint256 stableRateSlope1, uint256 stableRateSlope2, uint256 baseStableBorrowRate, uint256 baseVariableBorrowRate, uint256 optimalUsageRatio, bool isPaused, bool isActive, bool isFrozen, bool borrowingEnabled, bool isStableBorrowRateEnabled, uint8 decimals)[], (uint256,uint256,int256,uint8))"
];

async function main() {
  console.log(`🔍 Checking Aave liquidity for ${TOKEN_SYMBOL} on ${network.toUpperCase()}...`);

  const dataProvider = new ethers.Contract(UI_POOL_DATA_PROVIDER, ABI, provider);
  const [reserves] = await dataProvider.getReservesData(POOL_ADDRESS_PROVIDER);

  const reserve = reserves.find(r =>
    r.underlyingAsset.toLowerCase() === token.address.toLowerCase()
  );

  if (!reserve) {
    console.error(`❌ Reserve data not found for ${TOKEN_SYMBOL}`);
    process.exit(1);
  }

  const available = parseFloat(ethers.formatUnits(reserve.availableLiquidity, token.decimals));
  const safeLoan = Math.min(available * 0.8, 10); // cap for safety/testing
  const safeAmount = ethers.parseUnits(safeLoan.toFixed(token.decimals), token.decimals);

  console.log(`✅ Safe Flashloan Amount: ${safeLoan.toFixed(token.decimals)} ${TOKEN_SYMBOL}`);
  console.log(`🔢 Hex Format: ${safeAmount.toString()}`);
  console.log(`📋 Use in scripts/interact_flashloan.js:\n\nconst AMOUNT = ethers.parseUnits("${safeLoan.toFixed(token.decimals)}", ${token.decimals});`);
}

main().catch(err => {
  console.error("❌ Script failed:", err.message);
  process.exit(1);
});

