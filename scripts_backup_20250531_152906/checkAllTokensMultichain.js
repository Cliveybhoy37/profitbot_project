require("dotenv").config();
const fetch = require("node-fetch");
const fs = require("fs");
const { exec } = require("child_process");
const { ethers } = require("ethers");
const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
const chatId = process.env.TELEGRAM_CHAT_ID;

const PROFIT_THRESHOLD = parseFloat(process.env.PROFIT_THRESHOLD || "0.5");
const MAX_SLIPPAGE = parseFloat(process.env.MAX_SLIPPAGE || "0.005");
const LOG_FILE = "logs/paraswap_multichain_profitability.csv";
const FAILURE_LOG = "logs/flashloan_failures.log";

// 🌐 Supported chains
const chains = {
  polygon: {
    name: "Polygon",
    chainId: "137",
    network: "polygon",
    baseURL: "https://apiv5.paraswap.io",
    rpc: process.env.POLYGON_RPC || "https://polygon-rpc.com",
    dataProvider: process.env.UI_POOL_DATA_PROVIDER_POLYGON, // ✅ Updated
    providerAddress: process.env.POOL_ADDRESS_PROVIDER_POLYGON // ✅ Updated
  },
  arbitrum: {
    name: "Arbitrum",
    chainId: "42161",
    network: "arbitrum",
    baseURL: "https://apiv5.paraswap.io",
    rpc: process.env.ARBITRUM_RPC || "https://arb1.arbitrum.io/rpc",
    dataProvider: process.env.UI_POOL_DATA_PROVIDER_ARBITRUM, // ✅ Updated
    providerAddress: process.env.POOL_ADDRESS_PROVIDER_ARBITRUM // ✅ Updated
  }
};

// Tokens per chain
const TOKENS = {
  polygon: [
    { symbol: "DAI", address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", decimals: 18 },
    { symbol: "USDC", address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", decimals: 6 },
    { symbol: "WETH", address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", decimals: 18 },
  ],
  arbitrum: [
    { symbol: "DAI", address: "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1", decimals: 18 },
    { symbol: "USDC", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6 },
    { symbol: "WETH", address: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1", decimals: 18 },
  ]
};

function getAmountList(symbol) {
  const val = parseFloat(process.env[`FLASHLOAN_AMOUNT_${symbol}`]);
  if (!val) return symbol === "WETH" ? [0.1, 0.5] : [1000, 5000];
  return [val];
}

// ✅ ABI for UiPoolDataProviderV3
const UI_POOL_DATA_PROVIDER_ABI = [
  "function getReservesData(address provider) view returns (tuple(string symbol, address underlyingAsset, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint256 availableLiquidity, uint256 totalPrincipalStableDebt, uint256 averageStableRate, uint256 stableDebtLastUpdateTimestamp, uint256 totalScaledVariableDebt, uint256 priceInMarketReferenceCurrency, uint256 variableRateSlope1, uint256 variableRateSlope2, uint256 stableRateSlope1, uint256 stableRateSlope2, uint256 baseStableBorrowRate, uint256 baseVariableBorrowRate, uint256 optimalUsageRatio, bool isPaused, bool isActive, bool isFrozen, bool borrowingEnabled, bool isStableBorrowRateEnabled, uint8 decimals)[], (uint256, int256, int256, uint8))"
];

async function hasSufficientLiquidity(chainKey, token, rawAmount) {
  const chain = chains[chainKey];
  const provider = new ethers.JsonRpcProvider(chain.rpc);
  const dataProvider = new ethers.Contract(chain.dataProvider, UI_POOL_DATA_PROVIDER_ABI, provider);
  const [reserves] = await dataProvider.getReservesData(chain.providerAddress);
  const reserve = reserves.find(r => r.underlyingAsset.toLowerCase() === token.address.toLowerCase());

  if (!reserve) {
    console.warn(`⚠️ ${token.symbol} not found in Aave reserves on ${chain.name}`);
    return false;
  }

  const available = parseFloat(ethers.formatUnits(reserve.availableLiquidity.toString(), token.decimals));
  return available >= parseFloat(ethers.formatUnits(rawAmount, token.decimals));
}

async function fetchQuote(chain, srcToken, destToken, amount) {
  const url = `${chain.baseURL}/prices/?srcToken=${srcToken}&destToken=${destToken}&amount=${amount}&side=SELL&network=${chain.chainId}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Quote error: ${res.statusText}`);
  return await res.json();
}

async function checkToken(chainKey, token) {
  const chain = chains[chainKey];
  const now = new Date().toISOString();
  const opposite = token.symbol === "WETH" ? "DAI" : "WETH";
  const target = TOKENS[chainKey].find((t) => t.symbol === opposite);

  for (const amount of getAmountList(token.symbol)) {
    try {
      const rawAmount = BigInt(Math.floor(amount * 10 ** token.decimals)).toString();

      const hasLiquidity = await hasSufficientLiquidity(chainKey, token, rawAmount);
      if (!hasLiquidity) {
        console.log(`⛔ Insufficient ${token.symbol} liquidity on ${chain.name}`);
        continue;
      }

      const quote1 = await fetchQuote(chain, token.address, target.address, rawAmount);
      if (!quote1.priceRoute?.destAmount) throw new Error("Missing destAmount");

      const received = parseFloat(quote1.priceRoute.destAmount) / 10 ** target.decimals;
      const reverseAmount = BigInt(Math.floor(received * 10 ** target.decimals)).toString();

      const quote2 = await fetchQuote(chain, target.address, token.address, reverseAmount);
      if (!quote2.priceRoute?.destAmount) throw new Error("Missing destAmount");

      const finalAmount = parseFloat(quote2.priceRoute.destAmount) / 10 ** token.decimals;
      const delta = finalAmount - amount;

      const srcUSD = parseFloat(quote1.priceRoute.srcUSD || "0");
      const destUSD = parseFloat(quote1.priceRoute.destUSD || "0");
      const slippage = srcUSD && destUSD ? 1 - (destUSD / srcUSD) : 0;

      const logLine = `${now},${chainKey},${token.symbol},${amount},${received.toFixed(6)},${finalAmount.toFixed(6)},${delta.toFixed(6)},${(slippage * 100).toFixed(2)}%%\n`;
      fs.appendFile(LOG_FILE, logLine, () => {});

      console.log(`[${chain.name}] ${token.symbol} ${amount} → Δ = ${delta.toFixed(4)} | slip: ${(slippage * 100).toFixed(2)}%`);

      if (delta > PROFIT_THRESHOLD && slippage < MAX_SLIPPAGE) {
        console.log(`🚨 PROFITABLE on ${chain.name} ${token.symbol}`);
        bot.sendMessage(chatId, `🚀 PROFITABLE on ${chain.name} ${token.symbol} ${amount}\nΔ: ${delta.toFixed(4)} | Slippage: ${(slippage * 100).toFixed(2)}%`);
        exec(`npx hardhat run scripts/interact_flashloan.js --network ${chain.network}`, (err, stdout, stderr) => {
          if (err) {
            const failMsg = `[${new Date().toISOString()}] ❌ Flashloan failed: ${err.message}`;
            fs.appendFile(FAILURE_LOG, failMsg + "\n", () => {});
            bot.sendMessage(chatId, `⚠️ Flashloan failed on ${chain.name}: ${err.message}`);
            return;
          }
          console.log("🚀 Flashloan Triggered:\n", stdout);
        });
      }

    } catch (err) {
      console.error(`[${chain.name}] ${token.symbol} ❌ ${err.message}`);
    }
  }
}

async function main() {
  for (const chainKey of Object.keys(chains)) {
    for (const token of TOKENS[chainKey]) {
      await checkToken(chainKey, token);
    }
  }
}

main();
setInterval(main, 5 * 60 * 1000);

