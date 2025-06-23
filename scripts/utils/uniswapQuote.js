const { ethers } = require("ethers");

const UNISWAP_ROUTER = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"; // Quickswap

const iface = new ethers.utils.Interface([
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory)"
]);

async function getUniswapQuote(path, amountIn, provider) {
  const router = new ethers.Contract(UNISWAP_ROUTER, iface, provider);
  try {
    const out = await router.getAmountsOut(amountIn, path);
    return {
      dex: "Uniswap",
      amountOut: out[out.length - 1]
    };
  } catch (err) {
    if (process.env.VERBOSE_LOGS === "true") {
      console.warn(`Uniswap quote failed for path ${path.join(" → ")}: ${err.message}`);
    }
    return { dex: "Uniswap", amountOut: ethers.BigNumber.from("0") };
  }
}

module.exports = { getUniswapQuote };

