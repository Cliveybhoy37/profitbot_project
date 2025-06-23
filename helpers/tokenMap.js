// helpers/tokenMap.js
// ----------------------------------------------------------------------------
// 1. Load whichever auto-env (.env.auto or .env.auto.0x) is active
// 2. Build tokenMap & addressToTokenMap dynamically from *_POLYGON vars
// 3. Provide tiny quality-of-life fixes (USDC/USDT/EUROC 6 dec, MATIC alias)
// ----------------------------------------------------------------------------
const fs        = require("fs");
const dotenv    = require("dotenv");
const { ethers } = require("ethers");

// ── 1. env loader ───────────────────────────────────────────────────────────
const USE_0X_ENV = process.env.USE_0X_ENV === "true";
const envPath    = USE_0X_ENV ? ".env.auto.0x" : ".env.auto";

if (fs.existsSync(envPath)) {
  Object.assign(process.env, dotenv.parse(fs.readFileSync(envPath)));
  console.log(`🔁 tokenMap loaded from ${envPath}`);
} else {
  console.warn(`⚠️ ${envPath} not found – falling back to .env`);
  dotenv.config();
}

// ── 2. dynamic token discovery  ---------------------------------------------
// core stables get 6 decimals; everything else default 18 unless overridden
const STABLE_6_DEC = new Set(["USDC", "USDT", "EUROC"]);

// whitelist of actual ERC20 tokens we want in the map
const REAL_TOKENS = new Set([
  "DAI", "USDC", "USDT", "WETH", "WBTC", "WMATIC",
  "WSTETH", "AAVE", "BAL", "CRV", "COMP", "LINK",
  "UNI", "SUSHI", "YFI", "JEUR", "GHST",
  "MKR", "FRAX", "SNX"
]);

const tokenMap          = {};
const addressToTokenMap = {};

for (const [key, value] of Object.entries(process.env)) {
  if (!key.endsWith("_POLYGON")) continue;

  // only treat “real” tokens—skip ProfitBot & other infra addresses
  const sym = key.replace("_POLYGON", "");
  if (!REAL_TOKENS.has(sym)) continue;

  if (!ethers.utils.isAddress(value)) continue;

  const address = ethers.utils.getAddress(value);
  tokenMap[sym] = {
    symbol: sym,
    address,
    decimals: STABLE_6_DEC.has(sym) ? 6 : 18,
  };
  addressToTokenMap[address.toLowerCase()] = tokenMap[sym];
}

// ── 3. convenience alias: MATIC → WMATIC address (if only WMATIC present) ---
if (!tokenMap.MATIC && tokenMap.WMATIC) {
  tokenMap.MATIC = { ...tokenMap.WMATIC, symbol: "MATIC" };
  console.log("🔗 Alias set: MATIC → WMATIC address");
}

console.log(`✅ tokenMap initialised with ${Object.keys(tokenMap).length} tokens`);

module.exports = {
  tokenMap,
  addressToTokenMap,
  ...tokenMap,            // legacy named exports
};

