// scripts/checkChecksums.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const ENV_PATH = path.resolve(__dirname, "..", ".env");
let envText = fs.readFileSync(ENV_PATH, "utf8");

const envKeys = {
  // === Polygon ===
  DAI_POLYGON: process.env.DAI_POLYGON,
  USDC_POLYGON: process.env.USDC_POLYGON,
  USDT_POLYGON: process.env.USDT_POLYGON,
  WETH_POLYGON: process.env.WETH_POLYGON,
  WBTC_POLYGON: process.env.WBTC_POLYGON,
  FRAX_POLYGON: process.env.FRAX_POLYGON,
  AAVE_POLYGON: process.env.AAVE_POLYGON,
  LINK_POLYGON: process.env.LINK_POLYGON,
  GHO_POLYGON: process.env.GHO_POLYGON,
  LUSD_POLYGON: process.env.LUSD_POLYGON,
  CRV_POLYGON: process.env.CRV_POLYGON,
  BAL_POLYGON: process.env.BAL_POLYGON,
  MKR_POLYGON: process.env.MKR_POLYGON,
  GHST_POLYGON: process.env.GHST_POLYGON,
  XSGD_POLYGON: process.env.XSGD_POLYGON,
  EURE_POLYGON: process.env.EURE_POLYGON,
  JEUR_POLYGON: process.env.JEUR_POLYGON,
  WSTETH_POLYGON: process.env.WSTETH_POLYGON, 
  cbETH_POLYGON: process.env.cbETH_POLYGON,
  rETH_POLYGON: process.env.rETH_POLYGON,
  MATICX_POLYGON: process.env.MATICX_POLYGON,
  WPOL_POLYGON: process.env.WPOL_POLYGON,
  TEL_POLYGON: process.env.TEL_POLYGON,
  MTLSTR_POLYGON: process.env.MTLSTR_POLYGON,
  EGX_POLYGON: process.env.EGX_POLYGON,
  MSGLD_POLYGON: process.env.MSGLD_POLYGON,
  TRUMATIC_POLYGON: process.env.TRUMATIC_POLYGON,
  GYD_POLYGON: process.env.GYD_POLYGON,
  TETU_POLYGON: process.env.TETU_POLYGON,
  OLAS_POLYGON: process.env.OLAS_POLYGON,
  APE_POLYGON: process.env.APE_POLYGON,
  PAR_POLYGON: process.env.PAR_POLYGON,

  // === Arbitrum ===
  WETH_ARBITRUM: process.env.WETH_ARBITRUM,
  WBTC_ARBITRUM: process.env.WBTC_ARBITRUM,
  USDC_ARBITRUM: process.env.USDC_ARBITRUM,
  USDT_ARBITRUM: process.env.USDT_ARBITRUM,
  DAI_ARBITRUM: process.env.DAI_ARBITRUM,
  AAVE_ARBITRUM: process.env.AAVE_ARBITRUM,
  LINK_ARBITRUM: process.env.LINK_ARBITRUM,
  GHO_ARBITRUM: process.env.GHO_ARBITRUM,
};

console.log("🔍 Validating token addresses in .env...\n");

let updated = false;

for (const [key, rawAddress] of Object.entries(envKeys)) {
  if (!rawAddress) {
    console.log(`⚠️  ${key.padEnd(24)} → Missing`);
    continue;
  }

  try {
    const checksummed = ethers.utils.getAddress(rawAddress);
    if (rawAddress !== checksummed) {
      console.log(`♻️  ${key.padEnd(24)} → Fixing checksum`);
      const regex = new RegExp(`${key}=.*`, "i");
      envText = envText.replace(regex, `${key}=${checksummed}`);
      updated = true;
    } else {
      console.log(`✅ ${key.padEnd(24)} → ${checksummed}`);
    }
  } catch (err) {
    console.log(`❌ ${key.padEnd(24)} → Invalid: ${rawAddress}`);
  }
}

if (updated) {
  fs.writeFileSync(ENV_PATH, envText, "utf8");
  console.log("\n💾 .env file patched with corrected checksums.");
} else {
  console.log("\n✅ All token addresses valid. No changes needed.");
}

