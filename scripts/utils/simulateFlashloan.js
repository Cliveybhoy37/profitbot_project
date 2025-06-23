const { ethers } = require("ethers");

// Approximate gas used for 2-hop swap (Uniswap/Sushi): ~250k-400k
const DEFAULT_SWAP_GAS = 300000; // adjustable per DEX later
const DEFAULT_GAS_PRICE_GWEI = 35; // can pull live later

// Estimate gas cost in USD
async function estimateGasCostUSD(provider, gasUsed = DEFAULT_SWAP_GAS, gasPriceGwei = DEFAULT_GAS_PRICE_GWEI) {
  const gasPrice = ethers.utils.parseUnits(gasPriceGwei.toString(), "gwei");
  const ethPerTx = gasPrice.mul(gasUsed);
  const ethUsd = await fetchEthUsd(provider);

  const costInUsd = parseFloat(ethers.utils.formatEther(ethPerTx)) * ethUsd;
  return costInUsd;
}

// Get ETH/USD price from Chainlink oracle or fallback
async function fetchEthUsd(provider) {
  const fallback = 3500; // just in case
  try {
    const feed = new ethers.Contract(
      "0xAB594600376Ec9fD91F8e885dADF0CE036862dE0", // ETH/USD Chainlink on Polygon
      ["function latestAnswer() view returns (int256)"],
      provider
    );
    const answer = await feed.latestAnswer();
    return parseFloat(ethers.utils.formatUnits(answer, 8));
  } catch (err) {
    console.warn("⚠️ Failed to fetch ETH/USD price, using fallback.");
    return fallback;
  }
}

module.exports = {
  estimateGasCostUSD
};

