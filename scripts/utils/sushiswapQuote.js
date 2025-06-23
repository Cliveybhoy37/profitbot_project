// scripts/utils/sushiswapQuote.js
const { ethers } = require("ethers");

const SUSHISWAP_ROUTER = "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506"; // Polygon SushiSwap router

const iface = new ethers.utils.Interface([
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory)"
]);

async function getSushiQuote(path, amountIn, provider) {
  const router = new ethers.Contract(SUSHISWAP_ROUTER, iface, provider);
  try {
    const out = await router.getAmountsOut(amountIn, path);
    return {
      dex: "SushiSwap",
      amountOut: out[out.length - 1]
    };
  } catch (err) {
    if (process.env.VERBOSE_LOGS === "true") {
      console.warn(`SushiSwap quote failed for path ${path.join(" → ")}: ${err.message}`);
    }
    return { dex: "SushiSwap", amountOut: ethers.BigNumber.from("0") };
  }
}

// ✅ This matches: const { getSushiQuote } = require("./sushiswapQuote");
module.exports = { getSushiQuote };

