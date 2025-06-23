require("dotenv").config();
require("reflect-metadata"); // required by Aave contract helpers
const { UiPoolDataProvider } = require("@aave/contract-helpers");
const { ethers } = require("ethers");

async function main() {
  console.log("✅ Querying Aave V3 Reserve Data on Polygon...\n");

  const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_RPC);

  const dataProviderAddress = process.env.UI_POOL_DATA_PROVIDER_POLYGON;
  const poolAddressProvider = process.env.POOL_ADDRESS_PROVIDER_POLYGON;

  console.log("🔌 Connected to:", dataProviderAddress);

  const uiPoolDataProvider = new UiPoolDataProvider({
    uiPoolDataProviderAddress: dataProviderAddress,
    provider,
    chainId: 137, // Polygon Mainnet
  });

  try {
    const { reservesData, baseCurrencyData } = await uiPoolDataProvider.getReservesHumanized({
      lendingPoolAddressProvider: poolAddressProvider,
    });

    if (!reservesData || reservesData.length === 0) {
      console.log("⚠️ No reserves returned. Check provider or pool address.");
      return;
    }

    console.log(`✅ Found ${reservesData.length} reserves\n`);

    // Show the top 3 to verify it's working
    reservesData.slice(0, 3).forEach((res, i) => {
      console.log(
        `• ${i + 1}: ${res.symbol} (${res.underlyingAsset})\n  Available Liquidity: ${res.availableLiquidity}\n  Borrowable: ${res.borrowingEnabled}`
      );
    });

    console.log(`\n📊 Market Ref Currency (USD): ${baseCurrencyData.marketReferenceCurrencyPriceInUsd}`);
  } catch (err) {
    console.error("❌ Aave data fetch failed:", err);
  }
}

main();

