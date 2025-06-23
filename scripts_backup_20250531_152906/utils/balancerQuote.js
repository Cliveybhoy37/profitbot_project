// scripts/utils/balancerQuote.js
const { ethers } = require("ethers");
const { BalancerSDK, Network } = require("@balancer-labs/sdk");

const sdk = new BalancerSDK({
  network: Network.POLYGON,
  rpcUrl: process.env.POLYGON_RPC,
});

async function getBalancerQuote(path, amountIn) {
  if (path.length !== 2) return { dex: "Balancer", amountOut: ethers.BigNumber.from("0") };

  const [tokenIn, tokenOut] = path;

  try {
    const swapInfo = await sdk.swaps.findRouteGivenIn({
      tokenIn,
      tokenOut,
      amount: amountIn.toString(),
      gasPrice: "30000000000", // 30 Gwei as string
    });

    if (!swapInfo || !swapInfo.returnAmount) {
      throw new Error("No Balancer route found.");
    }

    return {
      dex: "Balancer",
      amountOut: ethers.BigNumber.from(swapInfo.returnAmount),
    };
  } catch (err) {
    console.warn(`Balancer quote failed: ${err.message}`);
    return { dex: "Balancer", amountOut: ethers.BigNumber.from("0") };
  }
}

module.exports = { getBalancerQuote };

