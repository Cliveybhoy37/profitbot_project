require("dotenv").config();
const fs = require("fs");
const axios = require("axios");
const { ethers } = require("ethers");

const PARASWAP_TOKENS_URL = "https://apiv5.paraswap.io/tokens/137";
const OUTPUT_PATH = "./.env.auto";

// === Load local tokens from .env ===
const SYMBOL_TO_ADDRESS = {
  DAI: process.env.DAI_POLYGON,
  USDC: process.env.USDC_POLYGON,
  USDT: process.env.USDT_POLYGON,
  FRAX: process.env.FRAX_POLYGON,
  GHO: process.env.GHO_POLYGON,
  LUSD: process.env.LUSD_POLYGON,
  WETH: process.env.WETH_POLYGON,
  WBTC: process.env.WBTC_POLYGON,
  WMATIC: process.env.WMATIC_POLYGON,
  WSTETH: process.env.WSTETH_POLYGON,
  cbETH: process.env.cbETH_POLYGON,
  rETH: process.env.rETH_POLYGON,
  AAVE: process.env.AAVE_POLYGON,
  BAL: process.env.BAL_POLYGON,
  CRV: process.env.CRV_POLYGON,
  COMP: process.env.COMP_POLYGON,
  LINK: process.env.LINK_POLYGON,
  MKR: process.env.MKR_POLYGON,
  SUSHI: process.env.SUSHI_POLYGON,
  UNI: process.env.UNI_POLYGON,
  SNX: process.env.SNX_POLYGON,
  YFI: process.env.YFI_POLYGON,
  EGX: process.env.EGX_POLYGON,
  EURE: process.env.EURE_POLYGON,
  GHST: process.env.GHST_POLYGON,
  GYD: process.env.GYD_POLYGON,
  JEUR: process.env.JEUR_POLYGON,
  PAR: process.env.PAR_POLYGON,
  XSGD: process.env.XSGD_POLYGON,
};

async function main() {
  // ✅ Fetch official Paraswap-supported tokens on Polygon
  let supportedTokens;
  try {
    const { data } = await axios.get(PARASWAP_TOKENS_URL);
    supportedTokens = new Set(data.tokens.map(t => t.address.toLowerCase()));
  } catch (err) {
    console.error("❌ Failed to fetch Paraswap token list:", err.message);
    return;
  }

  const valid = {};
  for (const [symbol, addr] of Object.entries(SYMBOL_TO_ADDRESS)) {
    if (!addr) {
      console.warn(`⚠️ Skipping missing address for ${symbol}`);
      continue;
    }

    const checksum = ethers.utils.getAddress(addr);
    const isSupported = supportedTokens.has(checksum.toLowerCase());

    if (isSupported) {
      valid[symbol] = checksum;
      console.log(`✅ ${symbol} is supported by Paraswap`);
    } else {
      console.log(`⛔ ${symbol} not supported by Paraswap`);
    }
  }

  // 💾 Write to .env.auto
  const lines = Object.entries(valid).map(([symbol, addr]) => `${symbol}_POLYGON=${addr}`);
  fs.writeFileSync(OUTPUT_PATH, lines.join("\n") + "\n");
  console.log(`\n✅ Saved ${lines.length} supported tokens to ${OUTPUT_PATH}`);
}

main();

