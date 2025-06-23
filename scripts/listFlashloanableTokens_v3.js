// scripts/listFlashloanableTokens_v3.js
require("dotenv").config();
const hre = require("hardhat");
const { ethers } = hre;

// 🌐 Determine network (default to Polygon)
const network = process.env.NETWORK || "polygon";

const providerAddress =
  network === "polygon"
    ? process.env.POOL_ADDRESS_PROVIDER_POLYGON
    : process.env.POOL_ADDRESS_PROVIDER_ARBITRUM;

const AAVE_ORACLE =
  network === "polygon"
    ? process.env.AAVE_ORACLE_POLYGON
    : process.env.AAVE_ORACLE_ARBITRUM;

if (!providerAddress || !AAVE_ORACLE) {
  console.error(`❌ Missing .env config for network: ${network}`);
  process.exit(1);
}

console.log("🔍 Using POOL_ADDRESS_PROVIDER:", providerAddress);
console.log("🔍 Using AAVE_ORACLE:", AAVE_ORACLE);

const IPoolAddressesProvider_ABI = [
  "function getPool() external view returns (address)"
];

const IPool_ABI = [
  "function getReservesList() external view returns (address[])"
];

const IAaveOracle_ABI = [
  "function getAssetPrice(address asset) external view returns (uint256)"
];

const IERC20Metadata_ABI = [
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)"
];

async function main() {
  const provider = await ethers.getContractAt(IPoolAddressesProvider_ABI, providerAddress);
  const POOL_ADDRESS = await provider.getPool();

  const pool = await ethers.getContractAt(IPool_ABI, POOL_ADDRESS);
  const oracle = await ethers.getContractAt(IAaveOracle_ABI, AAVE_ORACLE);

  const tokens = await pool.getReservesList();

  console.log(`\n📋 Found ${tokens.length} reserve tokens on ${network.toUpperCase()}:\n`);

  for (const address of tokens) {
    try {
      const token = await ethers.getContractAt(IERC20Metadata_ABI, address);
      const symbol = await token.symbol();
      const decimals = await token.decimals();

      const priceInUSD = await oracle.getAssetPrice(address);
      const formattedPrice = Number(priceInUSD.toString()) / 1e8;

      if (formattedPrice > 0.95) {
        console.log(`✅ ${symbol} | ${address} | ~$${formattedPrice.toFixed(2)} USD`);
      } else {
        console.log(`⚠️  ${symbol} | ~$${formattedPrice.toFixed(2)} USD (low price, might not be liquid)`);
      }
    } catch (err) {
      console.error(`❌ Error with token ${address}:`, err.message);
    }
  }
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});

