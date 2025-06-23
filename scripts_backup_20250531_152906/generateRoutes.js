// scripts/generateRoutes.js
require("dotenv").config();
const fs = require("fs");
const { ethers } = require("ethers");

const routeOutputPath = "./arb_routes.json";

// Step 1: Load symbol → address from .env
const SYMBOL_TO_ADDRESS = {
  // Stablecoins
  DAI: process.env.DAI_POLYGON,
  USDC: process.env.USDC_POLYGON,
  // USDT intentionally excluded for checksum issues

  // Governance / Arbitrage
  GHO: process.env.GHO_POLYGON,
  LUSD: process.env.LUSD_POLYGON,
  CRV: process.env.CRV_POLYGON,
  BAL: process.env.BAL_POLYGON,
  AAVE: process.env.AAVE_POLYGON,
  LINK: process.env.LINK_POLYGON,
  MKR: process.env.MKR_POLYGON,

  // ETH / BTC
  WETH: process.env.WETH_POLYGON,
  WBTC: process.env.WBTC_POLYGON,
  cbETH: process.env.cbETH_POLYGON,
  rETH: process.env.rETH_POLYGON,
  wstETH: process.env.WSTETH_POLYGON, // ✅ FIXED: Correct casing for .env key

  // Other
  FRAX: process.env.FRAX_POLYGON,
};

// Step 2: Validate checksums and build reverse map
const ADDRESS_TO_SYMBOL = {};

for (const [symbol, addr] of Object.entries(SYMBOL_TO_ADDRESS)) {
  try {
    const checksummed = ethers.utils.getAddress(addr);
    SYMBOL_TO_ADDRESS[symbol] = checksummed;
    ADDRESS_TO_SYMBOL[checksummed.toLowerCase()] = symbol;
  } catch (err) {
    console.warn(`⚠️ Skipping invalid address for ${symbol}: ${addr}`);
    delete SYMBOL_TO_ADDRESS[symbol];
  }
}

const TOKENS = Object.keys(SYMBOL_TO_ADDRESS);

// Step 3: Generate A → B → A routes
const rawRoutes = [];

for (let i = 0; i < TOKENS.length; i++) {
  for (let j = 0; j < TOKENS.length; j++) {
    if (i !== j) {
      const A = TOKENS[i];
      const B = TOKENS[j];

      const A_addr = SYMBOL_TO_ADDRESS[A];
      const B_addr = SYMBOL_TO_ADDRESS[B];

      rawRoutes.push([A_addr, B_addr, A_addr]);
    }
  }
}

// Step 4: Convert raw address routes to symbol routes
const symbolRoutes = rawRoutes
  .map(route => route.map(addr => ADDRESS_TO_SYMBOL[addr.toLowerCase()]))
  .filter(route => route.every(symbol => symbol)); // remove incomplete

// Step 5: Write to file
fs.writeFileSync(routeOutputPath, JSON.stringify(symbolRoutes, null, 2));
console.log(`✅ Generated ${symbolRoutes.length} symbol-based routes at ${routeOutputPath}`);

