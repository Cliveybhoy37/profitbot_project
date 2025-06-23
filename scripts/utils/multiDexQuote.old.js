// scripts/utils/multiDexQuote.js
const { ethers } = require("ethers");
const axios      = require("axios");
const fs         = require("fs");

const { getUniswapQuote   } = require("./uniswapQuote");
const { getSushiQuote     } = require("./sushiswapQuote");
const { getUniswapV3Quote } = require("./uniswapV3Quote");

const tokenModule      = require("../../helpers/tokenMap");
let   addressToTokenMap = tokenModule.addressToTokenMap;

// ── runtime self-heal ───────────────────────────────────────
if (!addressToTokenMap || Object.keys(addressToTokenMap).length === 0) {
  console.warn("⚠️ addressToTokenMap missing — rebuilding.");
  addressToTokenMap = Object.fromEntries(
    Object.values(tokenModule)
      .filter(t => typeof t === "object" && t.address)
      .map   (t => [t.address.toLowerCase(), t])
  );
}

const ZEROX_API_KEY = process.env.ZEROX_API_KEY;
const { getAddress, isAddress } = ethers.utils;
const sleep = ms => new Promise(res => setTimeout(res, ms));

// handy helpers
const resolveToken = addr =>
  addressToTokenMap[addr?.toLowerCase?.()] || { symbol: "UNKNOWN", decimals: 18 };

// ── tiny on-disk cache for 0x unsupported pairs ─────────────
const cachePath = "./scripts/utils/unsupported_0x_cache.json";
let unsupported0xPairs = new Set();
try {
  if (fs.existsSync(cachePath)) {
    unsupported0xPairs = new Set(JSON.parse(fs.readFileSync(cachePath)));
    console.log(`🧠 Loaded ${unsupported0xPairs.size} cached 0x unsupported pairs`);
  }
} catch (e) {
  console.warn("⚠️ Failed to load 0x pair cache:", e.message);
}
const saveUnsupported0xPair = key => {
  unsupported0xPairs.add(key);
  fs.writeFileSync(cachePath, JSON.stringify([...unsupported0xPairs], null, 2));
};

// ── individual DEX quote helpers (Paraswap / 0x trimmed) ────
async function getParaswapQuote(from, to, amt, retry = 0) {
  if (!isAddress(from) || !isAddress(to)) return null;
  try {
    const url = `https://apiv5.paraswap.io/prices/?srcToken=${getAddress(from)}&destToken=${getAddress(to)}&amount=${amt.toString()}&side=SELL&network=137&partner=paraswap-sdk`;
    const { data } = await axios.get(url, { headers: { Accept: "application/json" } });
    if (!data?.priceRoute?.destAmount || data.priceRoute.destAmount === "0") return null;
    return { dex: "Paraswap", amountOut: ethers.BigNumber.from(data.priceRoute.destAmount) };
  } catch (err) {
    if (err.response?.status === 429 && retry < 2) {
      await sleep(1200 + Math.random() * 800);
      return getParaswapQuote(from, to, amt, retry + 1);
    }
    console.warn("⚠️ Paraswap quote error:", err.message);
    return null;
  }
}

async function getZeroXQuote(from, to, amt) {
  if (!isAddress(from) || !isAddress(to)) return null;
  const pairKey = `${getAddress(from)}-${getAddress(to)}`;
  if (unsupported0xPairs.has(pairKey)) return null;

  await sleep(1000 + Math.random() * 500);
  const url = `https://polygon.api.0x.org/swap/v2/quote?buyToken=${getAddress(to)}&sellToken=${getAddress(from)}&sellAmount=${amt}&intent=SELL`;

  try {
    const { data } = await axios.get(url, {
      headers: { "0x-api-key": ZEROX_API_KEY, Accept: "application/json" }
    });
    if (!data?.buyAmount) return null;
    return { dex: "0x", amountOut: ethers.BigNumber.from(data.buyAmount) };
  } catch (err) {
    if (err.response?.status === 404) saveUnsupported0xPair(pairKey);
    else console.warn("⚠️ 0x quote error:", err.response?.data?.reason || err.message);
    return null;
  }
}

// ── main aggregator ─────────────────────────────────────────
async function getBestQuote(path, amountIn, provider) {
  if (!path || path.length < 2 || path[0] === path[path.length - 1]) {
    return { dex: "None", amountOut: ethers.BigNumber.from(0) };
  }

  const [fromToken, toToken] = path;
  if (!isAddress(fromToken) || !isAddress(toToken)) {
    console.warn(`❌ Invalid route: ${fromToken} → ${toToken}`);
    return { dex: "None", amountOut: ethers.BigNumber.from(0) };
  }

  // parallel quote fetch
  const quotes = await Promise.all([
    (async () => { await sleep(200 + Math.random()*300); return getUniswapQuote   (path, amountIn, provider); })(),
    (async () => { await sleep(200 + Math.random()*300); return getSushiQuote     (path, amountIn, provider); })(),
    (async () => { await sleep(200 + Math.random()*300); return getParaswapQuote  (fromToken, toToken, amountIn); })(),
    (async () => { await sleep(200 + Math.random()*300); return getZeroXQuote     (fromToken, toToken, amountIn); })(),
    (async () => { await sleep(200 + Math.random()*300); return getUniswapV3Quote (path, amountIn, provider); })(),
  ]);

  const valid = quotes.filter(q => q && !q.amountOut.isZero());
  if (valid.length === 0) return { dex: "None", amountOut: ethers.BigNumber.from(0) };

  const best = valid.reduce((max, q) => q.amountOut.gt(max.amountOut) ? q : max);

  // ── decimal-aware log line (NEW) ──────────────────────────
  const outTok = resolveToken(toToken);
  const amtFmt = ethers.utils.formatUnits(best.amountOut, outTok.decimals);
  console.log(`✅ Best DEX for ${resolveToken(fromToken).symbol} → ${outTok.symbol}: ${best.dex} | amountOut: ${amtFmt}`);

  return best;
}

module.exports = { getBestQuote };

