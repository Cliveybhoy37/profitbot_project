require("dotenv").config();

const fetch = require("node-fetch");
const { ROUTES } = require("./profitMonitor");
const { enqueueProfitableTrade } = require("./profitMonitorCallback");
const fs = require("fs");
const hre = require("hardhat");
const { ethers } = hre;

const LOG_FILE = "logs/route_profitability.log";
const PROFIT_THRESHOLD = parseFloat(process.env.PROFIT_THRESHOLD || "0.5");
const AMOUNT_IN = BigInt(Math.floor(parseFloat(process.env.FLASHLOAN_AMOUNT_DAI || "1000") * 1e18)).toString();

// ✅ Dynamic Aave Address Resolution
const network = hre.network.name;

const UI_POOL_DATA_PROVIDER =
  network === "polygon"
    ? process.env.UI_POOL_DATA_PROVIDER_POLYGON
    : process.env.UI_POOL_DATA_PROVIDER_ARBITRUM;

const POOL_ADDRESS_PROVIDER =
  network === "polygon"
    ? process.env.POOL_ADDRESS_PROVIDER_POLYGON
    : process.env.POOL_ADDRESS_PROVIDER_ARBITRUM;

const abi = [
  "function getReservesData(address provider) view returns (tuple(string symbol, address underlyingAsset, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint256 availableLiquidity, uint256 totalPrincipalStableDebt, uint256 averageStableRate, uint256 stableDebtLastUpdateTimestamp, uint256 totalScaledVariableDebt, uint256 priceInMarketReferenceCurrency, uint256 variableRateSlope1, uint256 variableRateSlope2, uint256 stableRateSlope1, uint256 stableRateSlope2, uint256 baseStableBorrowRate, uint256 baseVariableBorrowRate, uint256 optimalUsageRatio, bool isPaused, bool isActive, bool isFrozen, bool borrowingEnabled, bool isStableBorrowRateEnabled, uint8 decimals)[], (uint256, int256, int256, uint8))"
];

async function fetchQuote(srcToken, destToken, amount, network) {
  const chainId = network === "polygon" ? 137 : 42161;
  const url = `https://apiv5.paraswap.io/prices/?srcToken=${srcToken}&destToken=${destToken}&amount=${amount}&side=SELL&network=${chainId}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Quote fetch error: ${res.statusText}`);
  return await res.json();
}

async function hasSufficientLiquidity(tokenAddress, network) {
  if (network !== "polygon") return true;

  const provider = ethers.provider;
  const dataProvider = new ethers.Contract(UI_POOL_DATA_PROVIDER, abi, provider);

  const [reserves] = await dataProvider.getReservesData(POOL_ADDRESS_PROVIDER);
  const match = reserves.find(r => r.underlyingAsset.toLowerCase() === tokenAddress.toLowerCase());

  if (!match) {
    console.warn(`⚠️ No reserve found for ${tokenAddress}`);
    return false;
  }

  const available = parseFloat(ethers.formatUnits(match.availableLiquidity, match.decimals));
  return available >= 1000;
}

async function checkAllRoutes() {
  const now = new Date().toISOString();

  for (const route of ROUTES) {
    try {
      const quote1 = await fetchQuote(route.srcToken, route.destToken, AMOUNT_IN, route.network);
      const receivedAmount = parseFloat(quote1.priceRoute?.destAmount || "0") / 1e18;
      if (!receivedAmount) throw new Error("Missing destAmount from quote");

      const reverseAmount = BigInt(Math.floor(receivedAmount * 1e18)).toString();
      const quote2 = await fetchQuote(route.destToken, route.srcToken, reverseAmount, route.network);
      const backAmount = parseFloat(quote2.priceRoute?.destAmount || "0") / 1e18;
      const inputAmount = parseFloat(AMOUNT_IN) / 1e18;
      const delta = backAmount - inputAmount;

      const logLine = `[${now}] ${route.network.toUpperCase()} ${route.srcToken.slice(0, 6)}→${route.destToken.slice(0, 6)}→${route.srcToken.slice(0, 6)} Δ: ${delta.toFixed(4)}\n`;
      console.log(logLine);
      fs.appendFileSync(LOG_FILE, logLine);

      if (delta > PROFIT_THRESHOLD) {
        const hasLiquidity = await hasSufficientLiquidity(route.srcToken, route.network);
        if (!hasLiquidity) {
          console.log(`⚠️ Skipping ${route.srcToken} on ${route.network}: Insufficient Aave liquidity`);
          continue;
        }

        enqueueProfitableTrade({
          network: route.network,
          script: "interact_flashloan.js",
          delta,
        });
      }

    } catch (err) {
      console.error("❌ Route check failed:", route, err.message);
    }
  }
}

checkAllRoutes();
setInterval(checkAllRoutes, 5 * 60 * 1000);

