require("dotenv").config();
require("reflect-metadata");
const { UiPoolDataProvider } = require("@aave/contract-helpers");
const { ethers } = require("ethers");

const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC);

const dataProviderAddress = process.env.UI_POOL_DATA_PROVIDER_POLYGON;
const poolAddressProvider = process.env.POOL_ADDRESS_PROVIDER_POLYGON;

// Map flashloan caps from .env (can expand later)
const FLASHLOAN_CAPS = {
  DAI: parseFloat(process.env.FLASHLOAN_CAP_DAI || "0"),
  USDC: parseFloat(process.env.FLASHLOAN_CAP_USDC || "0"),
  WETH: parseFloat(process.env.FLASHLOAN_CAP_WETH || "0"),
};

async function main() {
  console.log("🔍 Scanning Aave V3 tokens for flashloan viability...\n");

  const uiPoolDataProvider = new UiPoolDataProvider({
    uiPoolDataProviderAddress: dataProviderAddress,
    provider,
    chainId: 137,
  });

  try {
    const { reservesData } = await uiPoolDataProvider.getReservesHumanized({
      lendingPoolAddressProvider: poolAddressProvider,
    });

    const viable = [];

    for (const res of reservesData) {
      const cap = FLASHLOAN_CAPS[res.symbol];
      if (!cap || !res.borrowingEnabled) continue;

      const decimals = parseInt(res.decimals);
      const liquidity = parseFloat(ethers.utils.formatUnits(res.availableLiquidity, decimals));

      if (liquidity >= cap) {
        viable.push({
          symbol: res.symbol,
          tokenAddress: res.underlyingAsset,
          liquidity,
        });
      }
    }

    if (viable.length === 0) {
      console.log("⚠️ No tokens currently exceed configured flashloan caps.\nCheck thresholds in .env.");
      return;
    }

    console.log("✅ Flashloan-ready tokens:\n");
    viable.forEach(({ symbol, tokenAddress, liquidity }) => {
      console.log(`• ${symbol} (${tokenAddress})\n  Liquidity: ${liquidity.toLocaleString()} ${symbol}\n`);
    });

  } catch (err) {
    console.error("❌ Failed to scan reserves:", err.message);
  }
}

main();

