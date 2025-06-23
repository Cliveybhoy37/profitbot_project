require("dotenv").config();
const fetch = require("node-fetch");
const fs = require("fs");
const { exec } = require("child_process");
const { ethers } = require("ethers");
const TelegramBot = require("node-telegram-bot-api");

// === Telegram Setup ===
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
const chatId = process.env.TELEGRAM_CHAT_ID;

const baseURL = "https://apiv5.paraswap.io";
const chain = "137";
const LOG_FILE = "logs/paraswap_multi_profitability.csv";
const FAILURE_LOG = "logs/flashloan_failures.log";

const PROFIT_THRESHOLD = parseFloat(process.env.PROFIT_THRESHOLD || "0.5");
const MAX_SLIPPAGE = parseFloat(process.env.MAX_SLIPPAGE || "0.005");

const providerUrl = process.env.POLYGON_RPC || "https://polygon-rpc.com";
const provider = new ethers.JsonRpcProvider(providerUrl);

// ✅ Network-aware Aave V3 config patch
const network = process.env.NETWORK || "polygon";

const UI_POOL_DATA_PROVIDER =
  network === "polygon"
    ? process.env.UI_POOL_DATA_PROVIDER_POLYGON
    : process.env.UI_POOL_DATA_PROVIDER_ARBITRUM;

const POOL_ADDRESS_PROVIDER =
  network === "polygon"
    ? process.env.POOL_ADDRESS_PROVIDER_POLYGON
    : process.env.POOL_ADDRESS_PROVIDER_ARBITRUM;

const UI_POOL_ABI = [
  "function getReservesData(address provider) view returns (tuple(string symbol, address underlyingAsset, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint256 availableLiquidity, uint256 totalPrincipalStableDebt, uint256 averageStableRate, uint256 stableDebtLastUpdateTimestamp, uint256 totalScaledVariableDebt, uint256 priceInMarketReferenceCurrency, uint256 variableRateSlope1, uint256 variableRateSlope2, uint256 stableRateSlope1, uint256 stableRateSlope2, uint256 baseStableBorrowRate, uint256 baseVariableBorrowRate, uint256 optimalUsageRatio, bool isPaused, bool isActive, bool isFrozen, bool borrowingEnabled, bool isStableBorrowRateEnabled, uint8 decimals)[], (uint256, int256, int256, uint8))"
];

const TOKENS = [
  {
    symbol: "DAI",
    address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    decimals: 18,
  },
  {
    symbol: "USDC",
    address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    decimals: 6,
  },
  {
    symbol: "WETH",
    address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    decimals: 18,
  },
];

const amountsToTest = {
  DAI: [1000, 5000, 10000, 20000, 35000],
  USDC: [1000, 5000, 10000, 20000, 35000],
  WETH: [0.1, 0.5, 1, 2],
};

async function hasSufficientAaveLiquidity(token) {
  const dataProvider = new ethers.Contract(UI_POOL_DATA_PROVIDER, UI_POOL_ABI, provider);
  const [reserves] = await dataProvider.getReservesData(POOL_ADDRESS_PROVIDER);

  const reserve = reserves.find(r => r.underlyingAsset.toLowerCase() === token.address.toLowerCase());
  if (!reserve) {
    console.warn(`⚠️ ${token.symbol} not found in Aave reserves.`);
    return false;
  }

  const available = parseFloat(ethers.formatUnits(reserve.availableLiquidity.toString(), token.decimals));
  return available >= Math.max(...amountsToTest[token.symbol]);
}

async function fetchQuote(srcToken, destToken, amount) {
  const url = `${baseURL}/prices/?srcToken=${srcToken}&destToken=${destToken}&amount=${amount}&side=SELL&network=${chain}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`ParaSwap quote error: ${res.statusText}`);
  return await res.json();
}

async function checkToken(token) {
  const now = new Date().toISOString();
  const opposite = token.symbol === "WETH" ? "DAI" : "WETH";
  const target = TOKENS.find(t => t.symbol === opposite);

  const hasLiquidity = await hasSufficientAaveLiquidity(token);
  if (!hasLiquidity) {
    console.log(`⛔ Skipping ${token.symbol}: No sufficient Aave liquidity`);
    return;
  }

  for (const testAmount of amountsToTest[token.symbol]) {
    try {
      const rawAmount = BigInt(Math.floor(testAmount * 10 ** token.decimals)).toString();

      const quote1 = await fetchQuote(token.address, target.address, rawAmount);
      if (!quote1.priceRoute?.destAmount) throw new Error("Missing destAmount");

      const received = parseFloat(quote1.priceRoute.destAmount) / 10 ** target.decimals;
      const reverseAmount = BigInt(Math.floor(received * 10 ** target.decimals)).toString();

      const quote2 = await fetchQuote(target.address, token.address, reverseAmount);
      if (!quote2.priceRoute?.destAmount) throw new Error("Missing destAmount");

      const finalAmount = parseFloat(quote2.priceRoute.destAmount) / 10 ** token.decimals;
      const delta = finalAmount - testAmount;

      const srcUSD = parseFloat(quote1.priceRoute.srcUSD || "0");
      const destUSD = parseFloat(quote1.priceRoute.destUSD || "0");
      const slippage = srcUSD && destUSD ? 1 - (destUSD / srcUSD) : 0;

      console.log(`[${token.symbol}] ${testAmount} → Δ = ${delta.toFixed(4)} | slippage: ${(slippage * 100).toFixed(2)}%`);

      const logLine = `${now},${token.symbol},${testAmount},${received.toFixed(6)},${finalAmount.toFixed(6)},${delta.toFixed(6)},${(slippage * 100).toFixed(2)}%%\n`;
      fs.appendFile(LOG_FILE, logLine, () => {});

      if (delta > PROFIT_THRESHOLD && slippage < MAX_SLIPPAGE) {
        console.log(`🚨 PROFITABLE on ${token.symbol} @ ${testAmount}`);
        bot.sendMessage(chatId, `🚀 PROFITABLE on ${token.symbol} @ ${testAmount}\nProfit: ${delta.toFixed(4)}\nSlippage: ${(slippage * 100).toFixed(2)}%`);

        exec("npx hardhat run scripts/interact_flashloan.js --network polygon", (err, stdout, stderr) => {
          if (err) {
            const failMsg = `[${new Date().toISOString()}] ❌ Flashloan failed for ${token.symbol} (${testAmount}): ${err.message}`;
            fs.appendFile(FAILURE_LOG, failMsg + "\n", () => {});
            bot.sendMessage(chatId, `⚠️ Flashloan failed for ${token.symbol} (${testAmount}):\n${err.message}`);
            return;
          }
          console.log("🚀 Flashloan Triggered:\n", stdout);
        });
      } else if (delta > 0 && slippage < 0.03) {
        console.log(`⚠️ NEAR-MISS: ${token.symbol} Δ = ${delta.toFixed(4)} | slip = ${(slippage * 100).toFixed(2)}%`);
        bot.sendMessage(chatId, `⚠️ Near-miss on ${token.symbol} @ ${testAmount}\nΔ = ${delta.toFixed(4)} | Slippage = ${(slippage * 100).toFixed(2)}%`);
      }

    } catch (err) {
      console.error(`[${token.symbol}] ❌ ${err.message}`);
    }
  }
}

async function main() {
  for (const token of TOKENS) {
    await checkToken(token);
  }
}

main();
setInterval(main, 5 * 60 * 1000);

