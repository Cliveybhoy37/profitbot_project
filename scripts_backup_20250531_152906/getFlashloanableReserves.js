// scripts/getFlashloanableReserves.js
require("dotenv").config();
const hre = require("hardhat");
const { ethers } = hre;

const network = process.env.NETWORK || "polygon";

// ✅ Dynamic PoolAddressesProvider & Oracle from .env
const providerAddress =
  network === "polygon"
    ? process.env.POOL_ADDRESS_PROVIDER_POLYGON
    : process.env.POOL_ADDRESS_PROVIDER_ARBITRUM;

const oracleAddress =
  network === "polygon"
    ? process.env.AAVE_ORACLE_POLYGON
    : process.env.AAVE_ORACLE_ARBITRUM;

if (!providerAddress || !oracleAddress) {
  console.error("❌ Missing required environment variables for network:", network);
  process.exit(1);
}

const IPoolAddressesProvider_ABI = [
  "function getPool() external view returns (address)"
];

const IPool_ABI = [
  "function getReservesList() external view returns (address[])",
  "function getReserveData(address asset) external view returns (uint256 configuration, uint128 liquidityIndex, uint128 currentLiquidityRate, uint128 variableBorrowIndex, uint128 currentVariableBorrowRate, uint128 currentStableBorrowRate, uint40 lastUpdateTimestamp, address aTokenAddress, address stableDebtTokenAddress, address variableDebtTokenAddress, address interestRateStrategyAddress, uint128 accruedToTreasury, uint128 unbacked, uint128 isolationModeTotalDebt, uint256 availableLiquidity)"
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
  const oracle = await ethers.getContractAt(IAaveOracle_ABI, oracleAddress);

  const reserves = await pool.getReservesList();

  console.log(`\n📊 Checking flashloanable liquidity for ${reserves.length} tokens on ${network.toUpperCase()}:\n`);

  for (const address of reserves) {
    try {
      const token = await ethers.getContractAt(IERC20Metadata_ABI, address);
      const symbol = await token.symbol();
      const decimals = await token.decimals();

      const reserveData = await pool.getReserveData(address);
      const available = parseFloat(ethers.formatUnits(reserveData.availableLiquidity || reserveData[0], decimals));

      const price = await oracle.getAssetPrice(address);
      const priceUSD = parseFloat(price.toString()) / 1e8;

      const totalUSD = available * priceUSD;

      if (totalUSD >= 1000) {
        console.log(`✅ ${symbol.padEnd(6)} | ${available.toFixed(2)} available | ~$${totalUSD.toFixed(2)}`);
      } else {
        console.log(`⚠️  ${symbol.padEnd(6)} | ${available.toFixed(2)} available | ~$${totalUSD.toFixed(2)} (Too low)`);
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

