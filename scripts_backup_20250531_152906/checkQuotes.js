// scripts/checkQuotes.js
require("dotenv").config();
const { ethers } = require("hardhat");
const { getBestQuote } = require("./utils/multiDexQuote");

const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC);

const SYMBOL_TO_ADDRESS = {
  USDC: process.env.USDC_POLYGON,
  wstETH: process.env.WSTETH_POLYGON,
  DAI: process.env.DAI_POLYGON,
};

async function checkRoute(label, path, amount, decimals) {
  console.log(`🔍 Checking route: ${label}`);
  const quote = await getBestQuote(path, amount, provider);

  if (!quote || quote.amountOut.isZero()) {
    console.log(`❌ No quote for ${label}`);
  } else {
    const formatted = ethers.utils.formatUnits(quote.amountOut, decimals);
    console.log(`✅ ${label} → ${formatted} via ${quote.dex}`);
  }

  console.log();
}

async function main() {
  const usdcDecimals = 6;
  const erc20 = new ethers.Contract(SYMBOL_TO_ADDRESS["DAI"], ["function decimals() view returns (uint8)"], provider);
  const daiDecimals = await erc20.decimals();

  const amountIn = ethers.utils.parseUnits("500", usdcDecimals);

  await checkRoute(
    "USDC → wstETH",
    [SYMBOL_TO_ADDRESS.USDC, SYMBOL_TO_ADDRESS.wstETH],
    amountIn,
    18
  );

  // Get intermediate amountOut from first leg
  const firstQuote = await getBestQuote(
    [SYMBOL_TO_ADDRESS.USDC, SYMBOL_TO_ADDRESS.wstETH],
    amountIn,
    provider
  );

  if (!firstQuote || firstQuote.amountOut.isZero()) {
    console.error("❌ Cannot proceed to second leg due to zero output on first leg.");
    return;
  }

  await checkRoute(
    "wstETH → DAI",
    [SYMBOL_TO_ADDRESS.wstETH, SYMBOL_TO_ADDRESS.DAI],
    firstQuote.amountOut,
    daiDecimals
  );
}

main().catch((err) => {
  console.error("❌ Error in quote check:", err);
  process.exit(1);
});

