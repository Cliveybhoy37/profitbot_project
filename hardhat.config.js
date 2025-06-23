// hardhat.config.js
require("dotenv").config();
require("@nomiclabs/hardhat-ethers");

// ── optional local main-net fork ─────────────────────────────
const USE_FORK = process.env.USE_FORK_BLOCK === "true";
const POLYGON_SNAPSHOT = 72_000_000;   // change if you prefer a newer block

module.exports = {
  defaultNetwork: "hardhat",

  networks: {
    hardhat: {
      chainId: 137,
      hardfork: "merge",
      ...(USE_FORK && {
        forking: {
          url: process.env.ALCHEMY_POLYGON,
          blockNumber: POLYGON_SNAPSHOT
        }
      })
    },

    polygon:  { url: process.env.POLYGON_RPC,  accounts: [process.env.PRIVATE_KEY] },
    arbitrum: { url: process.env.ARBITRUM_RPC, accounts: [process.env.PRIVATE_KEY] },
    localhost:{ url: "http://127.0.0.1:8545" }
  },

  // dual-compiler – main 0.8.x plus an optional 0.7.6 fallback
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          viaIR: true
        }
      },
      { version: "0.7.6" }   // harmless; keeps options open for legacy 0.7 code
    ]
  }
};

