// scripts/monitorAndExecuteFlashloans.js
require("dotenv").config();
const hre = require("hardhat");
const { ethers } = hre;
const { runFlashloan } = require("./interact_flashloan");

// 🟢 Dynamic Network Support
const network = process.env.NETWORK || "polygon";

const providerUrl =
  network === "polygon"
    ? process.env.POLYGON_RPC || "https://polygon-rpc.com"
    : process.env.ARBITRUM_RPC || "https://arb1.arbitrum.io/rpc";

const provider = new ethers.JsonRpcProvider(providerUrl);

const UI_POOL_DATA_PROVIDER =
  network === "polygon"
    ? process.env.UI_POOL_DATA_PROVIDER_POLYGON
    : process.env.UI_POOL_DATA_PROVIDER_ARBITRUM;

const POOL_ADDRESS_PROVIDER =
  network === "polygon"
    ? process.env.POOL_ADDRESS_PROVIDER_POLYGON
    : process.env.POOL_ADDRESS_PROVIDER_ARBITRUM;

const AAVE_ABI = [
  "function getReservesData(address provider) view returns (tuple(string symbol, address underlyingAsset, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint256 availableLiquidity, uint256 totalPrincipalStableDebt, uint256 averageStableRate, uint256 stableDebtLastUpdateTimestamp, uint256 totalScaledVariableDebt, uint256 priceInMarketReferenceCurrency, uint256 variableRateSlope1, uint256 variableRateSlope2, uint256 stableRateSlope1, uint256 stableRateSlope2, uint256 baseStableBorrowRate, uint256 baseVariableBorrowRate, uint256 optimalUsageRatio, bool isPaused, bool isActive, bool isFrozen, bool borrowingEnabled, bool isStableBorrowRateEnabled, uint8 decimals)[], (uint256, int256, int256, uint8))"
];

async function safeFlashloan(tokenAddress, amountFloat, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await runFlashloan(tokenAddress, amountFloat);
      break;
    } catch (err) {
      console.warn(`⚠️ Retry ${attempt} failed: ${err.message}`);
      if (attempt === retries) {
        console.error(`❌ Giving up on ${tokenAddress}`);
      } else {
        await delay(3000);
      }
    }
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getTokenCap(symbol, fallback = Infinity) {
  const capEnv = process.env[`FLASHLOAN_CAP_${symbol.toUpperCase()}`];
  return capEnv ? parseFloat(capEnv) : fallback;
}

function getTokenPreference() {
  return process.env.FLASHLOAN_TOKEN?.toUpperCase();
}

async function main() {
  const dataProvider = new ethers.Contract(UI_POOL_DATA_PROVIDER, AAVE_ABI, provider);
  const [reserves] = await dataProvider.getReservesData(POOL_ADDRESS_PROVIDER);

  const preferred = getTokenPreference();
  const viable = [];

  for (const token of reserves) {
    const { symbol, underlyingAsset, availableLiquidity, priceInMarketReferenceCurrency, decimals } = token;

    try {
      const liquidity = parseFloat(ethers.formatUnits(availableLiquidity, decimals));
      const priceUSD = Number(priceInMarketReferenceCurrency.toString()) / 1e8;
      const usdValue = liquidity * priceUSD;

      if (usdValue >= 10000 && (!preferred || preferred === symbol.toUpperCase())) {
        viable.push({
          symbol,
          address: underlyingAsset,
          liquidity,
          usdValue
        });
      }
    } catch (err) {
      console.error(`❌ Error decoding ${token.symbol}: ${err.message}`);
    }
  }

  if (viable.length === 0) {
    console.log("⚠️ No viable tokens found with > $10k liquidity.");
    return;
  }

  viable.sort((a, b) => b.usdValue - a.usdValue);

  for (const token of viable) {
    const cappedAmount = Math.min(token.liquidity, getTokenCap(token.symbol));
    console.log(`🚀 Executing flashloan for ${token.symbol}: ${cappedAmount.toFixed(4)} (cap applied)`);

    await safeFlashloan(token.address, cappedAmount);
    await delay(5000);
  }
}

main().catch((err) => {
  console.error("❌ Monitor script failed:", err);
  process.exit(1);
});

