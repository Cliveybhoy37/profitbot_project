// scripts/utils/zeroXQuote.js
const axios = require("axios");
const { ethers } = require("ethers");

const API_KEY = process.env.ZEROX_API_KEY;
const ZEROX_V2_URL = "https://api.0x.org/swap/permit2/price";

async function get0xQuote(src, dst, amountIn) {
  try {
    const { data } = await axios.get(ZEROX_V2_URL, {
      params: {
        chainId: 137,
        sellToken: src,
        buyToken: dst,
        sellAmount: amountIn.toString(),
      },
      headers: {
        "0x-api-key": API_KEY,
        "0x-version": "v2",
      }
    });

    if (!data.liquidityAvailable || !data.buyAmount) {
      console.warn("⚠️  0x returned no liquidity or missing buyAmount");
      return { amountOut: ethers.constants.Zero };
    }

    let routeSummary = null;
    if (data?.route?.fills?.length > 0) {
      routeSummary = data.route.fills
        .map(f => `${f.source} (${parseFloat(f.proportionBps) / 100}%)`)
        .join(" → ");
      const tokenPath = data.route.tokens?.map(t => t.symbol).join(" → ");
      console.log(`🛣️  Route: ${tokenPath || "unknown"} via ${routeSummary}`);
    }

    return {
      amountOut: ethers.BigNumber.from(data.buyAmount),
      routeSummary,
    };
  } catch (err) {
    console.error("❌ 0x v2 error:", err.response?.data || err.message);
    return { amountOut: ethers.constants.Zero };
  }
}

module.exports = { get0xQuote };

