require("dotenv").config();
const fetch = require("node-fetch");
const fs = require("fs");
const { exec } = require("child_process");
const hre = require("hardhat");
const { ethers } = hre;

const API_URL = "https://apiv5.paraswap.io/prices";
const DAI = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
const WETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
const DAI_DECIMALS = 18;
const LOG_FILE = "logs/paraswap_dai_weth_quotes.log";

const PROFIT_THRESHOLD = parseFloat(process.env.PROFIT_THRESHOLD || "0.5");
const MAX_SLIPPAGE = parseFloat(process.env.MAX_SLIPPAGE || "0.005");
const AMOUNT_IN = BigInt(Math.floor(parseFloat(process.env.FLASHLOAN_AMOUNT_DAI || "1000") * 1e18)).toString();

const providerUrl = process.env.POLYGON_RPC || "https://polygon-rpc.com";
const provider = new ethers.JsonRpcProvider(providerUrl);

// ✅ Network-aware Aave config patch
const network = process.env.NETWORK || "polygon";

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

async function hasFlashloanLiquidity(tokenAddress, minAmountWei) {
  try {
    const dataProvider = new ethers.Contract(UI_POOL_DATA_PROVIDER, AAVE_ABI, provider);
    const [reserves] = await dataProvider.getReservesData(POOL_ADDRESS_PROVIDER);

    const token = reserves.find(r => r.underlyingAsset.toLowerCase() === tokenAddress.toLowerCase());
    if (!token) {
      console.warn("⚠️ Token not found in Aave reserves.");
      return false;
    }

    return BigInt(token.availableLiquidity.toString()) >= BigInt(minAmountWei);
  } catch (err) {
    console.error("⚠️ Aave liquidity check failed:", err.message);
    return false;
  }
}

async function fetchQuote() {
  try {
    const res1 = await fetch(`${API_URL}?srcToken=${DAI}&destToken=${WETH}&amount=${AMOUNT_IN}&network=137`);
    if (!res1.ok) throw new Error(`ParaSwap API error on first quote: ${res1.statusText}`);
    const data1 = await res1.json();

    const reverseAmount = data1.priceRoute.destAmount;
    const res2 = await fetch(`${API_URL}?srcToken=${WETH}&destToken=${DAI}&amount=${reverseAmount}&network=137`);
    if (!res2.ok) throw new Error(`ParaSwap API error on second quote: ${res2.statusText}`);
    const data2 = await res2.json();

    const sellDAI = parseFloat(data1.priceRoute.srcAmount) / 1e18;
    const buyWETH = parseFloat(data1.priceRoute.destAmount) / 1e18;
    const backToDAI = parseFloat(data2.priceRoute.destAmount) / 1e18;
    const profit = backToDAI - sellDAI;

    const now = new Date().toISOString();
    const logLine = `${now},${sellDAI},${buyWETH.toFixed(6)},${backToDAI.toFixed(6)},${profit.toFixed(4)}\n`;

    console.log(`[${now}] 🔁 DAI → WETH → DAI | Profit: ${profit.toFixed(4)} DAI`);
    fs.appendFile(LOG_FILE, logLine, (err) => {
      if (err) console.error("❌ Log error:", err.message);
    });

    if (profit > PROFIT_THRESHOLD) {
      const hasLiquidity = await hasFlashloanLiquidity(DAI, AMOUNT_IN);
      if (!hasLiquidity) {
        console.warn("⚠️ Skipping flashloan: Insufficient DAI liquidity in Aave pool.");
        return;
      }

      console.log(`🚨 PROFITABLE ARBITRAGE: ~${profit.toFixed(4)} DAI`);
      exec("npx hardhat run scripts/interact_flashloan.js --network polygon", (err, stdout, stderr) => {
        if (err) {
          console.error("❌ Flashloan script failed:", err.message);
          return;
        }
        console.log("🚀 Flashloan Triggered:\n", stdout);
      });
    } else {
      console.log("📉 Not profitable (delta < PROFIT_THRESHOLD DAI). No action taken.");
    }

  } catch (err) {
    console.error("❌ Error fetching quote:", err.message);
  }
}

fetchQuote();
setInterval(fetchQuote, 5 * 60 * 1000);

