const { ethers } = require("ethers");
const axios = require("axios");
const fs = require("fs");
const { getUniswapQuote } = require("./uniswapQuote");
const { getSushiQuote } = require("./sushiswapQuote");
const { getBalancerQuote } = require("./balancerQuote");

const ZEROX_API_KEY = process.env.ZEROX_API_KEY;
const { getAddress, isAddress } = ethers.utils;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 📁 Persistent cache file for unsupported 0x pairs
const cachePath = "./scripts/utils/unsupported_0x_cache.json";

// 🧠 Load cached unsupported pairs from disk
let unsupported0xPairs = new Set();
try {
  if (fs.existsSync(cachePath)) {
    const raw = fs.readFileSync(cachePath);
    unsupported0xPairs = new Set(JSON.parse(raw));
    console.log(`🧠 Loaded ${unsupported0xPairs.size} cached 0x unsupported pairs`);
  }
} catch (e) {
  console.warn("⚠️ Failed to load 0x pair cache:", e.message);
}

// 📝 Save to persistent cache
function saveUnsupported0xPair(pairKey) {
  unsupported0xPairs.add(pairKey);
  fs.writeFileSync(cachePath, JSON.stringify([...unsupported0xPairs], null, 2));
}

// ✅ Paraswap Quote with Safe Retry + Backoff
async function getParaswapQuote(fromToken, toToken, amountIn, retry = 0) {
  if (!fromToken || !toToken || !isAddress(fromToken) || !isAddress(toToken)) {
    console.warn(`⚠️ Skipping Paraswap invalid token pair: ${fromToken} → ${toToken}`);
    return null;
  }

  try {
    const url = `https://apiv5.paraswap.io/prices/?srcToken=${getAddress(fromToken)}&destToken=${getAddress(toToken)}&amount=${amountIn.toString()}&side=SELL&network=137&partner=paraswap-sdk`;

    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const quote = response.data.priceRoute;
    if (!quote || quote.destAmount === "0") return null;

    return {
      dex: "Paraswap",
      amountOut: ethers.BigNumber.from(quote.destAmount)
    };
  } catch (err) {
    if (err.response?.status === 429 && retry < 2) {
      const backoff = 1200 + Math.floor(Math.random() * 800);
      console.warn(`⚠️ Paraswap rate limited. Retrying in ${backoff}ms...`);
      await sleep(backoff);
      return getParaswapQuote(fromToken, toToken, amountIn, retry + 1);
    }
    console.warn("⚠️ Paraswap quote error:", err.message);
    return null;
  }
}

// ✅ 0x Quote with persistent unsupported pair cache
async function getZeroXQuote(fromToken, toToken, amountIn) {
  if (!fromToken || !toToken || !isAddress(fromToken) || !isAddress(toToken)) {
    console.warn(`⚠️ Skipping 0x invalid token pair: ${fromToken} → ${toToken}`);
    return null;
  }

  const pairKey = `${getAddress(fromToken)}-${getAddress(toToken)}`;
  if (unsupported0xPairs.has(pairKey)) {
    console.log(`⏭️ Skipping 0x pair (cached unsupported): ${pairKey}`);
    return null;
  }

  await sleep(1000 + Math.floor(Math.random() * 500));

  const url = `https://polygon.api.0x.org/swap/v2/quote?buyToken=${getAddress(toToken)}&sellToken=${getAddress(fromToken)}&sellAmount=${amountIn.toString()}&intent=SELL`;

  try {
    const response = await axios.get(url, {
      headers: {
        '0x-api-key': ZEROX_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.data || !response.data.buyAmount) return null;

    return {
      dex: "0x",
      amountOut: ethers.BigNumber.from(response.data.buyAmount),
    };
  } catch (err) {
    if (err.response?.status === 404) {
      console.warn(`⚠️ 0x unsupported pair: ${pairKey}`);
      saveUnsupported0xPair(pairKey);
    } else {
      console.warn("⚠️ 0x quote error:", err.response?.data?.reason || err.message, "\nURL:", url);
    }
    return null;
  }
}

// ✅ Aggregate Best Quote with jittered parallel DEX requests
async function getBestQuote(path, amountIn, provider) {
  if (!path || path.length < 2 || path[0] === path[path.length - 1]) {
    return { dex: "None", amountOut: ethers.BigNumber.from("0") };
  }

  const [fromToken, toToken] = path;

  if (!fromToken || !toToken || !isAddress(fromToken) || !isAddress(toToken)) {
    console.warn(`❌ Invalid route - missing or malformed token address: ${fromToken} → ${toToken}`);
    return {
      dex: "None",
      amountOut: ethers.BigNumber.from("0"),
    };
  }

  const quotes = await Promise.all([
    (async () => { await sleep(200 + Math.random() * 300); return getUniswapQuote(path, amountIn, provider); })(),
    (async () => { await sleep(200 + Math.random() * 300); return getSushiQuote(path, amountIn, provider); })(),
    (async () => { await sleep(200 + Math.random() * 300); return getBalancerQuote(path, amountIn); })(),
    (async () => { await sleep(200 + Math.random() * 300); return getParaswapQuote(fromToken, toToken, amountIn); })(),
    (async () => { await sleep(200 + Math.random() * 300); return getZeroXQuote(fromToken, toToken, amountIn); })(),
  ]);

  const validQuotes = quotes.filter(
    (q) => q && q.amountOut && !q.amountOut.isZero()
  );

  if (validQuotes.length === 0) {
    return {
      dex: "None",
      amountOut: ethers.BigNumber.from("0"),
    };
  }

  const best = validQuotes.reduce((max, q) =>
    q.amountOut.gt(max.amountOut) ? q : max
  );

  return best;
}

module.exports = { getBestQuote };

