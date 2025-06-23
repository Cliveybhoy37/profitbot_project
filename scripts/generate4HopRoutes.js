// scripts/generate4HopRoutes.js
require("dotenv").config();
const fs = require("fs");
const { ethers } = require("ethers");

const outputPath = "./arb_routes_looped.json";

// Load token addresses from environment (auto-generated .env.auto.0x preferred)
const SYMBOL_TO_ADDRESS = {};
const whitelist = [
  "DAI", "USDC", "USDT", "FRAX", "WETH", "WBTC", "WMATIC", "WSTETH",
  "AAVE", "BAL", "CRV", "COMP", "LINK", "SUSHI", "UNI", "YFI", "GHST", "JEUR"
];

for (const symbol of whitelist) {
  const key = `${symbol}_POLYGON`;
  if (process.env[key]) {
    SYMBOL_TO_ADDRESS[symbol] = process.env[key];
  }
}

// Validate checksums
const ADDRESS_TO_SYMBOL = {};
for (const [symbol, addr] of Object.entries(SYMBOL_TO_ADDRESS)) {
  try {
    const checksummed = ethers.utils.getAddress(addr);
    SYMBOL_TO_ADDRESS[symbol] = checksummed;
    ADDRESS_TO_SYMBOL[checksummed.toLowerCase()] = symbol;
  } catch {
    console.warn(`⚠️ Skipping invalid address for ${symbol}`);
    delete SYMBOL_TO_ADDRESS[symbol];
  }
}

const TOKENS = Object.keys(SYMBOL_TO_ADDRESS);
const routes = [];

// A → B → C → A (must be unique and non-repeating)
for (let i = 0; i < TOKENS.length; i++) {
  for (let j = 0; j < TOKENS.length; j++) {
    for (let k = 0; k < TOKENS.length; k++) {
      if (i !== j && j !== k && k !== i) {
        const A = TOKENS[i];
        const B = TOKENS[j];
        const C = TOKENS[k];
        routes.push([A, B, C, A]);
      }
    }
  }
}

fs.writeFileSync(outputPath, JSON.stringify(routes, null, 2));
console.log(`✅ Generated ${routes.length} 4-hop looped routes to ${outputPath}`);

