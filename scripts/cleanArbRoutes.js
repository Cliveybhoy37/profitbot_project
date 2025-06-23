require("dotenv").config();
const fs = require("fs");
const { getBestQuote } = require("./utils/multiDexQuote");
const { ethers } = require("ethers");
const { isParaswapSupported } = require("../utils/paraswapTokens");

const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC);
const rawRoutes = JSON.parse(fs.readFileSync("./arb_routes.json"));

const SYMBOL_TO_ADDRESS = {
  DAI: process.env.DAI_POLYGON,
  USDC: process.env.USDC_POLYGON,
  USDT: process.env.USDT_POLYGON,
  FRAX: process.env.FRAX_POLYGON,
  WBTC: process.env.WBTC_POLYGON,
  WSTETH: process.env.WSTETH_POLYGON,
  AAVE: process.env.AAVE_POLYGON,
  LINK: process.env.LINK_POLYGON,
  MKR: process.env.MKR_POLYGON,
  YFI: process.env.YFI_POLYGON,
  CRV: process.env.CRV_POLYGON,
  BAL: process.env.BAL_POLYGON,
  UNI: process.env.UNI_POLYGON,
  SUSHI: process.env.SUSHI_POLYGON,
  SNX: process.env.SNX_POLYGON,
};

function getAddress(symbol) {
  return SYMBOL_TO_ADDRESS[symbol.toUpperCase()] || null;
}

(async () => {
  const cleaned = [];

  for (const [token0, token1, token2] of rawRoutes) {
    const path1 = [getAddress(token0), getAddress(token1)];
    const path2 = [getAddress(token1), getAddress(token2)];

    if (path1.includes(null) || path2.includes(null)) {
      console.warn(`⚠️ Missing address mapping: ${token0} → ${token1} → ${token2}`);
      continue;
    }

    if (!isParaswapSupported(path1[0]) || !isParaswapSupported(path1[1]) || !isParaswapSupported(path2[1])) {
      console.warn(`⛔ Unsupported on Paraswap: ${token0} → ${token1} → ${token2}`);
      continue;
    }

    try {
      const testAmount = ethers.utils.parseUnits("10", token0 === "USDC" ? 6 : 18);
      const quote1 = await getBestQuote(path1, testAmount, provider);
      if (!quote1 || quote1.amountOut.isZero()) throw new Error("quote1 failed");

      const quote2 = await getBestQuote(path2, quote1.amountOut, provider);
      if (!quote2 || quote2.amountOut.isZero()) throw new Error("quote2 failed");

      cleaned.push([token0, token1, token2]);
      console.log(`✅ Valid: ${token0} → ${token1} → ${token2}`);
    } catch (err) {
      console.warn(`❌ Removed: ${token0} → ${token1} → ${token2} - ${err.message}`);
    }
  }

  fs.writeFileSync("./arb_routes.json", JSON.stringify(cleaned, null, 2));
  console.log(`\n🧹 Clean complete. ${cleaned.length} valid routes saved.`);
})();

