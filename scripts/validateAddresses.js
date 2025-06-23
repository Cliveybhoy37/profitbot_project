// scripts/validateAddresses.js
require("dotenv").config();
const { ethers } = require("hardhat");

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
  CBETH: process.env.cbETH_POLYGON,
  RETH: process.env.rETH_POLYGON,
  UNI: process.env.UNI_POLYGON,
  SUSHI: process.env.SUSHI_POLYGON,
  COMP: process.env.COMP_POLYGON,
  YFI: process.env.YFI_POLYGON,
  WMATIC: process.env.WMATIC_POLYGON,
  MATIC: process.env.MATIC_POLYGON,
};

async function main() {
  const provider = ethers.provider;

  console.log("🔍 Validating token addresses...\n");

  for (const [symbol, address] of Object.entries(SYMBOL_TO_ADDRESS)) {
    if (!address) {
      console.warn(`❌ ${symbol} → missing in .env`);
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
        ["function decimals() view returns (uint8)", "function symbol() view returns (string)"],
        provider
      );
      const decimals = await erc20.decimals();
      const tokenSymbol = await erc20.symbol();

      console.log(`✅ ${symbol.padEnd(6)} → ${checksummed} | symbol: ${tokenSymbol}, decimals: ${decimals}`);
    } catch (err) {
      console.error(`❌ ${symbol} → Error reading contract at ${checksummed}: ${err.message}`);
    }
  }
}

main().catch((err) => {
  console.error("❌ Script error:", err);
  process.exit(1);
});

