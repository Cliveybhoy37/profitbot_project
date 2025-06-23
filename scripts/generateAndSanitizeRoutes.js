const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { ethers } = require("ethers");

const ENV_PATH = "./.env.auto.0x";
require("dotenv").config({ path: ENV_PATH });

const routeOutputPath = "./arb_routes.json";
const skippedLogPath = "./logs/skipped_routes.csv";
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// 🧠 Token Map from Environment (✅ fixed with whitelist)
const SYMBOL_TO_ADDRESS = {};

const TOKEN_WHITELIST = [
  "DAI", "USDC", "USDT", "FRAX", "GHO", "LUSD", "WETH", "WBTC", "WMATIC", "WSTETH",
  "cbETH", "rETH", "AAVE", "BAL", "CRV", "COMP", "LINK", "MKR", "SUSHI", "UNI",
  "SNX", "YFI", "EGX", "EURE", "GHST", "GYD", "JEUR", "PAR", "XSGD"
];

for (const symbol of TOKEN_WHITELIST) {
  const key = `${symbol}_POLYGON`;
  if (process.env[key]) {
    SYMBOL_TO_ADDRESS[symbol] = process.env[key];
  }
}

// ✅ Validate and normalize
const ADDRESS_TO_SYMBOL = {};
for (const [symbol, addr] of Object.entries(SYMBOL_TO_ADDRESS)) {
  try {
    const checksummed = ethers.utils.getAddress(addr);
    SYMBOL_TO_ADDRESS[symbol] = checksummed;
    ADDRESS_TO_SYMBOL[checksummed.toLowerCase()] = symbol;
  } catch {
    console.warn(`⚠️ Skipping invalid address for ${symbol}: ${addr}`);
    delete SYMBOL_TO_ADDRESS[symbol];
  }
}

const TOKENS = Object.keys(SYMBOL_TO_ADDRESS);

// 🔁 Generate A → B → A routes
const rawRoutes = [];
for (let i = 0; i < TOKENS.length; i++) {
  for (let j = 0; j < TOKENS.length; j++) {
    if (i !== j) {
      const A = TOKENS[i];
      const B = TOKENS[j];
      rawRoutes.push([A, B, A]);
    }
  }
}

// 🔍 Velora/Paraswap + 0x fallback route validator
async function hasRoute(srcSym, dstSym) {
  const src = SYMBOL_TO_ADDRESS[srcSym];
  const dst = SYMBOL_TO_ADDRESS[dstSym];
  const srcDecimals = ["USDC", "USDT"].includes(srcSym) ? 6 : 18;
  const dstDecimals = ["USDC", "USDT"].includes(dstSym) ? 6 : 18;
  const testAmount = ethers.utils.parseUnits("500", srcDecimals).toString();
  const userAddress = process.env.PROFITBOT_ADDRESS_POLYGON;

  if (!userAddress) {
    console.warn(`🚫 Missing PROFITBOT_ADDRESS_POLYGON in environment`);
    return false;
  }

  // 🛰 Velora call
  try {
    const swapUrl = `https://api.paraswap.io/swap?srcToken=${src}&srcDecimals=${srcDecimals}&destToken=${dst}&destDecimals=${dstDecimals}&amount=${testAmount}&side=SELL&network=137&slippage=100&userAddress=${userAddress}`;
    const res = await axios.get(swapUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "ProfitBot/1.0",
      },
    });

    if (res.data?.priceRoute?.destAmount > 0) {
      console.log(`✅ Velora/Paraswap route valid: ${srcSym} → ${dstSym}`);
      return true;
    } else {
      console.log(`⛔ Velora/Paraswap returned no route for ${srcSym} → ${dstSym}`);
    }
  } catch (err) {
    const msg = err?.response?.data?.error || err.message;
    console.warn(`❌ Velora error for ${srcSym} → ${dstSym}: ${msg}`);
  }

  // 🔁 0x fallback
  const apiKey = process.env.ZEROX_API_KEY;
  if (!apiKey) {
    console.warn(`🚫 ZEROX_API_KEY missing from environment. Set it in .env.auto.0x`);
    return false;
  }

  try {
    const zeroExUrl = `https://api.0x.org/swap/v1/quote?sellAmount=${testAmount}&sellToken=${src}&buyToken=${dst}&taker=${userAddress}`;
    const zeroExRes = await axios.get(zeroExUrl, {
      headers: {
        "0x-api-key": apiKey,
        Accept: "application/json",
        "User-Agent": "ProfitBot/1.0",
      },
    });

    if (zeroExRes.data?.price) {
      console.log(`✅ 0x fallback success: ${srcSym} → ${dstSym}`);
      return true;
    }

    console.log(`⛔ 0x fallback: no price for ${srcSym} → ${dstSym}`);
    return false;
  } catch (err) {
    const data = err.response?.data || {};
    const issues = data.issues || {};
    const reason =
      issues.allowance ? "🚫 insufficient allowance" :
      issues.balance ? "💰 insufficient balance" :
      issues.simulationIncomplete ? "⚠️ incomplete simulation" :
      data.validationErrors?.[0]?.reason || data.reason || err.message;

    console.warn(`❌ 0x error for ${srcSym} → ${dstSym}: ${reason}`);
    if (Object.keys(issues).length > 0) {
      console.dir(issues, { depth: null });
    }
    return false;
  }
}

// 🚀 Main logic
async function main() {
  const validRoutes = [];
  const skippedCSV = [];

  for (const [token0, token1, token2] of rawRoutes) {
    const valid1 = await hasRoute(token0, token1);
    await sleep(200);
    const valid2 = await hasRoute(token1, token2);
    await sleep(200);

    if (valid1 && valid2) {
      validRoutes.push([token0, token1, token2]);
      console.log(`✅ Valid: ${token0} → ${token1} → ${token2}`);
    } else {
      const reason = !valid1 ? `no route ${token0}→${token1}` : `no route ${token1}→${token2}`;
      skippedCSV.push(`${token0},${token1},${token2},${reason}`);
      console.log(`⛔ Skipped: ${token0} → ${token1} → ${token2} (${reason})`);
    }
  }

  fs.writeFileSync(routeOutputPath, JSON.stringify(validRoutes, null, 2));
  console.log(`\n✅ Saved ${validRoutes.length} validated routes to ${routeOutputPath}`);

  if (skippedCSV.length > 0) {
    fs.mkdirSync(path.dirname(skippedLogPath), { recursive: true });
    fs.writeFileSync(
      skippedLogPath,
      "token0,token1,token2,reason\n" + skippedCSV.join("\n")
    );
    console.log(`🗂️ Skipped route log saved to ${skippedLogPath}`);
  }
}

main();

