// scripts/watchDaiLiquidity_fixed.js
require("dotenv").config();
const { ethers } = require("hardhat");

const DAI = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";

// ✅ Dynamic network-based config
const network = process.env.NETWORK || "polygon";
const UI_POOL_DATA_PROVIDER =
  network === "polygon"
    ? process.env.UI_POOL_DATA_PROVIDER_POLYGON
    : process.env.UI_POOL_DATA_PROVIDER_ARBITRUM;

const POOL_ADDRESS_PROVIDER =
  network === "polygon"
    ? process.env.POOL_ADDRESS_PROVIDER_POLYGON
    : process.env.POOL_ADDRESS_PROVIDER_ARBITRUM;

const ABI = [
  "function getReservesData(address provider) view returns (tuple(string symbol, address underlyingAsset, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint256 availableLiquidity, uint256 totalPrincipalStableDebt, uint256 averageStableRate, uint256 stableDebtLastUpdateTimestamp, uint256 totalScaledVariableDebt, uint256 priceInMarketReferenceCurrency, uint256 variableRateSlope1, uint256 variableRateSlope2, uint256 stableRateSlope1, uint256 stableRateSlope2, uint256 baseStableBorrowRate, uint256 baseVariableBorrowRate, uint256 optimalUsageRatio, bool isPaused, bool isActive, bool isFrozen, bool borrowingEnabled, bool isStableBorrowRateEnabled, uint8 decimals)[], (uint256, int256, int256, uint8))"
];

let lastValue = null;

async function checkLiquidity() {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC || "https://polygon-rpc.com");
    const dataProvider = new ethers.Contract(UI_POOL_DATA_PROVIDER, ABI, provider);
    const [reserves] = await dataProvider.getReservesData(POOL_ADDRESS_PROVIDER);

    const daiReserve = reserves.find(r =>
      r.underlyingAsset.toLowerCase() === DAI.toLowerCase()
    );

    if (!daiReserve) {
      console.warn("❌ DAI not found in Aave reserves.");
      return;
    }

    const { availableLiquidity, decimals } = daiReserve;
    const current = parseFloat(ethers.formatUnits(availableLiquidity, decimals));

    if (lastValue === null) {
      console.log(`📊 Initial Aave DAI Liquidity: ${current.toFixed(4)} DAI`);
    } else if (current > lastValue) {
      console.log(`🔼 Liquidity Increased: ${current.toFixed(4)} DAI`);
    } else if (current < lastValue) {
      console.log(`🔻 Liquidity Decreased: ${current.toFixed(4)} DAI`);
    } else {
      console.log(`⏳ No change. Current: ${current.toFixed(4)} DAI`);
    }

    lastValue = current;
  } catch (err) {
    console.error("❌ Error checking liquidity:", err.message);
  }
}

setInterval(checkLiquidity, 60_000); // Every 60 seconds
checkLiquidity();

