// scripts/profitMonitor.js

const TOKENS = require("./tokens");

const ROUTES = [
  // --- Polygon routes ---
  { srcToken: TOKENS.polygon.DAI,     destToken: TOKENS.polygon.WETH,    network: "polygon" },
  { srcToken: TOKENS.polygon.WETH,    destToken: TOKENS.polygon.DAI,     network: "polygon" },
  // { srcToken: TOKENS.polygon.DAI,     destToken: TOKENS.polygon.USDC,    network: "polygon" },
  // { srcToken: TOKENS.polygon.USDC,    destToken: TOKENS.polygon.DAI,     network: "polygon" },
  // { srcToken: TOKENS.polygon.USDC,    destToken: TOKENS.polygon.WBTC,    network: "polygon" },
  // { srcToken: TOKENS.polygon.WBTC,    destToken: TOKENS.polygon.USDC,    network: "polygon" },
  // { srcToken: TOKENS.polygon.WETH,    destToken: TOKENS.polygon.ONEINCH, network: "polygon" },
  // { srcToken: TOKENS.polygon.ONEINCH, destToken: TOKENS.polygon.WETH,    network: "polygon" },

  // --- Arbitrum routes ---
  { srcToken: TOKENS.arbitrum.DAI,    destToken: TOKENS.arbitrum.WETH,   network: "arbitrum" },
  { srcToken: TOKENS.arbitrum.WETH,   destToken: TOKENS.arbitrum.DAI,    network: "arbitrum" },
  // { srcToken: TOKENS.arbitrum.DAI,    destToken: TOKENS.arbitrum.USDCe,  network: "arbitrum" },
  // { srcToken: TOKENS.arbitrum.USDCe,  destToken: TOKENS.arbitrum.DAI,    network: "arbitrum" },
  // { srcToken: TOKENS.arbitrum.WETH,   destToken: TOKENS.arbitrum.FUSE,   network: "arbitrum" },
  // { srcToken: TOKENS.arbitrum.FUSE,   destToken: TOKENS.arbitrum.WETH,   network: "arbitrum" },
];

module.exports = { ROUTES };

