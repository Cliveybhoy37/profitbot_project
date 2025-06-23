require("dotenv").config();
const { ethers } = require("ethers");
const { getBalancerQuote } = require("./balancerQuote");

const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC);

const SYMBOL_TO_ADDRESS = {
  USDC: process.env.USDC_POLYGON,
  DAI: process.env.DAI_POLYGON,
  BAL: process.env.BAL_POLYGON,
  WETH: process.env.WETH_POLYGON,
};

const testCases = [
  ["USDC", "DAI"],
  ["DAI", "BAL"],
  ["WETH", "DAI"],
];

const testAmount = ethers.utils.parseUnits("50", 6); // 50 USDC as input

(async () => {
  console.log(`🧪 Testing getBalancerQuote() under fork mode = ${process.env.USE_FORK_BLOCK}`);

  for (const [symbolIn, symbolOut] of testCases) {
    const tokenIn = SYMBOL_TO_ADDRESS[symbolIn];
    const tokenOut = SYMBOL_TO_ADDRESS[symbolOut];

    if (!tokenIn || !tokenOut) {
      console.warn(`⚠️ Missing address mapping for ${symbolIn} or ${symbolOut}`);
      continue;
    }

    const quote = await getBalancerQuote([tokenIn, tokenOut], testAmount);

    const readable = ethers.utils.formatUnits(quote.amountOut, 18);
    console.log(`🔄 ${symbolIn} → ${symbolOut} via ${quote.dex}: ${readable}`);
  }
})();

