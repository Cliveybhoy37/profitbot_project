const { ethers } = require("ethers");
const { SOR } = require("@balancer-labs/sdk");
const axios = require("axios");
require("dotenv").config();

const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC);
const CHAIN_ID = 137;

const USE_FORK_BLOCK = process.env.USE_FORK_BLOCK === "true";
const FORK_BLOCK = 72000000;
const blockTag = USE_FORK_BLOCK ? FORK_BLOCK : "latest";

// Dynamically pulled WETH token (WMATIC for Polygon)
const WMATIC = process.env.WMATIC_POLYGON;

// Balancer subgraph URL for Polygon V2
const SUBGRAPH_URL =
  "https://api.thegraph.com/subgraphs/name/balancer-labs/balancer-polygon-v2";

// Initialize Balancer SOR
const sor = new SOR({
  chainId: CHAIN_ID,
  provider,
  subgraphUrl: SUBGRAPH_URL,
  weth: WMATIC,
});

console.log("🔧 Legacy Balancer SOR initialized with WMATIC:", WMATIC);

async function getBalancerQuote(path, amountIn) {
  if (path.length !== 2) {
    console.warn("⚠️ Balancer quote requires exactly 2 tokens in path");
    return { dex: "Balancer", amountOut: ethers.BigNumber.from("0") };
  }

  const [tokenIn, tokenOut] = path;

  try {
    // Fetch pools from the subgraph
    await sor.fetchPools({
      fetchOnChain: false,
      block: { number: blockTag },
    });

    const gasPriceWei = ethers.BigNumber.from("30000000000");

    const swapInfo = await sor.getSwaps(
      tokenIn,
      tokenOut,
      "swapExactIn",
      amountIn,
      { gasPrice: gasPriceWei }
    );

    if (
      !swapInfo ||
      !swapInfo.returnAmount ||
      swapInfo.returnAmount.isZero()
    ) {
      console.warn("⚠️ No Balancer route found.");
      return { dex: "Balancer", amountOut: ethers.BigNumber.from("0") };
    }

    return {
      dex: "Balancer",
      amountOut: swapInfo.returnAmount,
    };
  } catch (err) {
    console.warn(`⚠️ Balancer quote failed: ${err.message}`);
    return { dex: "Balancer", amountOut: ethers.BigNumber.from("0") };
  }
}

module.exports = { getBalancerQuote };

