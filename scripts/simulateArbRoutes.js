// scripts/simulateArbRoutes.js
require("dotenv").config();
const fs = require("fs");
const { ethers } = require("ethers");
const { getBalancerQuote } = require("./utils/balancerQuote");

const AMOUNT_IN = ethers.utils.parseUnits("1000", 18); // 1000 token units
const MIN_PROFIT = ethers.utils.parseUnits(process.env.MIN_USD_PROFIT || "1", 18);
const MAX_SLIPPAGE = 3;

const symbolToAddress = {
  DAI: process.env.DAI_POLYGON,
  USDC: process.env.USDC_POLYGON,
  USDT: process.env.USDT_POLYGON,
  AAVE: process.env.AAVE_POLYGON,
  UNI: process.env.UNI_POLYGON,
  BAL: process.env.BAL_POLYGON,
  WSTETH: process.env.WSTETH_POLYGON,
  FRAX: process.env.FRAX_POLYGON,
  CRV: process.env.CRV_POLYGON,
  LINK: process.env.LINK_POLYGON,
  YFI: process.env.YFI_POLYGON,
  MKR: process.env.MKR_POLYGON,
  WBTC: process.env.WBTC_POLYGON,
  SNX: process.env.SNX_POLYGON,
  SUSHI: process.env.SUSHI_POLYGON,
  MATIC: process.env.MATIC_POLYGON,
  WMATIC: process.env.WMATIC_POLYGON,
  WETH: process.env.WETH_POLYGON
};

const routes = JSON.parse(fs.readFileSync("./arb_routes.json", "utf-8"));

async function simulateRoutes() {
  console.log(`🔁 Simulating ${routes.length} routes from arb_routes.json...\n`);
  
  for (const route of routes) {
    const label = route.join(" → ");
    console.log(`🔹 Route: ${label}`);

    let currentAmount = AMOUNT_IN;
    let valid = true;

    for (let i = 0; i < route.length - 1; i++) {
      const tokenIn = symbolToAddress[route[i]];
      const tokenOut = symbolToAddress[route[i + 1]];
      if (!tokenIn || !tokenOut) {
        console.warn(`❌ Missing token address for ${route[i]} or ${route[i + 1]}`);
        valid = false;
        break;
      }

      const quote = await getBalancerQuote([tokenIn, tokenOut], currentAmount);
      if (quote.amountOut.eq(0)) {
        console.warn(`⚠️ No liquidity/route for ${route[i]} → ${route[i + 1]}`);
        valid = false;
        break;
      }

      currentAmount = quote.amountOut;
    }

    if (!valid) {
      console.log("⏭️ Skipping route.\n");
      continue;
    }

    const profit = currentAmount.sub(AMOUNT_IN);
    const profitFmt = ethers.utils.formatUnits(profit, 18);
    console.log(`💰 Profit: ${profitFmt}`);

    if (profit.lt(MIN_PROFIT)) {
      console.log("⚠️ Profit below threshold. Skipping.\n");
    } else {
      console.log("✅ PROFITABLE ROUTE FOUND!\n");
    }
  }
}

simulateRoutes().catch((err) => {
  console.error("💥 Simulation Error:", err.message);
});

