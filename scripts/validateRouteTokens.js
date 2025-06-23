// scripts/validateRouteTokens.js
require("dotenv").config();
const fs = require("fs");
const { ethers } = require("hardhat");

const arbRoutes = JSON.parse(fs.readFileSync("arb_routes.json", "utf8"));

const SYMBOL_TO_ADDRESS = {
  USDC: process.env.USDC_POLYGON,
  DAI: process.env.DAI_POLYGON,
  WSTETH: process.env.WSTETH_POLYGON,
  WETH: process.env.WETH_POLYGON,
  WBTC: process.env.WBTC_POLYGON,
  AAVE: process.env.AAVE_POLYGON,
  FRAX: process.env.FRAX_POLYGON,
  GHO: process.env.GHO_POLYGON,
  LINK: process.env.LINK_POLYGON,
  LUSD: process.env.LUSD_POLYGON,
  CRV: process.env.CRV_POLYGON,
  BAL: process.env.BAL_POLYGON,
  MKR: process.env.MKR_POLYGON,
  cbETH: process.env.cbETH_POLYGON,
  rETH: process.env.rETH_POLYGON,
  UNI: process.env.UNI_POLYGON,
  SUSHI: process.env.SUSHI_POLYGON,
  COMP: process.env.COMP_POLYGON,
  YFI: process.env.YFI_POLYGON,
  WMATIC: process.env.WMATIC_POLYGON,
  MATIC: process.env.MATIC_POLYGON,
};

async function main() {
  const provider = ethers.provider;
  const uniqueSymbols = new Set(arbRoutes.flat());

  console.log("🔍 Validating symbols from arb_routes.json against .env and chain...\n");

  for (const symbol of uniqueSymbols) {
    const address = SYMBOL_TO_ADDRESS[symbol];
    if (!address) {
      console.error(`❌ Missing .env entry for: ${symbol}`);
      continue;
    }

    let checksummed;
    try {
      checksummed = ethers.utils.getAddress(address);
    } catch (e) {
      console.error(`❌ ${symbol} → Invalid checksum: ${address}`);
      continue;
    }

    try {
      const erc20 = new ethers.Contract(
        checksummed,
        ["function symbol() view returns (string)", "function decimals() view returns (uint8)"],
        provider
      );
      const tokenSymbol = await erc20.symbol();
      const decimals = await erc20.decimals();

      const match = tokenSymbol.toUpperCase() === symbol.toUpperCase();
      console.log(`${match ? "✅" : "⚠️"} ${symbol.padEnd(7)} → ${checksummed} | symbol: ${tokenSymbol}, decimals: ${decimals}`);
    } catch (err) {
      console.error(`❌ ${symbol} → Failed on-chain read: ${err.message}`);
    }
  }

  console.log("\n🧪 Validation complete.");
}

main().catch((err) => {
  console.error("💥 Script error:", err);
  process.exit(1);
});

