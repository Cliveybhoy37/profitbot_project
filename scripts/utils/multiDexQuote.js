// scripts/utils/multiDexQuote.js
const axios = require("axios");
const { ethers } = require("ethers");
const sleep = require("../../utils/sleep");
const { get0xQuote } = require("./zeroXQuote");
const { toWeiSafe } = require("./formatters");
const { tokenMap } = require("../../helpers/tokenMap");

const MIN_V2_RATIO = parseFloat(process.env.MIN_V2_RATIO || "0.000001");
const MIN_FILL_BPS = 1000;
const MIN_OUTPUT_THRESHOLD = ethers.utils.parseUnits("1", 18);
const MIN_TRADE_USD = parseFloat(process.env.MIN_TRADE_USD || "0");

const V2_ROUTER_ABIS = [
  {
    name: "QuickSwap",
    address: process.env.UNISWAP_ROUTER_POLYGON,
    iface: new ethers.utils.Interface([
      "function getAmountsOut(uint256,address[]) view returns (uint256[])"
    ])
  },
  {
    name: "SushiSwap",
    address: process.env.SUSHISWAP_ROUTER_POLYGON,
    iface: new ethers.utils.Interface([
      "function getAmountsOut(uint256,address[]) view returns (uint256[])"
    ])
  }
];

const PARASWAP_API = "https://apiv5.paraswap.io";
const PARASWAP_DEXES = ["Balancer", "KyberSwap"];

async function getAssetPriceUSD(address, decimals) {
  try {
    const px = await axios.get(`https://api.coingecko.com/api/v3/simple/token_price/polygon-pos?contract_addresses=${address}&vs_currencies=usd`);
    const price = Object.values(px.data)[0]?.usd;
    if (!price) return 0;
    return parseFloat(ethers.utils.formatUnits(ethers.utils.parseUnits(price.toString(), 8), 8)) || 0;
  } catch {
    return 0;
  }
}

async function getBestQuote(path, amountIn, provider) {
  if (!Array.isArray(path) || path.length < 2) {
    return { amountOut: ethers.constants.Zero, dex: "error" };
  }

  const [src, dst] = path;

  // On-chain V2s
  for (const { name, address, iface } of V2_ROUTER_ABIS) {
    try {
      const router = new ethers.Contract(address, iface, provider);
      const amounts = await router.getAmountsOut(amountIn, path);
      const out = amounts[amounts.length - 1];
      const minAcceptable = amountIn.mul(toWeiSafe(MIN_V2_RATIO, 6)).div(1e6);

      if (out.gt(minAcceptable)) {
        const dstSym = Object.keys(tokenMap).find(s => tokenMap[s].address.toLowerCase() === dst.toLowerCase());
        const pxUsd = await getAssetPriceUSD(dst, tokenMap[dstSym]?.decimals);
        const tradeValueUsd = parseFloat(ethers.utils.formatUnits(out, tokenMap[dstSym]?.decimals || 18)) * pxUsd;

        if (tradeValueUsd < MIN_TRADE_USD) {
          console.warn(`🧹 ${name} quote below MIN_TRADE_USD ($${MIN_TRADE_USD}) — skip`);
          continue;
        }

        return { amountOut: out, dex: name.toLowerCase() };
      } else {
        console.log(`⚠️ ${name} V2 quote too small (${out})`);
      }
    } catch {}
    await sleep(20);
  }

  // 0x fallback
  const srcSym = Object.keys(tokenMap).find(s => tokenMap[s].address.toLowerCase() === src.toLowerCase());
  const dstSym = Object.keys(tokenMap).find(s => tokenMap[s].address.toLowerCase() === dst.toLowerCase());

  const out0x = await get0xQuote(src, dst, amountIn);
  if (out0x.amountOut?.gt(ethers.constants.Zero)) {
    const badHops = out0x.fills?.filter(f => parseInt(f.proportionBps) < MIN_FILL_BPS);
    if (badHops?.length > 0) {
      console.log(`⚠️ Skipping 0x due to weak fills: ${badHops.map(f => f.source).join(", ")}`);
      return { amountOut: ethers.constants.Zero, dex: "error" };
    }

    const pxUsd = await getAssetPriceUSD(dst, tokenMap[dstSym]?.decimals);
    const tradeValueUsd = parseFloat(ethers.utils.formatUnits(out0x.amountOut, tokenMap[dstSym]?.decimals || 18)) * pxUsd;

    if (tradeValueUsd < MIN_TRADE_USD) {
      console.warn(`🧹 0x quote below MIN_TRADE_USD ($${MIN_TRADE_USD}) — skip`);
      return { amountOut: ethers.constants.Zero, dex: "dust-filtered" };
    }

    console.log(`🪂 0x fallback used`);
    return { amountOut: out0x.amountOut, dex: "0x", routeSummary: out0x.routeSummary || null };
  }

  // Paraswap fallback
  const srcDec = tokenMap[srcSym].decimals;
  const dstDec = tokenMap[dstSym].decimals;
  const url = `${PARASWAP_API}/prices/?srcToken=${src}&destToken=${dst}&amount=${amountIn.toString()}&srcDecimals=${srcDec}&destDecimals=${dstDec}&side=SELL&network=137&includeDEXS=${PARASWAP_DEXES.join(",")}`;

  let resp, attempts = 0;
  while (attempts < 3) {
    try {
      resp = await axios.get(url, {
        headers: { Accept: "application/json", "User-Agent": "ProfitBot/1.0" }
      });
      break;
    } catch (err) {
      if (err.response?.status === 429) {
        await sleep(500 * (attempts + 1));
        attempts++;
      } else {
        console.warn("⚠️ Paraswap error:", err.message);
        return { amountOut: ethers.constants.Zero, dex: "error" };
      }
    }
  }

  if (!resp?.data?.priceRoute) {
    console.warn("⚠️ No Paraswap response");
    return { amountOut: ethers.constants.Zero, dex: "error" };
  }

  const data = resp.data;
  const out = ethers.BigNumber.from(data.priceRoute.destAmount || "0");

  if (data.priceRoute.bestRoute?.length > 0) {
    const hops = data.priceRoute.bestRoute.map(r =>
      r.swaps.map(s =>
        s.swapExchanges.map(e => `${e.dex} (${e.percent}% )`).join(", ")
      ).join(" → ")
    ).join(" → ");
    console.log(`🛣️  Paraswap route: ${hops}`);
  }

  const pxUsd = await getAssetPriceUSD(dst, dstDec);
  const tradeValueUsd = parseFloat(ethers.utils.formatUnits(out, dstDec)) * pxUsd;

  if (tradeValueUsd < MIN_TRADE_USD) {
    console.warn(`🧹 Paraswap quote below MIN_TRADE_USD ($${MIN_TRADE_USD}) — skip`);
    return { amountOut: ethers.constants.Zero, dex: "dust-filtered" };
  }

  const dexName = data?.priceRoute?.bestRoute?.[0]?.swaps?.[0]?.swapExchanges?.[0]?.dex || PARASWAP_DEXES[0];
  console.log(`🛟 Paraswap fallback used via ${dexName}`);
  return { amountOut: out, dex: dexName.toLowerCase() };
}

module.exports = { getBestQuote };

