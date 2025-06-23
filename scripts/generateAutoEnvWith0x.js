// scripts/generateAutoEnvWith0x.js
require("dotenv").config();
const fs = require("fs");
const axios = require("axios");
const { ethers } = require("ethers");

const PARASWAP_TOKENS_API = "https://apiv5.paraswap.io/tokens/137";
const ZEROX_API = "https://polygon.api.0x.org/swap/v1/price";
const OUTPUT_PATH = "./.env.auto.0x";
const BRIDGE_TOKEN = "USDC"; // Used for test swaps
const ZEROX_API_KEY = process.env.ZEROX_API_KEY || "533a5a30-aa65-4f2f-9acf-f4744f275a61";
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// 🧠 Core token registry
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

// ✅ Check which tokens are supported on Paraswap
async function getParaswapSupportedAddresses() {
  try {
    const { data } = await axios.get(PARASWAP_TOKENS_API);
    return new Set(data.tokens.map((t) => t.address.toLowerCase()));
  } catch (err) {
    console.error("❌ Failed to fetch Paraswap tokens:", err.message);
    return new Set();
  }
}

// 🔁 Test fallback via 0x API
async function test0xQuote(srcAddr, destAddr, decimals) {
  try {
    const amount = ethers.utils.parseUnits("25", decimals).toString();
    const res = await axios.get(
      `${ZEROX_API}?buyToken=${destAddr}&sellToken=${srcAddr}&sellAmount=${amount}`,
      {
        headers: {
          "0x-api-key": ZEROX_API_KEY,
        },
      }
    );
    return !!res.data?.price && Number(res.data.price) > 0;
  } catch {
    return false;
  }
}

// 🧪 Master process
async function main() {
  const psSupported = await getParaswapSupportedAddresses();
  const bridgeAddr = SYMBOL_TO_ADDRESS[BRIDGE_TOKEN];
  const valid = {};

  console.log("🔍 Checking token support on Paraswap and 0x...\n");

  for (const [symbol, addr] of Object.entries(SYMBOL_TO_ADDRESS)) {
    if (!addr) {
      console.warn(`⚠️ Missing address for ${symbol}, skipping.`);
      continue;
    }

    const decimals = ["USDC", "USDT"].includes(symbol) ? 6 : 18;
    const isParaswap = psSupported.has(addr.toLowerCase());

    if (isParaswap) {
      console.log(`✅ ${symbol} supported by Paraswap`);
      valid[symbol] = addr;
      continue;
    }

    const fallback = await test0xQuote(addr, bridgeAddr, decimals);
    await sleep(150);

    if (fallback) {
      console.log(`🪂 ${symbol} supported via 0x`);
      valid[symbol] = addr;
    } else {
      console.log(`⛔ ${symbol} unsupported (Paraswap + 0x)`);
    }
  }

  const lines = Object.entries(valid).map(([symbol, addr]) => `${symbol}_POLYGON=${addr}`);

  // ➕ Ensure 0x key is added
  lines.push(`ZEROX_API_KEY=${ZEROX_API_KEY}`);

  fs.writeFileSync(OUTPUT_PATH, lines.join("\n") + "\n");
  console.log(`\n✅ Saved ${lines.length} entries to ${OUTPUT_PATH}`);
}

main();

