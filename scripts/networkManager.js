const { ethers } = require("ethers");
require("dotenv").config();

const NETWORKS = {
  polygon: process.env.POLYGON_RPC,
  arbitrum: process.env.ARBITRUM_RPC,
  optimism: process.env.OPTIMISM_RPC,
  ethereum: process.env.ETHEREUM_RPC,
};

async function switchNetwork(network) {
  if (!NETWORKS[network]) {
    throw new Error(`❌ Unsupported network: ${network}`);
  }
  return new ethers.JsonRpcProvider(NETWORKS[network]);
}

module.exports = { switchNetwork };

