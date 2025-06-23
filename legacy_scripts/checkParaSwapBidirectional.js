require("dotenv").config();

const fetch = require("node-fetch");
const fs = require("fs");
const { ethers } = require("ethers");
const { enqueueProfitableTrade } = require("./profitMonitorCallback");
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
const chatId = process.env.TELEGRAM_CHAT_ID;

const baseURL = "https://apiv5.paraswap.io";
const chain = "137"; // Polygon

const providerUrl = process.env.POLYGON_RPC || "https://polygon-rpc.com";
const provider = new ethers.JsonRpcProvider(providerUrl);

// ✅ Token & Flashloan Config
const DAI = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
const WETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
const decimals = 18;
const AMOUNT_IN = BigInt(Math.floor(parseFloat(process.env.FLASHLOAN_AMOUNT_DAI || "1000") * 1e18)).toString();

const LOG_FILE = "logs/paraswap_profitability.csv";
const PROFIT_THRESHOLD = parseFloat(process.env.PROFIT_THRESHOLD || "0.5");
const MAX_SLIPPAGE = parseFloat(process.env.MAX_SLIPPAGE || "0.005");

// ✅ Network-aware config for Aave
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

async function checkAaveLiquidity(tokenAddress) {
  const dataProvider = new ethers.Contract(UI_POOL_DATA_PROVIDER, ABI, provider);
  const [reserves] = await dataProvider.getReservesData(POOL_ADDRESS_PROVIDER);

  const reserve = reserves.find(r => r.underlyingAsset.toLowerCase() === tokenAddress.toLowerCase());
  if (!reserve) {
    console.warn("⚠️ Token not found in Aave reserves.");
    return 0;
  }

  const available = parseFloat(ethers.formatUnits(reserve.availableLiquidity, reserve.decimals));
  return available;
}

async function fetchQuote(srcToken, destToken, amount) {
  const url = `${baseURL}/prices/?srcToken=${srcToken}&destToken=${destToken}&amount=${amount}&side=SELL&network=${chain}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Quote error: ${res.statusText}`);
  return await res.json();
}

async function main() {
  try {
    const now = new Date().toISOString();

    const daiLiquidity = await checkAaveLiquidity(DAI);
    if (daiLiquidity < parseFloat(ethers.formatUnits(AMOUNT_IN, decimals))) {
      console.log(`⛔ Skipping: DAI liquidity in Aave too low (${daiLiquidity.toFixed(2)} DAI)`);
      return;
    }

    const quote1 = await fetchQuote(DAI, WETH, AMOUNT_IN);
    if (!quote1.priceRoute?.destAmount) throw new Error("❌ Missing destAmount for DAI → WETH");

    const receivedWETH = parseFloat(quote1.priceRoute.destAmount) / 1e18;
    const reverseAmount = BigInt(Math.floor(receivedWETH * 1e18)).toString();
    const quote2 = await fetchQuote(WETH, DAI, reverseAmount);
    if (!quote2.priceRoute?.destAmount) throw new Error("❌ Missing destAmount for WETH → DAI");

    const receivedDAI = parseFloat(quote2.priceRoute.destAmount) / 1e18;
    const inputDAI = parseFloat(AMOUNT_IN) / 1e18;
    const delta = receivedDAI - inputDAI;

    const srcUSD = parseFloat(quote1.priceRoute.srcUSD || "0");
    const destUSD = parseFloat(quote1.priceRoute.destUSD || "0");
    const slippage = srcUSD && destUSD ? 1 - (destUSD / srcUSD) : 0;

    console.log(`[${now}] 🔄 DAI → WETH → DAI`);
    console.log(`Input: ${inputDAI} DAI`);
    console.log(`WETH out: ${receivedWETH.toFixed(6)}`);
    console.log(`DAI back: ${receivedDAI.toFixed(6)}`);
    console.log(`📊 Profit Snapshot → Δ: ${delta.toFixed(6)} DAI`);
    console.log(`📉 Slippage: ${(slippage * 100).toFixed(2)}%`);

    const logLine = `${now},${inputDAI},${receivedWETH.toFixed(6)},${receivedDAI.toFixed(6)},${delta.toFixed(6)},${(slippage * 100).toFixed(2)}%%\n`;
    fs.appendFile(LOG_FILE, logLine, () => {});

    if (delta > PROFIT_THRESHOLD && slippage < MAX_SLIPPAGE) {
      console.log("🚨 PROFITABLE! Queuing trade...");
      bot.sendMessage(chatId, `🚀 PROFITABLE ARB DETECTED!\nProfit: ${delta.toFixed(4)} DAI\nSlippage: ${(slippage * 100).toFixed(2)}%\nAdding to task queue.`);
      enqueueProfitableTrade({ network: "polygon", delta });
    } else {
      console.log(`📉 Not profitable or slippage too high`);
    }

  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

main();
setInterval(main, 5 * 60 * 1000);

