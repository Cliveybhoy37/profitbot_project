// debugQuote.js
require("dotenv").config();
const { ethers }    = require("ethers");
const provider      = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const { getBestQuote } = require("./scripts/utils/multiDexQuote");

(async () => {
  // pick a few representative token pairs
  const tests = [
    // stable-stable
    [process.env.DAI_POLYGON, process.env.USDC_POLYGON],
    // stable → MATIC
    [process.env.USDC_POLYGON, process.env.WMATIC_POLYGON],
    // ETH → stable
    [process.env.WETH_POLYGON, process.env.DAI_POLYGON]
  ];

  for (const [src, dst] of tests) {
    console.log(`\n📍 Testing ${src} → ${dst}`);
    for (let i = 0; i < 4; i++) {
      const amountIn = ethers.utils.parseUnits("100", 18);
      const { amountOut, dex } = await getBestQuote([src.toLowerCase(), dst.toLowerCase()], amountIn, provider);
      console.log(`  → quote #${i+1}: dex=${dex} out=${amountOut.toString()}`);
    }
  }
})();

