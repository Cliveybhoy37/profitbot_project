const hre = require("hardhat");
const { ethers } = hre;

// ✅ Aave V3 ProtocolDataProvider on Polygon
const DATA_PROVIDER = "0x9441b65ee553f70df9c77d45d8062d9d4b2c2c2c"; // lowercase = no checksum enforcement

// ✅ Inline ABI (only the functions we use)
const IAaveProtocolDataProvider_ABI = [
  "function getAllReservesTokens() view returns (tuple(string symbol, address tokenAddress)[])",
  "function getReserveData(address asset) view returns (uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint40)"
];

async function main() {
  const provider = await ethers.getContractAt(IAaveProtocolDataProvider_ABI, DATA_PROVIDER);

  const tokens = await provider.getAllReservesTokens();
  console.log(`\n📋 Found ${tokens.length} tokens on Aave V3 Polygon:\n`);

  for (const { symbol, tokenAddress } of tokens) {
    try {
      const data = await provider.getReserveData(tokenAddress);
      const availableLiquidity = ethers.formatUnits(data[0], 18); // Assume 18 decimals for simplicity

      if (parseFloat(availableLiquidity) > 10000) {
        console.log(`✅ ${symbol} | ${tokenAddress} | Liquidity: ${availableLiquidity}`);
      } else {
        console.log(`⚠️  ${symbol} | Low liquidity: ${availableLiquidity}`);
      }
    } catch (err) {
      console.error(`❌ Error with ${symbol}:`, err.message);
    }
  }
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});

